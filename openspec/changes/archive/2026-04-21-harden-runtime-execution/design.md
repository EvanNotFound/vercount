## Context

The Go public events service in `apps/api` now owns the long-term public counter surface for `/log`, `/api/v1/log`, and `/api/v2/log`. Today the POST handlers in `apps/api/internal/api/log.go` validate the request on the request context and then call `writeCounts(r.Context(), ...)`, which wraps that same request context in a five-second timeout before performing Redis-backed UV/PV updates and any first-touch Busuanzi-backed initialization.

That coupling means a browser timeout, page unload, reverse-proxy disconnect, or other client abort can cancel an already-accepted write after the service has validated the tracked URL and decided to process it. The browser client in `packages/core` already uses an `AbortController` with a five-second timeout, so a legitimate page-view write can be dropped purely because the transport outlives the client budget. At the same time, current logs report those cancellations as generic counter write failures, and the request completion log does not clearly distinguish an aborted transport from an internal persistence failure.

Constraints:
- Public routes, route-specific response envelopes, and Redis counter key families must remain compatible.
- Reads should remain request-scoped; only accepted public POST writes should survive transport aborts.
- The solution should fit the current small Go service without introducing a queue, worker process, or new runtime dependency.
- Detached writes must stay bounded so abandoned requests cannot create unbounded background work.

## Goals / Non-Goals

**Goals:**
- Persist accepted public POST counter writes even when the client disconnects before the response is sent.
- Keep connected clients behavior-compatible by returning the same v1 and v2 success payloads after a completed write.
- Keep public GET/read flows request-scoped so abandoned reads do not continue unnecessary work.
- Normalize accepted tracked URL host/path context consistently enough for downstream counter operations and diagnostic logs.
- Distinguish transport-abort logs from detached write outcome logs so operators can tell whether traffic was lost or merely disconnected.

**Non-Goals:**
- Introducing durable queues, exactly-once delivery, or retry orchestration for public counter writes.
- Changing the public route inventory, CORS policy, or route-specific response body shapes.
- Reworking the browser client transport model as part of this change.
- Changing manual analytics editing flows or the existing Redis key prefixes.

## Decisions

### 1. Detach only accepted POST writes from request cancellation
The service will continue to validate, decode, and rate-limit requests on `r.Context()`, but once a public POST write has been accepted it will switch the persistence work onto a bounded detached context derived from the request using Go's context detachment support.

- **Why:** This preserves normal request-time validation semantics while preventing legitimate page-view writes from being dropped just because the browser leaves or times out after the request has already reached the Go service.
- **Alternative considered:** keep write execution entirely request-scoped. Rejected because it preserves the current undercounting behavior for accepted writes.
- **Alternative considered:** hand writes off to a queue or fire-and-forget goroutine with no shared request values. Rejected because it adds operational complexity and looser lifecycle control than this service needs.

### 2. Keep the handler synchronous for connected clients
The POST handlers will still wait for the bounded detached write to complete and return the usual success response when the client is still connected; the detachment only changes what happens after transport abort.

- **Why:** This preserves current response behavior for normal traffic and avoids introducing a new async acceptance contract such as `202 Accepted`.
- **Alternative considered:** always acknowledge writes immediately and finish them later. Rejected because it would change the established API behavior and make error reporting less compatible.

### 3. Keep GET/read behavior request-scoped
Only the public POST write paths will use detached execution. GET handlers and other read-oriented flows will continue to use request-scoped contexts.

- **Why:** Reads do not represent an event that has already happened, so continuing them after disconnect wastes resources without improving counting accuracy.
- **Alternative considered:** detach all public counter work uniformly. Rejected because it would keep unnecessary read work alive after abandoned requests.

### 4. Separate transport outcome logging from persistence outcome logging
The router-level request log will identify aborted transport separately from ordinary completed responses, and the POST handlers will emit a distinct detached-write outcome event when a write completes or fails after the original transport is gone.

- **Why:** Operators need to tell the difference between "the client disconnected" and "the counter write failed". Today both collapse into noisy failure signals.
- **Alternative considered:** keep only the existing handler failure log and infer transport state indirectly. Rejected because it obscures whether the write truly failed or only the client disappeared.

### 5. Normalize accepted target identity at the API boundary and keep service sanitization aligned
The log handlers will produce one accepted host/path identity for downstream counter calls and logging, while `internal/counter` will retain a defensive sanitization layer that preserves the same effective normalization contract.

- **Why:** This avoids having raw logged input, parsed handler state, and Redis key state drift apart during debugging.
- **Alternative considered:** keep normalization only inside the counter service. Rejected because the handler logs would still be forced to reason about raw URL input instead of accepted counter identity.

## Risks / Trade-offs

- **Accepted writes can still be duplicated if a client retries after an uncertain disconnect** → Keep the current best-effort analytics model and avoid pretending the service now offers exactly-once semantics.
- **Detached writes increase background work after disconnect** → Bound detached writes with a short server-controlled timeout and keep the existing request admission controls before detachment.
- **Request and detached-write logging can become noisy or confusing** → Use separate stable event names for transport aborts and detached write outcomes, and include request correlation plus normalized target fields where available.
- **Normalization changes can accidentally merge distinct tracked targets** → Limit normalization to conservative canonicalization such as accepted host casing/default-port cleanup and preserve existing route and counter semantics otherwise.

## Migration Plan

1. Refactor the public POST write path in `apps/api/internal/api/log.go` so accepted writes run on a bounded detached context while reads stay request-scoped.
2. Update request lifecycle logging in `apps/api/internal/app/server.go` to classify transport aborts separately from standard response completion.
3. Align handler-level and counter-level target normalization and logging fields so raw input and normalized host/path context can be correlated.
4. Add tests covering detached write continuation, request-scoped reads, and transport-abort versus write-outcome logging.

Rollback:
- Revert the detached write context change and restore request-scoped POST writes if the new runtime behavior causes unacceptable load, correctness, or operational issues.

## Open Questions

None.
