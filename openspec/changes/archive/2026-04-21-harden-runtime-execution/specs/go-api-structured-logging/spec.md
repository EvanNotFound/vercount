## MODIFIED Requirements

### Requirement: Go public events service SHALL log request completion with correlation and outcome data

The Go public events service SHALL record request lifecycle logs for handled HTTP requests so operators can correlate a request with its route, transport outcome, response status when available, and duration.

#### Scenario: Request completes successfully
- **WHEN** the Go API handles an HTTP request to a public route and returns a response normally
- **THEN** the service SHALL emit a request log that includes a request correlation identifier, HTTP method, matched route, response status, and request duration

#### Scenario: Request fails during handling
- **WHEN** the Go API encounters an internal failure while handling an HTTP request before the transport is aborted
- **THEN** the service SHALL emit a request or error log that preserves the request correlation identifier and route context
- **AND** the log SHALL indicate the failure outcome at an appropriate non-success severity

#### Scenario: Request transport aborts before response completion
- **WHEN** the client disconnects or cancels a public HTTP request before the response is fully delivered
- **THEN** the service SHALL emit a request log that preserves the request correlation identifier, HTTP method, matched route, and request duration
- **AND** the log SHALL indicate that the HTTP transport was aborted even if no final response status was delivered to the client

### Requirement: Go public events service SHALL use consistent structured events for notable operational conditions

The Go public events service SHALL use stable structured event names and contextual fields for notable operational conditions across startup, rate limiting, suspicious user agents, readiness failures, script-serving failures, counter read or write failures, and detached counter write outcomes.

#### Scenario: Rate limit condition is triggered
- **WHEN** the service rejects or warns about request traffic because of rate limiting
- **THEN** the emitted log SHALL identify the rate-limit event consistently
- **AND** the log SHALL include the relevant request context needed to diagnose the condition

#### Scenario: Counter operation fails
- **WHEN** the service cannot complete a counter read or write operation
- **THEN** the emitted log SHALL identify the counter failure consistently
- **AND** the log SHALL include the operational context needed to diagnose the failure, including normalized target host and path when available

#### Scenario: Detached write outcome is recorded after client abort
- **WHEN** an accepted public counter write continues on detached runtime after the originating HTTP transport has been aborted
- **THEN** the service SHALL emit a structured detached-write outcome event separately from the transport-abort request log
- **AND** the detached-write outcome log SHALL identify whether the write succeeded or failed and include normalized target host and path for diagnosis
