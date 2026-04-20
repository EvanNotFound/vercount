## ADDED Requirements

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
