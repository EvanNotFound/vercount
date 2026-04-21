## 1. Public API surface cleanup

- [x] 1.1 Keep `/log`, `/api/v1/log`, and `/api/v2/log` in the Go router, root metadata response, and public API documentation while removing avoidable duplication around those routes.
- [x] 1.2 Collapse the public counter handlers in `apps/api/internal/api/log.go` around one shared `GET` flow and one shared `POST` flow while preserving the established v1/v2 response-shape differences and keeping `/bench/write` on the same write path.

## 2. Target and counter flow simplification

- [x] 2.1 Refactor target parsing so accepted requests normalize host/path once in the API layer and the counter package consumes that canonical target without redundant re-sanitizing or sentinel fallback values.
- [x] 2.2 Replace the generic callback-style counter initialization and awkwardly named write helpers in `apps/api/internal/counter/*.go` with shorter direct flows that preserve the existing Redis key contract and Busuanzi bootstrap behavior.

## 3. Shared helper and runtime cleanup

- [x] 3.1 Consolidate duplicated route/log helper seams in `apps/api/internal/app` and `apps/api/internal/api`, and simplify local naming so the request flow reads as short direct Go code.
- [x] 3.2 Tighten the public CORS headers and make the rate-limit degradation policy explicit in one place instead of relying on scattered silent fallback branches.

## 4. Verification

- [x] 4.1 Update the Go API tests to cover the preserved `/log`, `/api/v1/log`, and `/api/v2/log` contracts, their route-specific response shapes, and the simplified route metadata output.
- [x] 4.2 Add or update tests for the simplified target normalization and counter initialization flow, including detached writes and the preserved Busuanzi bootstrap path.
- [x] 4.3 Run the relevant Go API test suite and fix any regressions introduced by the cleanup.
