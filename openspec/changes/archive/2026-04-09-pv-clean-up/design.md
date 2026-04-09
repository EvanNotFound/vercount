## Context

Vercount currently stores exact site PV and page PV in Redis. Site PV is a single numeric key per host, while page PV uses one numeric key per host/path pair. That storage shape is acceptable for exact counting, but some surrounding behavior makes the system harder to operate as the dataset grows.

Today, page listing in domain analytics uses `kv.keys("pv:page:<domain>:*")`, which does not scale well on a large Redis database. Read-only PV paths also refresh TTL, so viewing a counter keeps old PV records alive even when no new traffic occurs. In addition, read-only PV fetches lazily seed Redis from Busuanzi when a key is missing, so fetching counts can create new Redis keys.

This change cleans up those behaviors without changing public PV semantics. Site PV and page PV should stay exact, public API response fields should remain the same, and manual dashboard edits should keep working.

## Goals / Non-Goals

**Goals:**

- Keep site PV and page PV exact.
- Keep public counter response fields and write behavior unchanged.
- Stop mutating PV retention or creating PV records during read-only fetches.
- Replace Redis `KEYS` usage for page discovery with a safer domain-scoped inventory model.
- Preserve discoverability of existing stored page PV records in domain analytics.

**Non-Goals:**

- Changing UV behavior.
- Changing whether every page can be counted.
- Replacing exact per-page PV storage with an approximate or aggregated model.
- Removing Busuanzi as the source for first-write PV initialization.

## Decisions

### 1. Track known pages with a per-domain page inventory set

Introduce a Redis set per domain that stores sanitized page paths that already have local PV records.

- **Why:** The analytics dashboard needs a domain-scoped way to list known page records without pattern-matching the whole Redis keyspace.
- **Alternative considered:** keep using `KEYS`. Rejected because it scales poorly as the total keyspace grows.
- **Alternative considered:** move page PV into a single hash per domain. Rejected because it changes the storage shape more than this cleanup requires and should be considered separately if key count remains a problem.

### 2. Update the page inventory only on write paths

Any path that creates or updates a stored page PV value should also add that page path to the domain page inventory and refresh retention for the page record and the inventory set.

- **Why:** Page discoverability should follow actual tracked writes and manual edits, not reads.
- **Alternative considered:** update the inventory on reads too. Rejected because read-only paths should stop mutating Redis state.

### 3. Make PV reads read-only

Read-only PV fetches should return the current site/page PV value without extending TTL or persisting missing keys.

- **Why:** Viewing analytics should not keep old PV data alive or enlarge Redis.
- **Alternative considered:** keep refreshing TTL on reads. Rejected because it makes retention depend on reads instead of traffic.

### 4. Keep Busuanzi fallback for visible counts, but do not persist it on reads

If a read-only PV fetch does not find a local PV record, it may still fetch a fallback value from Busuanzi to preserve the visible count, but it should return that value without writing a Redis key.

- **Why:** This preserves current public-facing counter behavior while removing Redis mutation from read paths.
- **Alternative considered:** return zero on missing reads. Rejected because it changes visible behavior for hosts or pages that have Busuanzi data but no local write yet.

### 5. Backfill the page inventory from legacy page keys when needed

If domain analytics needs to list page PV records for a domain whose inventory set has not been created yet, it should rebuild the inventory from existing page PV keys using a safer scan-based pass, then use the inventory going forward.

- **Why:** Existing stored page PV records should remain visible after rollout without requiring a separate migration job.
- **Alternative considered:** require a one-time migration before deployment. Rejected because lazy backfill keeps rollout simpler.

## Risks / Trade-offs

- **Inventory set can become stale if a write path forgets to update it** → Centralize inventory updates in the PV write helpers and dashboard page-write flows.
- **Lazy inventory backfill can still be expensive on first large-domain access** → Use scan-style iteration instead of `KEYS`, and only backfill when the inventory is missing.
- **Read-only fallback to Busuanzi may still add request latency on cold reads** → Acceptable because it preserves current visible behavior and no longer mutates Redis.
- **Retention changes may let inactive PV records expire sooner than before** → Intended; retention should now reflect traffic and manual writes instead of reads.

## Migration Plan

1. Add a per-domain page inventory set and update all PV write paths to maintain it.
2. Change PV read helpers so they stop refreshing TTL and stop persisting fallback data.
3. Update domain analytics to read page listings from the inventory set and lazily backfill it from legacy page PV keys when needed.
4. Keep existing `pv:site:*` and `pv:page:*` keys as the source of truth for exact PV counts.

Rollback:

- Restore `KEYS`-based page discovery.
- Restore read-path TTL refresh and read-path persistence if needed.
- Ignore the page inventory set if rollback is required; the original page PV keys remain intact.

## Open Questions

None.
