## Why

The Go public events service now uses a pooled Redis client, but its hot request paths still issue many small Redis commands one by one. Adding direct, local pipelining to the busiest paths is needed now to reduce rush-hour latency and timeout pressure without redesigning the counter system or introducing clever infrastructure.

## What Changes

- Add pipelining to the Go API's Redis hot paths where commands are already grouped and can be batched safely.
- Keep the current public counter routes, Redis keys, TTL behavior, and PV/UV semantics unchanged while reducing Redis round trips.
- Prefer direct function-local `go-redis` pipelining and built-in command combinations such as `GETEX` over generic batching abstractions.
- Avoid overengineering: do not introduce Lua, optimistic locking, or a new Redis abstraction layer unless correctness requires it.

## Capabilities

### New Capabilities
- `redis-hot-path-pipelining`: Defines how the Go public events service batches independent Redis commands in the hottest request paths while preserving existing counter behavior.

### Modified Capabilities

## Impact

- Affected code: `apps/api/internal/app/rate_limit.go`, `apps/api/internal/counter/service.go`, and related Go API Redis call sites.
- Affected runtime: `events.vercount.one` hot GET/POST request latency and Redis round-trip volume under traffic.
- Affected dependencies: no new product dependency is required beyond the existing `go-redis` client already adopted by the API.
