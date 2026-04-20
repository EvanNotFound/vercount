## Purpose

Define Redis client expectations for the Go public events service, including concurrency behavior, connection URL compatibility, and startup validation.

## Requirements

### Requirement: Go API Redis access SHALL support concurrent public traffic

The Go public events service SHALL use a Redis client implementation that supports pooled, concurrent access for rate limiting and counter operations without funneling all requests through one shared application-managed connection.

#### Scenario: Concurrent counter requests use pooled Redis access

- **WHEN** multiple public counter requests reach the Go API at the same time
- **THEN** the service SHALL be able to issue Redis commands through a connection pool that is safe for concurrent use
- **AND** the service SHALL NOT depend on one manually shared socket guarded by application-level locking for all Redis traffic

### Requirement: Redis connection URL compatibility SHALL be preserved

The Go public events service SHALL continue to accept the existing Redis connection URL configuration used by direct runs and container deployments.

#### Scenario: Plain Redis URL is configured

- **WHEN** the service starts with a `redis://` connection URL
- **THEN** the Redis client SHALL connect using that URL's host, authentication, and database selection

#### Scenario: TLS Redis URL is configured

- **WHEN** the service starts with a `rediss://` connection URL
- **THEN** the Redis client SHALL connect over TLS while preserving that URL's host, authentication, and database selection

### Requirement: API startup SHALL validate Redis connectivity

The Go public events service SHALL verify Redis connectivity during startup before it begins serving live traffic.

#### Scenario: Redis is reachable at startup

- **WHEN** the service starts and the configured Redis backend is reachable
- **THEN** the service SHALL validate that connection successfully before accepting requests

#### Scenario: Redis is unavailable at startup

- **WHEN** the service starts and the configured Redis backend cannot be reached or authenticated
- **THEN** the service SHALL fail startup instead of serving requests with a broken Redis dependency
