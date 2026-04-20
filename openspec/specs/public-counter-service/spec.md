## Purpose

Define the public `events.vercount.one` service behavior for the browser script, compatibility routes, response contracts, and cross-origin access.

## Requirements

### Requirement: Public events host serves the browser counter script

The system SHALL serve the public browser counter script from `/js` on the public events host so existing embed tags continue to work without changing their script URL.

#### Scenario: Existing embed loads the script

- **WHEN** a browser requests `/js` from the public events host
- **THEN** the system SHALL return the browser counter script
- **AND** the response SHALL be cacheable for repeated public embed use

### Requirement: Public counter compatibility routes remain available

The system SHALL keep the public counter available at `/log`, `/api/v1/log`, and `/api/v2/log` on the public events host.

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

The system SHALL preserve the existing response shape differences between the public v1 and v2 routes.

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

The system SHALL allow browser clients on arbitrary origins to call the public counter routes.

#### Scenario: Browser sends preflight request

- **WHEN** a browser sends an `OPTIONS` request to a public counter route
- **THEN** the system SHALL return headers that allow cross-origin `GET`, `POST`, and `OPTIONS` usage

#### Scenario: Browser sends cross-origin counter request

- **WHEN** a browser sends a cross-origin `GET` or `POST` request to a public counter route
- **THEN** the system SHALL include the permissive CORS headers needed for the public embed flow

### Requirement: Public counter contract SHALL survive Redis client hardening

The system SHALL preserve the existing public counter route availability, response shapes, and counter semantics while the Go service adopts a pooled Redis client for burst traffic.

#### Scenario: Redis client implementation changes behind the public API

- **WHEN** the Go public events service replaces its internal Redis transport to improve concurrent throughput
- **THEN** `/log`, `/api/v1/log`, and `/api/v2/log` SHALL remain available on the public events host
- **AND** successful responses SHALL keep their established route-specific shapes
- **AND** the service SHALL continue using the existing Redis key contract and counter semantics for PV and UV updates

### Requirement: Public events host SHALL expose a benchmark write endpoint for probe tools

The system SHALL expose `GET /bench/write` on the public events host so external benchmark tools that cannot send the normal browser `POST` body can still trigger the real counter write path.

#### Scenario: Probe requests benchmark write route

- **WHEN** a client sends a `GET` request to `/bench/write`
- **THEN** the system SHALL handle the request on the public Go events host
- **AND** the request SHALL execute the Redis-backed counter write flow instead of returning a no-op response

### Requirement: Benchmark write route SHALL use the fixed synthetic benchmark target

The system SHALL execute benchmark writes against the fixed tracked URL `https://bench.vercount.one/gurt` so benchmark traffic stays isolated from customer-owned domains and remains comparable across runs.

#### Scenario: Benchmark request updates counters

- **WHEN** the system handles `GET /bench/write`
- **THEN** the system SHALL write counters for the host `bench.vercount.one` and path `/gurt`
- **AND** the system SHALL NOT require the caller to provide a target URL parameter or request body

### Requirement: Benchmark write route SHALL return an uncached v2-style success response

The system SHALL return a machine-readable response for benchmark writes using the existing v2-style success envelope, and the response SHALL disable caching so benchmarks measure application latency rather than cached content delivery.

#### Scenario: Benchmark request succeeds

- **WHEN** `GET /bench/write` completes successfully
- **THEN** the system SHALL return an HTTP `200` response with the current counter values in the v2-style success envelope
- **AND** the response SHALL include headers that prevent caches from storing the benchmark result

#### Scenario: Benchmark request is rate limited

- **WHEN** `GET /bench/write` exceeds the public counter route rate limit
- **THEN** the system SHALL reject the request using the same error semantics as the v2 public counter route
