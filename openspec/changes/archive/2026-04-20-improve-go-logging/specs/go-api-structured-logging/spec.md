## ADDED Requirements

### Requirement: Go public events service SHALL emit structured production logs

The Go public events service SHALL emit production logs as one machine-readable structured record per log event so the service's stdout can be ingested directly by log aggregation systems such as Grafana/Loki.

#### Scenario: Production runtime emits an operational log
- **WHEN** the Go API emits a startup, request, rate-limit, readiness, script, or counter log in a production-like runtime
- **THEN** the emitted log SHALL be a single structured record on one line
- **AND** the record SHALL include consistent core fields for timestamp, level, message, and event identity

### Requirement: Go public events service SHALL preserve readable local logs without changing log meaning

The Go public events service SHALL keep local development logs readable for inline terminal use while preserving the same event names and contextual fields used by the production log schema.

#### Scenario: Developer runs the Go API locally
- **WHEN** the Go API emits an operational log during local development
- **THEN** the log output SHALL remain human-readable in the terminal
- **AND** the log SHALL preserve the same semantic event identity and contextual information used in production logging

### Requirement: Go public events service SHALL log request completion with correlation and outcome data

The Go public events service SHALL record request lifecycle logs for handled HTTP requests so operators can correlate a request with its route, outcome, and duration.

#### Scenario: Request completes successfully
- **WHEN** the Go API handles an HTTP request to a public route
- **THEN** the service SHALL emit a request log that includes a request correlation identifier, HTTP method, matched route, response status, and request duration

#### Scenario: Request fails during handling
- **WHEN** the Go API encounters an internal failure while handling an HTTP request
- **THEN** the service SHALL emit a request or error log that preserves the request correlation identifier and route context
- **AND** the log SHALL indicate the failure outcome at an appropriate non-success severity

### Requirement: Go public events service SHALL use consistent structured events for notable operational conditions

The Go public events service SHALL use stable structured event names and contextual fields for notable operational conditions across startup, rate limiting, suspicious user agents, readiness failures, script-serving failures, and counter read or write failures.

#### Scenario: Rate limit condition is triggered
- **WHEN** the service rejects or warns about request traffic because of rate limiting
- **THEN** the emitted log SHALL identify the rate-limit event consistently
- **AND** the log SHALL include the relevant request context needed to diagnose the condition

#### Scenario: Counter operation fails
- **WHEN** the service cannot complete a counter read or write operation
- **THEN** the emitted log SHALL identify the counter failure consistently
- **AND** the log SHALL include the operational context needed to diagnose the failure
