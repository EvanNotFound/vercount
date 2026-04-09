## Why

Page PV still has some Redis behavior that gets harder to operate as the dataset grows. Right now dashboard analytics lists page keys with `KEYS`, PV reads refresh TTL, and some read-only PV paths can create Redis keys through lazy Busuanzi initialization.

## What Changes

- Keep site PV and page PV exact, and keep the existing public counter response fields unchanged.
- Change page discovery for dashboard analytics to use a safer per-domain inventory instead of pattern-matching the whole Redis keyspace.
- Stop refreshing PV retention on read-only paths.
- Stop persisting new PV keys from read-only fetch paths where possible while keeping first-write initialization behavior intact.
- Keep manual dashboard edits and imported PV values working after the storage cleanup.

## Capabilities

### New Capabilities

- `page-view-counting`: Defines exact PV counting, read-only PV retrieval behavior, and page discoverability for domain analytics.

### Modified Capabilities

None.

## Impact

- Affected code: `src/utils/counter.ts`, `src/utils/busuanzi.ts`, `src/lib/domain-service.ts`, `src/app/api/v1/log/route.ts`, `src/app/api/v2/log/route.ts`, and `src/app/api/domains/analytics/route.ts`.
- Affected storage: page PV data remains in Redis, but page discovery and retention behavior will change.
- Affected behavior: public PV counts remain exact, while read-only PV requests stop mutating Redis state and dashboard page listing becomes more predictable on large datasets.
