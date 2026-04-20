## ADDED Requirements

### Requirement: Hot public Redis paths SHALL batch independent commands

The Go public events service SHALL reduce Redis round trips in its hottest public request paths by batching independent commands with native Redis pipelining or equivalent built-in Redis command combinations.

#### Scenario: Rate-limit maintenance batches independent steps
- **WHEN** the Go API evaluates a public request against the Redis-backed rate limit
- **THEN** it SHALL batch the independent cleanup and count operations together where Redis command ordering still preserves the current rate-limit behavior
- **AND** it SHALL batch the independent write-side updates for an allowed request where that does not require a redesign of the current algorithm

#### Scenario: Counter hot path batches command pairs
- **WHEN** the Go API updates or refreshes existing hot-path PV or UV Redis records
- **THEN** it SHALL batch the paired Redis operations that already belong to one logical step, such as value mutation plus TTL refresh or stored-page set update plus TTL refresh

### Requirement: Pipelining SHALL preserve existing counter semantics

The Go public events service SHALL keep the current Redis key contract, TTL behavior, and PV/UV response semantics while introducing pipelining.

#### Scenario: Existing warm counter request stays behavior-compatible
- **WHEN** a public counter request reaches a Redis-backed path that already has initialized PV and UV records
- **THEN** the system SHALL return the same counter fields and route-specific response shape as before
- **AND** the Redis-backed counter updates SHALL preserve the current key names and TTL refresh behavior

### Requirement: Dependent initialization paths SHALL remain correctness-first

The Go public events service SHALL keep sequential logic for initialization branches whose later steps depend on the outcome of an earlier Redis read or Busuanzi fallback, instead of forcing those branches into speculative batching.

#### Scenario: Missing counter still uses gated initialization flow
- **WHEN** a public counter request touches a PV or UV key that has not been initialized locally yet
- **THEN** the system SHALL determine that missing state before running the fallback import and local write
- **AND** it SHALL NOT batch dependent initialization work in a way that changes the current first-touch import behavior

### Requirement: Redis hot-path optimization SHALL stay direct and local

The Go public events service SHALL implement Redis hot-path batching with straightforward function-local use of the existing Redis client, rather than introducing a generic repository-specific pipelining framework.

#### Scenario: Hot-path batching is implemented
- **WHEN** the Redis hot-path optimization is added to the Go API
- **THEN** the implementation SHALL keep the batching logic near the rate-limit and counter functions it optimizes
- **AND** it SHALL NOT require a new generic Redis abstraction layer solely to express pipelined command groups
