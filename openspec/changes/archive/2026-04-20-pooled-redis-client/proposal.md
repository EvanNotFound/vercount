## Why

The Go public events service currently talks to Redis through a single shared connection, which starts timing out under rush-hour traffic. Replacing that transport with a pooled Redis client is needed now to keep `events.vercount.one` responsive without changing the public counter contract.

## What Changes

- Replace the Go API's custom single-connection Redis transport with the maintained pooled `go-redis` client.
- Keep the existing Redis URL contract, key names, counter semantics, and public route behavior unchanged while swapping the client implementation.
- Add startup Redis connectivity validation so the API fails fast instead of discovering broken Redis access only after serving live traffic.
- Preserve the existing `redis://` and `rediss://` connection behavior used by local runs and container deployments.
- Remove unnecessary Redis-specific compatibility layers so the Go API code stays direct and easy to follow.

## Capabilities

### New Capabilities
- `redis-client-pooling`: Defines how the Go public events service establishes pooled Redis access, validates connectivity at startup, and remains safe under concurrent counter traffic.

### Modified Capabilities
- `public-counter-service`: The public events host must continue serving the current routes and response contracts while using the pooled Redis-backed runtime.

## Impact

- Affected code: `apps/api/internal/redis/*`, `apps/api/main.go`, and the Go API call sites in rate limiting and counter services.
- Affected runtime: `events.vercount.one` request handling under burst traffic and startup behavior when Redis is unavailable.
- Affected dependencies: the Go API will add a maintained Redis client library with connection pooling support.
