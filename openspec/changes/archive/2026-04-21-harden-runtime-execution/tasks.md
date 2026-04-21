## 1. Accepted write runtime handling

- [x] 1.1 Refactor the public POST handlers in `apps/api/internal/api/log.go` so request decoding, validation, and rate limiting stay request-scoped while accepted writes switch to a bounded detached context.
- [x] 1.2 Keep the public GET/read helpers request-scoped and ensure the POST handlers still return the existing v1 and v2 success payloads for connected clients.
- [x] 1.3 Update the counter write helper flow to make the detached write timeout policy explicit and preserve the existing Redis counter update semantics for accepted writes.

## 2. Target normalization and observability

- [x] 2.1 Normalize accepted tracked URL host/path context in `apps/api/internal/api/log.go` and align `apps/api/internal/counter/*.go` sanitization with the same effective counter identity.
- [x] 2.2 Update `apps/api/internal/app/server.go` request lifecycle logging so aborted transports are recorded separately from ordinary completed responses.
- [x] 2.3 Add distinct detached-write outcome logs in the Go API counter flow so client aborts, detached write success, and detached write failure can be diagnosed independently.

## 3. Verification

- [x] 3.1 Add or update Go API tests to verify accepted POST writes continue after client cancellation while GET/read requests remain request-scoped.
- [x] 3.2 Add or update tests for request/handler logging so transport aborts and detached write outcomes are logged as separate events with normalized target context.
- [x] 3.3 Run the relevant Go API test suite and fix any regressions introduced by the runtime and logging changes.
