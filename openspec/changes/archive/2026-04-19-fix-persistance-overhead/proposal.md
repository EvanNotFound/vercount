## Why

The public counter still treats Busuanzi as a live fallback in places where it should only be a one-time migration helper. That adds avoidable external latency and persistence overhead to hot request paths, especially when a host or page has not been initialized locally yet.

## What Changes

- Change PV and UV initialization so Busuanzi is only used as a best-effort migration source for missing local counters.
- Persist the first successful migration result into Redis and stop consulting Busuanzi once local counter data exists.
- Persist a local zero value when a one-time Busuanzi import fails so the counter becomes local-only instead of repeatedly retrying Busuanzi.
- Remove retry-heavy and multi-request Busuanzi behavior from public request handling so Busuanzi failures do not make the counter APIs slow.
- Keep the current public API response fields, exact PV write behavior, analytics editing flows, and host-based counter model intact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-view-counting`: Tighten fallback behavior so missing PV counters attempt a one-time migration import, persist a local result, and never depend on repeated Busuanzi calls during normal reads or writes.
- `site-visitor-counting`: Tighten UV initialization so missing numeric UV counters perform at most one best-effort Busuanzi migration import before the system continues with local Redis state only.

## Impact

- Affected code: `app/src/utils/counter.ts`, `app/src/utils/busuanzi.ts`, `app/src/app/api/v1/log/route.ts`, and `app/src/app/api/v2/log/route.ts`.
- Affected storage: missing counters will be initialized directly into the existing Redis counter keys with either an imported value or zero so later requests stay local.
- Affected runtime behavior: public counter requests stop treating Busuanzi as an important dependency after initial migration has been attempted.
