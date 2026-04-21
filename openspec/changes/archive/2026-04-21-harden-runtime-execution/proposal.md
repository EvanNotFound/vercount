## Why

The Go public counter service currently ties accepted POST write work to the client request context, so browser aborts, page unloads, and client-side timeouts can cancel legitimate counter updates after the request has already reached the service. That undercounts real traffic and makes routine disconnects look like server-side write failures just as the Go API has become the long-term public events edge.

## What Changes

- Persist accepted public counter write requests even if the originating HTTP client disconnects before the response is returned.
- Keep public counter reads request-scoped so abandoned read requests do not continue unnecessary work after the client goes away.
- Normalize tracked URLs more consistently at the Go API boundary and align downstream counter-key sanitization with the accepted normalized host/path identity.
- Separate transport-abort observability from counter-write outcome observability so logs can distinguish client disconnects, detached write success, and detached write failure.
- Preserve the existing public routes, route-specific response shapes, Redis key model, and rate-limit behavior for accepted requests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-counter-service`: Change the public write contract so accepted POST counter writes continue on a bounded detached runtime even after the client aborts, while keeping read behavior and response compatibility intact.
- `go-api-structured-logging`: Extend request and counter log requirements so the Go API records transport aborts separately from detached write outcomes and includes clearer normalized target context for diagnosis.

## Impact

- Affected code: `apps/api/internal/api/log.go`, `apps/api/internal/app/server.go`, and `apps/api/internal/counter/*.go`.
- Affected runtime: accepted public counter writes in the Go API continue on a bounded detached context instead of being canceled by client disconnects.
- Affected observability: request lifecycle and counter logs distinguish client-aborted HTTP transport from actual counter persistence outcomes.
