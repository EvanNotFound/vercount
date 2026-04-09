## 1. Page inventory and write-path updates

- [x] 1.1 Add a domain-scoped page inventory helper for stored page PV records.
- [x] 1.2 Update page PV write paths in `src/utils/counter.ts` to keep the page inventory in sync.
- [x] 1.3 Update manual page PV write paths in `src/lib/domain-service.ts` and `/api/domains/analytics/route.ts` to keep the page inventory in sync.

## 2. Read-only PV cleanup

- [x] 2.1 Change site PV and page PV read helpers so they no longer refresh TTL on read.
- [x] 2.2 Change read-only PV fallback logic so missing PV records can return Busuanzi values without persisting new Redis keys.
- [x] 2.3 Keep public PV write behavior unchanged after the read-path cleanup.

## 3. Analytics page discovery cleanup

- [x] 3.1 Replace `KEYS`-based page discovery in domain analytics with the domain-scoped page inventory.
- [x] 3.2 Add lazy backfill of the page inventory for domains that already have stored page PV keys from before this cleanup.
- [x] 3.3 Keep analytics page listings and manual page edits working with the new inventory flow.

## 4. Docs and verification

- [x] 4.1 Update docs or inline comments that describe PV storage and read behavior where needed.
- [x] 4.2 Verify that read-only PV fetches do not create or extend stored PV records while public writes still return exact `site_pv` and `page_pv` values.
- [x] 4.3 Run `pnpm lint` and fix any issues caused by this cleanup.
