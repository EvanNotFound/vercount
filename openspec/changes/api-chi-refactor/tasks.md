## 1. Reshape the Go API server around chi

- [x] 1.1 Add `chi` to `apps/api/go.mod` and update the API server wiring to build a chi router instead of the current `http.NewServeMux()` route table.
- [x] 1.2 Refactor `internal/app/server.go` into the composition root that assembles dependencies and registers the public route tree with method-specific handlers.
- [x] 1.3 Consolidate runtime/bootstrap helpers under `internal/app` so `main.go` stays focused on startup and server launch.

## 2. Reorganize the HTTP code by API surface

- [x] 2.1 Add `internal/api/public.go` for the non-versioned public endpoints and move the existing `/js` script-serving behavior there.
- [x] 2.2 Add `internal/api/log.go` for `/log`, `/api/v1/log`, and `/api/v2/log`, keeping v1/v2 response handling and request validation close to those routes.
- [x] 2.3 Remove or fold the current generic HTTP helper files into the new feature-oriented layout without changing existing public counter behavior.

## 3. Add the new public service endpoints

- [x] 3.1 Implement `GET /` as a small JSON endpoint that identifies the public Go API service and lists its public routes.
- [x] 3.2 Implement `GET /healthz` as a Redis-backed readiness endpoint with machine-readable ready/not-ready responses.
- [x] 3.3 Preserve the existing `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` compatibility contracts while the new endpoints are added.

## 4. Verify compatibility and developer clarity

- [x] 4.1 Verify the refactored API still serves `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` with the established route behavior and response formats.
- [x] 4.2 Verify the new `/` and `/healthz` endpoints return the intended JSON responses, including Redis failure behavior for readiness.
- [x] 4.3 Update any API-local documentation that still describes the old route surface or file layout so the new structure is easy to understand.
