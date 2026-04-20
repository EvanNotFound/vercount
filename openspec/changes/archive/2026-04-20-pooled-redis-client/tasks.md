## 1. Adopt a pooled Redis client in the Go API

- [x] 1.1 Add the maintained Redis client dependency to `apps/api/go.mod` and wire it into the Go API build.
- [x] 1.2 Remove the custom Redis socket client and switch the Go API to direct `go-redis` usage where it improves clarity.
- [x] 1.3 Keep `REDIS_URL` compatibility intact for `redis://` and `rediss://`, including auth, TLS, and DB selection.

## 2. Integrate startup validation without changing public counter behavior

- [x] 2.1 Update the Go API startup path to validate Redis connectivity before `ListenAndServe` begins accepting traffic.
- [x] 2.2 Update the rate limiter and counter code to use the new client in a clean, straightforward way without preserving unnecessary compatibility helpers.
- [x] 2.3 Keep route behavior, Redis keys, and PV/UV semantics unchanged after the Redis integration cleanup.

## 3. Verify burst-traffic hardening

- [x] 3.1 Build the Go API and fix any compile or module issues introduced by the client swap.
- [x] 3.2 Run targeted verification for the public API flows to confirm `/log`, `/api/v1/log`, and `/api/v2/log` still use the established response shapes and counter behavior.
- [x] 3.3 Exercise the API against Redis with concurrent requests to confirm the pooled client removes the single-connection bottleneck that caused rush-hour timeouts.
