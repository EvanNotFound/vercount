## Why

The Go public API in `apps/api` is small, but it now carries more fallback layers, helper indirection, and awkward internal naming than the core counter behavior really needs. The service should keep its existing public compatibility routes, but the implementation underneath them can be made much simpler so the code reads more like direct human-written Go instead of a small abstraction system.

## What Changes

- Keep `/log`, `/api/v1/log`, and `/api/v2/log` available and preserve their established response-shape differences.
- Update the public counter spec so the compatibility routes stay intact while the public CORS behavior is tightened around a clean credentialless embed flow.
- Simplify the Go API request and counter flow by reducing duplicate validation/sanitization, flattening small generic helper layers, and replacing awkward helper names with shorter, more direct names.
- Clean up logging and shared helper seams in `apps/api` so duplicated interfaces and route/log helper logic stop spreading across packages.
- Tighten the remaining public runtime details such as CORS headers and Redis/rate-limit edge handling where the current code is more permissive or fallback-heavy than necessary.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `public-counter-service`: keep the compatibility routes intact while tightening the public cross-origin/runtime behavior and preserving the established route-specific counter responses during the internal cleanup.

## Impact

- Affected code: `apps/api/main.go`, `apps/api/internal/app/*.go`, `apps/api/internal/api/*.go`, `apps/api/internal/counter/*.go`, and the Go API test files.
- Affected specs: `openspec/specs/public-counter-service/spec.md`.
- Affected public API: `/log`, `/api/v1/log`, and `/api/v2/log` remain available with their established compatibility behavior.
- Affected runtime behavior: the service keeps the existing Busuanzi bootstrap path and public counter semantics, but removes internal fallback and abstraction layers that no longer help readability or correctness.
