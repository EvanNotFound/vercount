## ADDED Requirements

### Requirement: Public counter contract SHALL survive Redis client hardening

The system SHALL preserve the existing public counter route availability, response shapes, and counter semantics while the Go service adopts a pooled Redis client for burst traffic.

#### Scenario: Redis client implementation changes behind the public API
- **WHEN** the Go public events service replaces its internal Redis transport to improve concurrent throughput
- **THEN** `/log`, `/api/v1/log`, and `/api/v2/log` SHALL remain available on the public events host
- **AND** successful responses SHALL keep their established route-specific shapes
- **AND** the service SHALL continue using the existing Redis key contract and counter semantics for PV and UV updates
