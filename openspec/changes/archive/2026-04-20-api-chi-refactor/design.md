## Context

The Go API under `apps/api` currently serves the public `events.vercount.one` surface from a very small codebase, but most of the HTTP behavior lives in `internal/app/server.go`. That file currently mixes route registration, method dispatch, CORS handling, rate limiting, request decoding, response shaping, and counter orchestration. The service is about to gain a root endpoint and a Redis-backed readiness endpoint, which will make the current all-in-one HTTP layout harder to extend cleanly.

The repository already treats this Go service as a focused public edge service rather than the main product backend. The desired outcome is a more conventional and readable Go API structure without introducing an overly layered architecture. The user explicitly prefers a small feature-oriented split such as `internal/app` for runtime/server wiring, `internal/api` for HTTP surfaces, and `internal/counter` for counter behavior. They also want to avoid extra abstraction files such as `api/response.go` unless they are clearly necessary.

Constraints:
- Existing `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` behavior must remain compatible.
- `/healthz` should act as a readiness probe and reflect Redis availability.
- `/` should return a small JSON response rather than HTML or plain text.
- The refactor should improve route readability and file discoverability without exploding the number of files.

## Goals / Non-Goals

**Goals:**
- Add `GET /` with a small JSON description of the public API service.
- Add `GET /healthz` as a readiness endpoint that checks Redis connectivity.
- Replace the current ad hoc route/method switching with a `chi` route tree and method-specific handlers.
- Reorganize the Go API into a small feature-oriented structure that makes public endpoints and log endpoints easy to find.
- Keep route-specific helper behavior close to the routes that use it instead of creating generic infrastructure files prematurely.

**Non-Goals:**
- Changing the existing counter semantics, Redis key contract, or v1/v2 response formats.
- Introducing a larger controller/service/repository architecture for the Go API.
- Adding authentication, admin endpoints, or broader observability features beyond `/healthz`.
- Changing the workspace layout or the API container workflow.

## Decisions

### 1. Use `chi` to express the HTTP surface
The Go API will adopt `chi` as its router so the route tree can be expressed directly with method-based handlers and grouped versioned routes.

- **Why:** The current `http.NewServeMux()` setup works functionally, but the code becomes noisy because route declarations, method switching, and cross-cutting concerns are interleaved inside large handlers. `chi` gives the service a cleaner top-level route shape without forcing a large framework.
- **Alternative considered:** stay on the Go standard library router and refactor handlers only. Rejected because it would still leave route grouping and method registration less legible for the small-service shape the user wants.

### 2. Reorganize by API surface, not by generic web layers
The refactor will keep a compact structure centered on three areas:

- `internal/app`: runtime/bootstrap helpers and server wiring
- `internal/api`: public HTTP endpoints (`/`, `/healthz`, `/js`, and log routes)
- `internal/counter`: existing counter behavior

Within `internal/api`, the code will be split into `public.go` and `log.go` instead of abstract files such as `routes.go`, `handlers.go`, `middleware.go`, or `response.go`.

- **Why:** The service is small enough that grouping by real responsibilities is easier to navigate than grouping by framework concepts. This keeps the number of files low while still making the HTTP surface obvious.
- **Alternative considered:** separate files for routes, middleware, handlers, and response helpers. Rejected because it creates a more abstract shape than this service needs and makes the code feel scattered.

### 3. Keep log-specific helpers close to the log API
The refactor will keep v1/v2 response shaping, request decoding, URL validation, and log-route rate-limiting behavior inside `internal/api/log.go` unless a broader reuse case appears.

- **Why:** Those behaviors are tightly tied to the log endpoints. Moving them into generic helper files now would add indirection without improving clarity.
- **Alternative considered:** preserve standalone helper files such as `response.go`, `url.go`, and `rate_limit.go` under a shared app package. Rejected because the user explicitly wants a tighter, more feature-oriented shape.

### 4. Make `/healthz` a readiness probe backed by Redis reachability
`GET /healthz` will perform a lightweight Redis health check and return a machine-readable JSON result that clearly distinguishes ready and not-ready states.

- **Why:** The service cannot serve its core counter behavior correctly when Redis is unavailable, so a readiness probe should reflect dependency health rather than only process liveness.
- **Alternative considered:** make `/healthz` a liveness-only endpoint that always reports process health. Rejected because it would hide the service's most important dependency failure from deployment tooling.

### 5. Keep the root endpoint informational and minimal
`GET /` will return a small JSON body describing the service and listing the public routes exposed by the API.

- **Why:** This gives operators and developers a quick human- and machine-readable entrypoint without turning the root route into docs or duplicating health behavior.
- **Alternative considered:** plain-text root response. Rejected because the user prefers a small JSON response and it aligns better with the rest of the service.

## Risks / Trade-offs

- **Adding `chi` increases dependency surface slightly** → Keep it as the only new HTTP dependency and avoid pulling in broader middleware stacks.
- **Moving helper logic into `log.go` can create a large file again if unchecked** → Keep `log.go` focused on the log API only and move only genuinely shared runtime/server wiring into `internal/app`.
- **Redis-backed `/healthz` can fail during transient dependency blips** → Keep the check lightweight and return a clear not-ready response without mutating application state.
- **A structural refactor can accidentally alter public route behavior** → Preserve the existing route paths and response compatibility, then verify `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` behavior after the refactor.

## Migration Plan

1. Add `chi` to the Go API module.
2. Move runtime/bootstrap helpers into `internal/app` and turn `server.go` into the composition root for router assembly.
3. Create `internal/api/public.go` for `/`, `/healthz`, and `/js`.
4. Create `internal/api/log.go` for v1/v2 log routes and their local helper behavior.
5. Re-register existing public log routes under the new router while preserving compatibility.
6. Verify the new root and health endpoints, then confirm the existing public counter routes still behave the same.

Rollback:
- Remove the new root and health endpoints, revert to the previous `net/http` route wiring, and restore the former file layout if the refactor introduces unacceptable compatibility risk.

## Open Questions

None.
