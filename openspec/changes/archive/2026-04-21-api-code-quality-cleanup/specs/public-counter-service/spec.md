## MODIFIED Requirements

### Requirement: Public counter compatibility routes remain available
The system SHALL keep the public counter available at `/log`, `/api/v1/log`, and `/api/v2/log` on the public events host while the Go service simplifies its internal request and counter handling flow.

#### Scenario: Legacy client uses `/log`
- **WHEN** a client sends a public counter request to `/log`
- **THEN** the system SHALL process that request using the same counter behavior as the legacy v1 route

#### Scenario: Existing client uses `/api/v1/log`
- **WHEN** a client sends a public counter request to `/api/v1/log`
- **THEN** the system SHALL keep that route available for public read and write requests

#### Scenario: Existing client uses `/api/v2/log`
- **WHEN** a client sends a public counter request to `/api/v2/log`
- **THEN** the system SHALL keep that route available for public read and write requests

### Requirement: V1 and V2 response formats stay compatible
The system SHALL preserve the existing response shape differences between the public v1 and v2 routes while the Go service simplifies its internal handler and counter helper structure.

#### Scenario: Successful v1 request returns plain JSON
- **WHEN** a valid public counter read or write request is handled by `/api/v1/log`
- **THEN** the system SHALL return plain JSON containing `site_uv`, `site_pv`, and `page_pv`

#### Scenario: Successful v2 request returns the current envelope
- **WHEN** a valid public counter read or write request is handled by `/api/v2/log`
- **THEN** the system SHALL return the current standardized success envelope containing `site_uv`, `site_pv`, and `page_pv`

#### Scenario: Invalid tracked URL stays client-safe
- **WHEN** a public counter route receives an invalid tracked URL
- **THEN** the system SHALL return a client-safe `200` response with zero counter values
- **AND** the response SHALL use the established route-specific response shape for the route that handled the request

### Requirement: Public counter routes stay cross-origin accessible
The system SHALL allow browser clients on arbitrary origins to call the public counter routes using a wildcard non-credentialed CORS policy suitable for the public embed flow.

#### Scenario: Browser sends preflight request
- **WHEN** a browser sends an `OPTIONS` request to a public counter route
- **THEN** the system SHALL return headers that allow cross-origin `GET`, `POST`, and `OPTIONS` usage
- **AND** the response SHALL use a wildcard origin policy without enabling credentialed CORS

#### Scenario: Browser sends cross-origin counter request
- **WHEN** a browser sends a cross-origin `GET` or `POST` request to a public counter route
- **THEN** the system SHALL include the permissive non-credentialed CORS headers needed for the public embed flow

### Requirement: Public counter contract SHALL survive Redis client hardening
The system SHALL preserve the existing public counter route availability, response shapes, and counter semantics while the Go service simplifies its internal Redis, request, and helper structure.

#### Scenario: Redis client or request helper implementation changes behind the public API
- **WHEN** the Go public events service changes its internal request, logging, or Redis helper structure
- **THEN** `/log`, `/api/v1/log`, and `/api/v2/log` SHALL remain available on the public events host
- **AND** successful responses SHALL keep their established route-specific shapes
- **AND** the service SHALL continue using the existing Redis key contract and counter semantics for PV and UV updates

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
