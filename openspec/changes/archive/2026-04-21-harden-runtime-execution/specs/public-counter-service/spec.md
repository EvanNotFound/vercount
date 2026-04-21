## ADDED Requirements

### Requirement: Accepted public POST counter writes SHALL survive transport aborts

The system SHALL continue an accepted public counter POST write on a bounded detached runtime even if the originating HTTP client disconnects before the response can be delivered.

#### Scenario: Accepted v2 write continues after client disconnect
- **WHEN** `/api/v2/log` receives a valid, rate-limit-passing POST request and the tracked URL is accepted for counting
- **THEN** the system SHALL continue the counter write even if the client disconnects before the HTTP response is fully returned
- **AND** the detached write SHALL use the same Redis key contract and counter update semantics as a connected write request

#### Scenario: Accepted compatibility write continues after client disconnect
- **WHEN** `/log` or `/api/v1/log` receives a valid, rate-limit-passing POST request and the tracked URL is accepted for counting
- **THEN** the system SHALL continue the counter write even if the client disconnects before the HTTP response is fully returned
- **AND** the detached write SHALL preserve the established v1 counter semantics for that accepted write

#### Scenario: Detached write remains bounded
- **WHEN** the system continues an accepted public POST write after the client disconnects
- **THEN** the detached write SHALL remain bounded by a server-controlled timeout
- **AND** the system SHALL stop the detached work when that write budget is exhausted

### Requirement: Public counter reads SHALL remain request-scoped

The system SHALL keep public counter read operations tied to the HTTP request lifetime so abandoned read requests do not continue unnecessary work after the client disconnects.

#### Scenario: Read request is abandoned by the client
- **WHEN** a client disconnects while the system is handling a public counter GET request
- **THEN** the system SHALL stop the request-scoped read work instead of continuing it on a detached runtime
