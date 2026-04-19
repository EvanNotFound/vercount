## 1. One-shot migration initialization

- [x] 1.1 Add shared local-first initialization helpers in `app/src/utils/counter.ts` for site PV, page PV, and site UV that stop after the first migration attempt.
- [x] 1.2 Persist the resolved local counter value for each missing PV or UV counter, using `0` when import fails, so later requests stay Redis-only.

## 2. Busuanzi hot-path cleanup

- [x] 2.1 Simplify `app/src/utils/busuanzi.ts` so Busuanzi migration uses a single short-lived request with no retry loop.
- [x] 2.2 Remove multi-request page PV fallback behavior and use one canonical page import request during migration.

## 3. Public counter integration

- [x] 3.1 Update the public PV and UV read/write helpers to use the new one-shot initialization flow without repeated Busuanzi fallback.
- [x] 3.2 Verify `/api/v1/log` and `/api/v2/log` keep returning the same counter fields while avoiding repeated Busuanzi dependency after first touch.
