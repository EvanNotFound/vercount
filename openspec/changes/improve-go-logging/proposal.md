## Why

The Go API in `apps/api` now owns the public events surface, but its current logging is still a small custom formatter that mixes human-oriented prefixes with JSON fragments and logs request activity in a piecemeal way. This makes the service harder to operate locally and harder to ingest cleanly into Grafana/Loki just as the Go API has become the long-term public edge service.

## What Changes

- Replace the Go API's custom logger with a structured logging approach that is appropriate for production observability and direct stdout ingestion.
- Standardize the Go API on consistent log levels, field names, and event names across startup, request handling, rate limiting, public endpoints, and counter operations.
- Add request lifecycle logging for the Go API so operators can reliably see method, route, status, duration, and request correlation data.
- Keep local development logs readable while ensuring production logs remain machine-parseable for Grafana/Loki.
- Preserve the existing public API routes, response formats, and counter semantics while improving the internal logging behavior.

## Capabilities

### New Capabilities
- `go-api-structured-logging`: Define the structured logging behavior, request log coverage, and machine-readable production log format for the Go public events service.

### Modified Capabilities
<!-- None. This change adds an internal observability capability without changing existing public counter contracts. -->

## Impact

- Affected code: `apps/api/main.go`, `apps/api/internal/app/runtime.go`, `apps/api/internal/app/server.go`, `apps/api/internal/api/*.go`, and `apps/api/internal/counter/*.go`.
- Affected runtime: the Go public events service emits structured logs suitable for both local terminal use and Grafana/Loki ingestion.
- Affected operations: API startup, request handling, rate limiting, readiness checks, script serving, and counter flows gain consistent structured log coverage.
