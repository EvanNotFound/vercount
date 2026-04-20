## 1. Add direct pipelining to the hottest Redis paths

- [x] 1.1 Update `apps/api/internal/app/rate_limit.go` to batch the cleanup/count phase and the allowed-request write phase with small explicit pipelines.
- [x] 1.2 Update the counter service hot functions to batch the obvious grouped Redis operations such as `INCR` + TTL refresh, stored-page set update + TTL refresh, and legacy UV read pairs.
- [x] 1.3 Use simpler built-in Redis command combinations like `GETEX` where they reduce round trips more cleanly than adding a small pipeline.

## 2. Preserve correctness and keep the code straightforward

- [x] 2.1 Keep the missing-key initialization path sequential where it depends on an earlier Redis read or Busuanzi fallback result.
- [x] 2.2 Make sure the pipelined call sites stay local to the rate-limit and counter functions instead of introducing a generic pipelining abstraction layer.
- [x] 2.3 Verify that the optimized paths preserve the current Redis key names, TTL behavior, and PV/UV semantics.

## 3. Verify the optimization pass

- [x] 3.1 Build the Go API and fix any compile or module issues introduced by the pipelining changes.
- [x] 3.2 Run targeted verification for `/log`, `/api/v1/log`, and `/api/v2/log` to confirm the public responses and counter values remain unchanged.
- [x] 3.3 Exercise the optimized hot paths with repeated or concurrent requests to confirm Redis round trips are reduced without making the code path harder to reason about.
