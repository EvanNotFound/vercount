## ADDED Requirements

### Requirement: Public events host SHALL expose a service metadata root endpoint

The system SHALL expose `GET /` on the public Go API host as a small JSON endpoint describing the service and its public routes.

#### Scenario: Client requests the service root
- **WHEN** a client sends a `GET` request to `/`
- **THEN** the system SHALL return a JSON response
- **AND** the response SHALL identify the public Go API service
- **AND** the response SHALL include the public routes exposed by that service

### Requirement: Public events host SHALL expose a Redis-backed readiness endpoint

The system SHALL expose `GET /healthz` as a readiness endpoint that reflects whether the service can reach Redis.

#### Scenario: Redis is reachable
- **WHEN** a client sends a `GET` request to `/healthz` and Redis is reachable
- **THEN** the system SHALL return a success response indicating the service is ready
- **AND** the response SHALL be machine-readable JSON

#### Scenario: Redis is unavailable
- **WHEN** a client sends a `GET` request to `/healthz` and Redis is not reachable
- **THEN** the system SHALL return a non-success readiness response
- **AND** the response SHALL indicate that Redis is the dependency preventing readiness
