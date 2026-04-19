## Context

Vercount currently uses Busuanzi as a migration source for hosts and pages that do not yet have local Redis counters. That migration logic now sits on hot public request paths in `app/src/utils/counter.ts`, and parts of the flow still treat Busuanzi like a live fallback instead of a one-time import helper. The result is avoidable external calls, retries, and repeated initialization work on `/api/v1/log` and `/api/v2/log`.

The current code already has the right high-level storage model: Redis is the source of truth for PV and numeric UV, and Busuanzi only exists to help old counters migrate. This change should preserve that model, keep exact PV writes and current API response fields, and make public requests local-first after the first migration attempt.

Constraints:

- Public counter APIs must continue to return `site_pv`, `page_pv`, and `site_uv`.
- Existing Redis-backed PV and numeric UV values remain authoritative once present.
- Busuanzi migration must stay best-effort and must not make the public counter slow.
- Dashboard analytics edits and page discoverability behavior must keep working.

## Goals / Non-Goals

**Goals:**

- Ensure each missing PV or UV counter performs at most one Busuanzi migration attempt before the system continues with local Redis state only.
- Persist a local Redis value immediately after migration resolution so subsequent reads and writes stay local.
- Remove retry-heavy and multi-request Busuanzi behavior from public request handling.
- Keep counter write semantics, analytics editing flows, and host/path storage structure unchanged.

**Non-Goals:**

- Redesign the public counter API shape.
- Remove Busuanzi import support entirely.
- Change exact PV counting or client-side UV cookie dedupe semantics.
- Rework analytics page inventory behavior beyond what is needed to keep local persistence consistent.

## Decisions

### 1. Use the persisted Redis counter itself as the one-shot migration record

Each counter initializer will resolve one of two states:

1. local counter already exists → use Redis only
2. no local counter → try Busuanzi once, then persist the resolved local counter value and stay local

This keeps Busuanzi strictly limited to first-touch migration instead of ongoing fallback behavior.

- **Why:** The user wants Busuanzi to be a convenience for migration, not an important dependency. Persisting the real counter value immediately means the counter key itself records that migration has already been resolved.
- **Alternative considered:** keep querying Busuanzi on every missing read. Rejected because it preserves the latency and resource overhead that triggered this change.
- **Alternative considered:** add a separate migration-attempt marker. Rejected because it is redundant once the initializer always writes the actual counter key with either an imported value or zero.

### 2. Persist the resolved initial value immediately

When a migration attempt happens, the initializer will always persist a local result before returning:

- imported Busuanzi value on success
- `0` on failure or missing fallback data

- **Why:** This makes Redis authoritative immediately and removes repeated Busuanzi work from both read and write paths.
- **Alternative considered:** keep read paths non-persisting for missing records. Rejected because Busuanzi migration is explicitly one-time import behavior, not normal read behavior.

### 3. Remove retry-heavy Busuanzi behavior from request handling

Busuanzi fetch helpers will use a single short-lived request with no retry loop. Page PV migration will use one canonical request shape instead of multiple slash/no-slash requests.

- **Why:** Migration should be best-effort only. If Busuanzi is slow or unavailable, Vercount should quickly fall back to local zero initialization and continue.
- **Alternative considered:** keep retries but reduce the count. Rejected because any retry keeps external instability in the hot path longer than necessary.
- **Alternative considered:** preserve dual page requests for better import accuracy. Rejected because migration accuracy is less important than predictable request latency.

### 4. Keep public route behavior unchanged above the initializer layer

`/api/v1/log` and `/api/v2/log` will continue to call the same counter helpers and return the same fields. The main behavior change lives inside shared counter initialization and Busuanzi helper logic.

- **Why:** This keeps the API surface stable and minimizes blast radius.
- **Alternative considered:** move migration into separate route logic or background jobs first. Rejected for now because the current request-level initializer model can be made efficient without changing the API contract.

## Risks / Trade-offs

- **A failed first migration attempt now settles the local counter at zero** → Users can still edit counters manually in analytics, and future requests remain fast.
- **A single canonical page import may miss some legacy Busuanzi page counts that the previous dual request pattern found** → Acceptable because Busuanzi import is a migration convenience, not an accuracy guarantee.
- **Persisting zero on a read miss changes the previous “read-only miss stays unpersisted” behavior** → This is intentional only for migration resolution so the system can stop consulting Busuanzi forever after first touch.

## Migration Plan

1. Add shared one-shot migration helpers for site PV, page PV, and site UV initialization.
2. Update Busuanzi helpers to use one request with no retries and short timeout semantics.
3. Ensure read and write paths both use the same local-first initializer flow.
4. Deploy without storage backfill; counters migrate lazily on first touch.
5. If rollback is needed, restore the previous initializer and fallback behavior. Existing local counter values remain valid because Redis storage keys are unchanged.

## Open Questions

- None. The desired behavior is clear: one migration attempt, then Redis only.
