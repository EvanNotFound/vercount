## Context

The Go public events service in `apps/api` now uses `go-redis`, but the hot request paths still execute many Redis commands one at a time. `RateLimiter.Check` performs four sequential Redis operations for each request, and the counter service repeatedly uses pairs such as `INCR` + `EXPIRE`, `GET` + `EXPIRE`, and `SADD` + `EXPIRE` in the busiest PV/UV flows. That means rush-hour traffic still pays for unnecessary Redis round trips even after the earlier pooled-client change removed the single-connection bottleneck.

Constraints:
- Public route behavior for `/log`, `/api/v1/log`, and `/api/v2/log` must remain unchanged.
- The Redis key contract, TTL behavior, and Busuanzi-backed first-touch initialization must remain intact.
- The user explicitly wants straightforward code, not a generic batching framework or minimal-change wrappers.
- This change is an optimization pass, not a redesign of the counting model or rate-limit algorithm.

## Goals / Non-Goals

**Goals:**
- Reduce Redis round trips in the hottest Go API paths with direct, local pipelining.
- Keep the implementation readable by using `go-redis` pipeline helpers only where they clearly match existing grouped operations.
- Preserve current PV/UV behavior, route responses, key names, and TTL refresh semantics.
- Optimize the warm path aggressively enough to matter without turning the code into a new framework.

**Non-Goals:**
- Replacing the current rate-limit algorithm with Lua, WATCH, or stricter atomic enforcement.
- Building a shared repository-wide pipelining abstraction.
- Changing first-touch Busuanzi initialization behavior.
- Adding new environment knobs or tuning systems for pipelining.

## Decisions

### 1. Apply pipelining only in the functions that already express grouped Redis work
The implementation will pipeline only where the existing code already performs an obvious group of Redis operations: rate-limit cleanup and count, allowed-request rate-limit writes, value mutation plus TTL refresh, page inventory set update plus TTL refresh, and the legacy UV read pair.

- **Why:** These are the highest-value round-trip reductions and keep the code easy to follow because the grouped Redis work already exists conceptually.
- **Alternative considered:** batch the whole request through a new coordinator that collects Redis work across multiple functions. Rejected because it adds cross-function orchestration and makes the hot path harder to reason about.

### 2. Prefer native Redis combinations when they are simpler than a pipeline
Where Redis already provides a clearer one-command form, such as `GETEX` for read-plus-expire behavior, the implementation should use that instead of building a small pipeline just to say two commands.

- **Why:** The goal is fewer round trips with simpler code, not pipelines for their own sake.
- **Alternative considered:** force every optimization through `Pipeline` or `Pipelined`. Rejected because some built-in commands are cleaner and more direct.

### 3. Keep initialization branches sequential when later work depends on earlier reads
The missing-key initialization path in `initializeCounter` will stay correctness-first. It should continue to read the current state, decide whether fallback import is needed, resolve the initial value, and then write it, instead of trying to pipeline dependent steps across that decision boundary.

- **Why:** The first-touch PV/UV import behavior depends on whether the key exists and on fallback data resolution, so speculative batching would add complexity and correctness risk for a colder path.
- **Alternative considered:** pipeline or transaction-wrap the entire initialization path. Rejected because the logic is dependency-driven and not worth forcing into a batched shape.

### 4. Use small, explicit pipeline phases for the rate limiter
The rate limiter should use one pipeline for cleanup and count, then a second pipeline for the add-plus-expire write phase when the request is still under the limit.

- **Why:** This captures the biggest easy win in a very hot function while preserving the current decision point between read-side and write-side operations.
- **Alternative considered:** redesign the rate limiter as a Lua script or transaction. Rejected because the user wants practical optimization of the existing system, not a heavier redesign.

### 5. Keep the optimization local and obvious in the counter service
The counter service should add direct pipelining inside the existing hot functions rather than moving Redis work into new helper layers just to make pipelining reusable.

- **Why:** The user prefers direct, straightforward code, and the optimized groups are small enough to live clearly inside the existing functions.
- **Alternative considered:** create reusable pipeline-builder helpers for PV, UV, and inventory operations. Rejected because that creates abstraction without meaningful domain value.

## Risks / Trade-offs

- **Plain pipelining is not atomic** → Keep current behavior expectations and avoid implying stronger correctness guarantees than the current algorithm already has.
- **Warm-path optimization may leave some cold-path round trips intact** → Accept this because the cold path is less frequent and more correctness-sensitive due to fallback initialization.
- **Mixing pipelines and non-pipeline reads can get harder to read** → Keep each pipelined block small and adjacent to the logic it serves.
- **Over-optimizing can make the code clever** → Treat readability as a hard constraint and stop at direct local batching rather than adding general mechanisms.

## Migration Plan

1. Add direct pipelining to `RateLimiter.Check` in two explicit phases.
2. Optimize the counter service's obvious command pairs and small groups, including mutation-plus-expire, stored-page updates, and legacy UV reads.
3. Use built-in command combinations like `GETEX` where they simplify hot read-plus-touch flows.
4. Verify that the public routes still return the same data and that hot-path Redis round trips are reduced without changing initialization behavior.

Rollback:
- Revert the pipelined call sites back to their sequential Redis operations if the optimization introduces behavior drift or readability problems.

## Open Questions

None.
