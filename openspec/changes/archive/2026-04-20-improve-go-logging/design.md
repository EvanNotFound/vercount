## Context

The Go public events service under `apps/api` now serves the long-term public counter surface through the chi-based API introduced by the completed `api-chi-refactor` change. The service currently still uses a small custom logger in `internal/app/runtime.go` that prints a string prefix like `[timestamp] LEVEL: message` and then appends JSON-encoded payload data when available. That format is readable enough in a terminal, but it is not a clean structured log record for Grafana/Loki ingestion and it does not provide a consistent request lifecycle view.

Today, request-related logging is split across route handlers and the log route rate limiter in `internal/api/log.go`. Successful requests log domain-specific outcomes such as retrieved counts or updated counters, while the rate limiter separately logs `Request received`, suspicious user agents, and rate-limit conditions. Counter internals in `internal/counter/*.go` also emit debug logs, but those logs use the same custom format and do not share a standard event schema. The result is fragmented operational visibility even though the Go API is now the primary public edge service.

Constraints:
- Existing `/`, `/healthz`, `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` behavior must remain compatible.
- Logging improvements should stay scoped to the Go API and should not require a coordinated Next.js logger rewrite.
- Production logs need to work well as stdout JSON for Grafana/Loki, while local development still needs readable terminal output.
- The repo prefers straightforward changes that fit the current small-service architecture without introducing an observability framework migration.

## Goals / Non-Goals

**Goals:**
- Replace the custom Go logger with an industry-standard structured logging approach.
- Emit production logs as one structured record per line so Grafana/Loki can ingest them directly.
- Add request lifecycle logging that captures request correlation, route, status, and duration for the Go API.
- Standardize event naming and field naming across startup, public endpoints, rate limiting, and counter operations.
- Keep local development logs readable without creating a separate semantic logging model for dev and prod.

**Non-Goals:**
- Changing public API routes, response bodies, or counter semantics.
- Introducing tracing, metrics, or a full OpenTelemetry rollout.
- Adding direct Loki client push logic inside the service.
- Refactoring the web app logger as part of this change.

## Decisions

### 1. Standardize the Go API on `log/slog`
The Go API will adopt the standard library `log/slog` package as its canonical logging API.

- **Why:** `slog` is the current standard Go structured logging API, supports JSON and text handlers out of the box, and keeps this service aligned with modern Go conventions without adding another external dependency for core logging behavior.
- **Alternative considered:** keep the custom logger and only tweak its output format. Rejected because it would preserve a non-standard logging API and continue mixing presentation logic with structured data concerns.
- **Alternative considered:** adopt `zap` or `zerolog`. Rejected because their performance advantages are unnecessary for this service size and they add dependency surface where the standard library is sufficient.

### 2. Use one event schema with two handlers
The service will use one shared structured event model and switch only the renderer by environment: a text-oriented handler for local development and a JSON handler for production-like runtime.

- **Why:** The user wants logs that work both inline and in Grafana. Keeping one semantic schema prevents dev and prod logs from drifting apart while still allowing terminal readability locally.
- **Alternative considered:** emit bespoke colored dev logs and unrelated JSON production logs. Rejected because it creates two logging contracts and makes production issues harder to reproduce locally.

### 3. Add chi request ID and request completion logging as the primary HTTP signal
The chi router will gain request correlation and request completion logging so each handled API request records the request ID, method, route pattern, status code, and duration.

- **Why:** The current `Request received` log in the rate limiter only captures the start of the request and misses outcome data. Industry-standard API logging is request lifecycle oriented, with completion logs as the main operational signal.
- **Alternative considered:** keep ad hoc per-handler info logs only. Rejected because they do not provide consistent route-level observability and make latency or failure analysis harder.

### 4. Keep event names and field names stable across packages
The service will use stable event names and field keys for major operational concerns such as startup, request completion, rate limiting, suspicious user agents, readiness failures, script serving failures, and counter read/write failures.

- **Why:** Stable names make terminal logs easier to scan and let Grafana queries aggregate related behavior reliably.
- **Alternative considered:** keep freeform human phrases as the primary contract. Rejected because freeform messages are less queryable and harder to keep consistent across packages.

### 5. Treat high-cardinality request details as structured fields, not logger identity
Fields such as request ID, client IP, target host, target path, and user agent will remain structured event fields rather than becoming logger names, static component identifiers, or assumed Grafana labels.

- **Why:** Those values are operationally useful, but they vary too much to act as stable indexing dimensions. Keeping them in the structured record preserves debugging value without encouraging a high-cardinality log identity model.
- **Alternative considered:** encode dynamic request metadata into logger instances or downstream label assumptions. Rejected because it would make log aggregation noisier and more expensive.

## Risks / Trade-offs

- **Request completion logging increases baseline log volume** → Keep one summary log per handled request at the primary info level and leave noisier counter internals at debug level.
- **Changing the logger API touches multiple packages** → Keep the shape focused on the Go API only and update package seams in one pass so the service has one clear logging model.
- **Text and JSON handlers can drift in readability expectations** → Keep the same event names and fields regardless of handler so only presentation changes between environments.
- **Route pattern logging depends on middleware order and response capture** → Add request logging centrally in the chi stack so route and status data are captured consistently after handler execution.

## Migration Plan

1. Introduce the new `slog`-based logger bootstrap in the Go runtime wiring.
2. Add chi request correlation and request completion logging in the API server/router layer.
3. Update public endpoint, log endpoint, rate limit, and counter call sites to emit the agreed structured events and fields.
4. Verify local development output remains readable and production-mode output is JSON per line.
5. Verify the existing public routes and responses remain behaviorally compatible while logging changes are applied.

Rollback:
- Revert the `slog` bootstrap and request logging middleware, then restore the previous custom logger and call patterns if the new log output or routing instrumentation causes unacceptable operational regressions.

## Open Questions

None.
