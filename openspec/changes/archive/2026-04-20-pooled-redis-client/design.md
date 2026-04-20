## Context

The Go public events service in `apps/api` currently uses a custom Redis client in `internal/redis/client.go` that holds one application-managed TCP connection behind a mutex. Both the rate limiter and the counter service share that client, so every request serializes Redis traffic across one socket. Under rush-hour load, `/api/v2/log` requests perform enough Redis round trips that queued work starts hitting the existing 5-second request deadline and produces intermittent read/write timeout errors.

Constraints:
- The public route contract for `/log`, `/api/v1/log`, and `/api/v2/log` must remain unchanged.
- The existing Redis URL contract, key names, TTL behavior, and counter semantics must stay intact.
- `redis://` and `rediss://` deployments must keep working for local runs, Compose, and production.
- The change should stay simple: swap the Redis transport, not redesign the counter model or introduce broader background processing.

## Goals / Non-Goals

**Goals:**
- Replace the single-connection Redis transport with a concurrent-safe pooled client.
- Keep the resulting Go API code clean, direct, and easy to read rather than preserving old shapes just to reduce edits.
- Validate Redis connectivity during startup before the API begins serving traffic.
- Preserve the current Redis-backed behavior, including missing-key handling and TTL behavior.

**Non-Goals:**
- Changing PV/UV product behavior or Redis key structure.
- Reworking request flows into transactions, pipelines, or background jobs in this change.
- Adding new environment variables for pool tuning unless implementation proves that defaults are insufficient.
- Changing the Busuanzi migration behavior.
- Keeping the current Redis package shape if it only exists as a compatibility layer around the new client.

## Decisions

### 1. Use the maintained pooled Redis client directly in the Go API
The custom socket-level client will be removed and replaced with direct use of `github.com/redis/go-redis/v9` in the Go API. Any Redis-specific compatibility layer that only mirrors upstream methods should be deleted instead of preserved.

- **Why:** The bottleneck is in the old client, and the cleanest fix is to use the maintained pooled client directly instead of adding one more layer to preserve old call shapes.
- **Alternative considered:** keep the homemade client and add our own pooling. Rejected because it recreates connection management, timeout handling, TLS, and pooling behavior that a maintained library already solves.
- **Alternative considered:** keep `internal/redis` as a thin wrapper around `go-redis` for minimal call-site changes. Rejected because it adds indirection without real domain value.

### 2. Preserve URL-based Redis configuration and use sane in-code pool defaults
The new client will still build from `REDIS_URL`, including auth, DB selection, and TLS behavior derived from `redis://` or `rediss://`. Pool sizing and timeouts will use explicit in-code defaults suited to an HTTP service, rather than introducing new env knobs in this change.

- **Why:** This keeps deployment compatibility stable while solving the urgent burst-traffic problem with minimal configuration churn.
- **Alternative considered:** add new environment variables for pool size and timeout tuning immediately. Rejected because the current problem is architectural, and sensible defaults are enough to start.

### 3. Fail fast on Redis connectivity during startup
After constructing the pooled client, the API will validate connectivity before starting the HTTP server.

- **Why:** The service should not start accepting public traffic if Redis is unreachable or misconfigured.
- **Alternative considered:** defer validation until the first live request. Rejected because that produces a partially healthy service and noisier production failures.

### 4. Keep public behavior stable while simplifying the implementation
The rate limiter and counter service will keep their existing external behavior, but their Redis calls may be rewritten directly against `go-redis` where that is clearer than preserving old helper methods.

- **Why:** The user wants straightforward code, so behavior compatibility should be preserved without freezing the old internal structure in place.
- **Alternative considered:** combine the pooling change with command batching, transactions, or write-flow redesign. Rejected because it expands scope and makes it harder to isolate the fix.

## Risks / Trade-offs

- **Library swap can subtly change command semantics** → Verify missing-key, integer parsing, and TTL behavior against current expectations while removing any wrapper code that does not add domain value.
- **Pooling reduces but may not eliminate peak latency** → Treat this as the first hardening step; if pressure remains, follow up later with fewer Redis round trips or batching.
- **Startup ping can block startup when Redis is unhealthy** → Accept this intentionally so a broken dependency does not become a partially live public service.
- **New dependency introduces version and module maintenance** → Use the official maintained Go Redis client and keep the dependency isolated to `apps/api`.

## Migration Plan

1. Add the pooled Redis dependency to `apps/api/go.mod`.
2. Remove the custom socket client implementation and switch the Go API to direct `go-redis` usage.
3. Update startup to validate Redis before `ListenAndServe`.
4. Verify the Go API still serves the same public routes and counter behavior while reducing rush-hour timeout risk.

Rollback:
- Restore the previous Redis implementation and remove the added dependency if the library swap causes compatibility issues.

## Open Questions

None.
