## 1. Remove legacy Redis UV fallback from shared runtime helpers

- [x] 1.1 Update `apps/api/internal/counter/service.go` so missing `uv:site:count:*` keys no longer initialize from `uv:site:*` or `uv:baseline:*`.
- [x] 1.2 Update `apps/web/src/utils/counter.ts` so missing `uv:site:count:*` keys no longer initialize from legacy Redis UV keys.

## 2. Keep existing UV contracts aligned with the new initialization rule

- [x] 2.1 Confirm Go public counter paths still use the same numeric UV key, TTL behavior, and response fields after the fallback removal.
- [x] 2.2 Confirm Next.js compat routes and dashboard analytics reads/writes continue using the shared numeric UV helpers without route contract changes.

## 3. Clean up surrounding verification and documentation

- [x] 3.1 Update comments or terminology that still describe baseline-backed or adjustment-driven site UV behavior.
- [x] 3.2 Add or update focused verification so legacy Redis UV keys no longer influence missing-key initialization while Busuanzi-or-zero fallback still does.
