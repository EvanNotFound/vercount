## 1. Logging foundation

- [x] 1.1 Replace the custom Go API logger bootstrap in `apps/api/internal/app/runtime.go` with an `slog`-based logger that selects readable local output and JSON production output.
- [x] 1.2 Update the Go API logging seams (`internal/app`, `internal/api`, and `internal/counter`) to use the new structured logging contract with stable event and field naming.

## 2. HTTP request observability

- [x] 2.1 Add request correlation and request completion logging to the chi router so handled requests record method, matched route, status, duration, and request ID.
- [x] 2.2 Update public endpoint, log endpoint, and rate-limit call sites to emit consistent structured request, warning, and error events.

## 3. Operational event coverage and verification

- [x] 3.1 Update counter, Busuanzi, readiness, and script-serving logs to use the standardized structured event names and normalized error context.
- [x] 3.2 Add or update Go API tests to verify the new logging behavior at the request/middleware level and confirm existing public route behavior remains compatible.
