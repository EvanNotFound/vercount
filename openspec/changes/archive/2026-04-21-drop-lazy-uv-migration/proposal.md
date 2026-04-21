## Why

The codebase still carries a lazy UV migration path that reads legacy Redis UV storage (`uv:site:*` sets and `uv:baseline:*` values) whenever a numeric UV key is missing. Now that the one-off Redis migration has been run, keeping that fallback in both the Go service and the Next.js compat layer adds unnecessary complexity and leaves old storage behavior active longer than intended.

## What Changes

- Remove the legacy Redis UV fallback from the Go counter service so missing `uv:site:count:*` keys no longer initialize from `uv:site:*` or `uv:baseline:*`.
- Remove the same legacy Redis UV fallback from the Next.js shared counter helpers used by the compat log routes and dashboard analytics reads.
- Keep the existing numeric UV key contract, public response shapes, dashboard manual UV edits, and one-shot Busuanzi UV initialization behavior unchanged.
- Update affected tests and comments so they describe direct numeric UV storage instead of legacy baseline-backed migration.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `site-visitor-counting`: missing numeric UV counters no longer consult legacy Redis UV keys during initialization and instead continue from the current numeric/Busuanzi flow only.

## Impact

- Affected code: `apps/api/internal/counter/service.go`, `apps/web/src/utils/counter.ts`, and nearby comments/tests that still describe legacy UV migration.
- Affected runtime surfaces: Go public `/log`, `/api/v1/log`, `/api/v2/log`, Next.js compat log routes, and dashboard analytics reads that depend on shared UV helpers.
- Storage impact: legacy `uv:site:*` and `uv:baseline:*` keys stop affecting runtime behavior; `uv:site:count:*` remains the authoritative Redis UV record.
