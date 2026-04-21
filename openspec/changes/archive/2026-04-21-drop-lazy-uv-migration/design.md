## Context

The repository now has two runtime paths that can serve public or analytics-adjacent UV behavior: the Go public events service in `apps/api/internal/counter/service.go` and the Next.js shared counter helpers in `apps/web/src/utils/counter.ts`. Both paths still contain the same lazy migration behavior for site UV: if `uv:site:count:<host>` is missing, they first read legacy Redis UV storage (`uv:site:<host>` set cardinality plus `uv:baseline:<host>`), and only fall back to Busuanzi when that legacy Redis data is unavailable.

The legacy Redis UV data has already been migrated operationally into `uv:site:count:*`, so leaving the lazy Redis migration path in place now adds unnecessary branching, legacy key knowledge, and cross-runtime drift risk. At the same time, the current best-effort Busuanzi initialization path is still part of the desired behavior for hosts that genuinely have no numeric UV key yet, so this change needs to remove only the legacy Redis branch without changing public response contracts, manual analytics edits, or numeric UV TTL behavior.

## Goals / Non-Goals

**Goals:**
- Remove runtime reads of `uv:site:*` and `uv:baseline:*` from both the Go and Next.js UV initialization paths.
- Keep `uv:site:count:*` as the sole Redis source of truth for site UV totals.
- Preserve the existing Busuanzi one-shot initialization path for genuinely missing numeric UV keys.
- Keep public `/log`, `/api/v1/log`, `/api/v2/log`, and dashboard analytics UV behavior and response shapes unchanged.
- Update nearby comments and verification coverage so the codebase no longer describes baseline-backed UV behavior.

**Non-Goals:**
- Removing Busuanzi UV initialization.
- Renaming Redis keys, changing UV TTLs, or redesigning the cookie-based UV dedupe contract.
- Introducing a new migration job or another storage backfill step.

## Decisions

### 1. Remove legacy Redis UV fallback only from the shared initialization helpers

The change will be made in the two functions that currently own missing-key UV initialization:
- `initializeSiteUV` in `apps/api/internal/counter/service.go`
- `initializeSiteUVCount` in `apps/web/src/utils/counter.ts`

Each helper will continue to:
1. return the existing numeric value when `uv:site:count:*` already exists
2. otherwise initialize from the current Busuanzi UV fetch path
3. persist the resolved numeric UV value back into `uv:site:count:*`

They will stop consulting `uv:site:*` and `uv:baseline:*` entirely.

- **Why:** This keeps the change localized to the code that actually owns UV initialization while preserving existing callers and response handling.
- **Alternative considered:** change every caller independently. Rejected because it duplicates logic and increases the chance that Go and Next.js diverge again.

### 2. Keep all public and analytics callers unchanged

Public log handlers and dashboard/domain flows will continue to call the same helpers they do today:
- Go: `FetchSiteUV` and `RecordSiteUV`
- Next.js: `fetchSiteUVHistory`, `recordSiteUV`, and `updateTotalUV`

No route-level response contract changes are needed.

- **Why:** The desired change is about UV initialization source, not route payloads or auth flows.
- **Alternative considered:** refactor route handlers at the same time. Rejected because it would broaden scope without adding value to this cleanup.

### 3. Preserve Busuanzi as the only remaining missing-key UV initializer

If a host is missing `uv:site:count:*`, both runtimes will still use the existing short-lived Busuanzi path to seed the numeric UV counter, falling back to zero when Busuanzi does not provide data.

- **Why:** This matches the requested scope and avoids coupling this cleanup to a separate product decision about removing all UV fallback behavior.
- **Alternative considered:** remove all UV fallback now and initialize missing numeric UV counters to zero only. Rejected because the requested scope explicitly keeps the Busuanzi path.

### 4. Update comments and focused verification to match the new storage model

Comments that still describe “baseline” or “adjustment” semantics around site UV will be updated to describe direct numeric UV storage. Targeted verification will cover the new rule that legacy Redis UV keys no longer influence initialization.

- **Why:** Without this cleanup, the code and docs would continue to imply behavior that the system no longer supports.
- **Alternative considered:** rely on the implementation change alone. Rejected because the misleading terminology would remain easy to cargo-cult into future work.

## Risks / Trade-offs

- **A host may still be missing `uv:site:count:*` even after the operational migration** → Those hosts will no longer inherit counts from `uv:site:*` or `uv:baseline:*`; mitigation is to treat the prior one-off migration as the authoritative backfill and keep Busuanzi/zero initialization for truly missing numeric keys.
- **Go and Next.js could drift if only one runtime path is updated** → Mitigation is to change both shared UV initialization helpers in the same change and keep route-level callers untouched.
- **Existing comments or tests may still encode baseline-backed assumptions** → Mitigation is to update nearby comments and add focused verification for the missing-key initialization rule.

## Migration Plan

1. Remove the legacy Redis UV resolver from `apps/api/internal/counter/service.go` and simplify `initializeSiteUV` to numeric-key-or-Busuanzi behavior only.
2. Remove the equivalent legacy Redis UV resolver from `apps/web/src/utils/counter.ts` and simplify `initializeSiteUVCount` the same way.
3. Update comments or terminology that still imply baseline/adjustment-driven UV behavior.
4. Add or update targeted verification so missing numeric UV counters no longer initialize from legacy Redis UV keys.
5. Deploy normally; no additional data migration is required because `uv:site:count:*` is already the authoritative UV store.

Rollback:
- Restore the deleted legacy Redis UV fallback helpers in both runtimes if a production issue reveals that important hosts were missed during the operational migration.

## Open Questions

None.
