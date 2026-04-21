## Context

The Go service under `apps/api` owns a narrow public surface, but the current implementation still carries duplicated route/log helpers, repeated target normalization, and several small generic helper layers that make a simple service harder to scan than it should be. The public counter surface includes three compatibility entrypoints (`/log`, `/api/v1/log`, and `/api/v2/log`) with two response shapes, and this cleanup needs to make the code underneath those routes simpler without removing that compatibility contract.

The cleanup also needs to preserve a few intentional behaviors that are still part of the product contract: `/js`, `/bench/write`, Redis-backed counter storage, the current v2 envelope semantics, request-scoped reads, detached accepted writes, and the Busuanzi bootstrap path for missing counters.

## Goals / Non-Goals

**Goals:**
- Keep `/log`, `/api/v1/log`, and `/api/v2/log` available with their established route-specific response shapes.
- Simplify the Go API internals so the request flow, counter initialization flow, and helper naming are shorter and easier to follow.
- Remove redundant validation, normalization, and fallback paths once a target URL has already been accepted.
- Tighten public CORS behavior so it is straightforward and correct for a credentialless public embed flow.
- Keep the current Redis key contract, Busuanzi bootstrap behavior, benchmark route, and v2 counter semantics intact.

**Non-Goals:**
- Changing the Redis key model or counter meaning for PV/UV values.
- Removing the Busuanzi bootstrap behavior for first-touch counter initialization.
- Removing `/js`, `/bench/write`, or the detached-write behavior for accepted POST requests.
- Reworking the web app, React package, or browser core package beyond any necessary route/documentation updates.

## Decisions

### 1. Keep the compatibility routes but collapse them onto one simpler internal flow

The implementation will preserve `/log`, `/api/v1/log`, and `/api/v2/log`, but it will reduce route-level duplication by sharing one normalized read flow, one normalized write flow, and thin response-shaping seams for v1 versus v2 behavior.

- **Why:** The user wants to keep the compatibility surface, so the cleanup needs to come from simpler internals rather than route removal.
- **Alternative considered:** remove the old routes and standardize on `/api/v2/log`. Rejected for this change because preserving v1 and legacy `/log` compatibility is a requirement.

### 2. Keep route-specific responses as thin wrappers, not separate business flows

The counter API will keep one straightforward read path and one straightforward write path: validate input, normalize the target once, rate-limit once, execute the counter operation, then shape the response as v1 or v2 at the edge. Benchmark writes will stay as a thin fixed-target wrapper over the same write path.

- **Why:** The current `V1*` and `V2*` split forces bool-controlled helpers and nearly duplicated read/write bodies. Shared core flow plus thin response seams keeps compatibility without keeping most of the bulk.
- **Alternative considered:** keep separate handler bodies and only rename helpers. Rejected because it still leaves the reader mentally reconstructing one logical path from several small pieces.

### 3. Normalize accepted targets once and pass a single canonical target through the counter layer

Accepted requests will parse and normalize the tracked URL once in the API layer. After that, the counter layer will operate on the accepted canonical host/path identity instead of re-sanitizing already-validated targets or inventing sentinel values such as `invalid-host`.

- **Why:** The current flow validates in `internal/api/log.go` and then sanitizes again in `internal/counter/service.go`. That duplicates work, scatters target rules across packages, and adds fallback shapes that should never be needed for an accepted request.
- **Alternative considered:** keep defensive sanitizing in both layers. Rejected because the extra fallback logic makes the happy path harder to trust and harder to read.

### 4. Prefer explicit small flows over generic callback helpers in the counter package

The counter package will keep its responsibilities small, but it will replace generic callback-style initialization helpers with explicit site/page initialization code where that improves readability. Function names will favor short direct verbs over abstract phrasing such as `writeAcceptedCounts`, `writeRequestScopedCounts`, or `initializeCounter(resolve, after)`.

- **Why:** The service is too small to benefit from clever generic flow helpers. Direct code is easier to maintain here.
- **Alternative considered:** keep the current helper graph and only rename methods. Rejected because the abstraction itself is part of the readability problem.

### 5. Keep only intentional fallback policies

The cleanup will keep the Busuanzi bootstrap behavior and keep the detached write timeout for accepted POSTs. Other edge handling will be simplified so fallback behavior is either removed or made explicit in one place. In particular, CORS will reflect a public credentialless API, and rate-limit degradation will use one named, documented policy instead of several scattered silent allow-through returns.

- **Why:** The problem is not that every fallback is bad; the problem is hidden or redundant fallback that makes the service harder to reason about.
- **Alternative considered:** aggressively remove every degraded-mode path. Rejected because some behaviors are product-level policies rather than accidental complexity.

### 6. Reduce helper duplication at package boundaries

Shared route/log helper behavior such as route-pattern lookup and logger seams will be consolidated so the same small helper logic does not live in multiple packages under slightly different names.

- **Why:** The current duplication is minor in size but high in noise. Removing it makes the API code feel more cohesive without introducing a new framework layer.
- **Alternative considered:** add a new shared utility package. Rejected because the codebase is small enough that one local shared seam is sufficient.

## Risks / Trade-offs

- **[Cleanup still leaves some compatibility complexity behind]** → Accept thin v1/legacy wrappers but remove duplication from the shared read/write path, target handling, and helper seams.
- **[Internal cleanup accidentally changes counter semantics]** → Keep the Redis key contract and Busuanzi bootstrap behavior unchanged and cover the simplified flow with targeted Go API tests.
- **[Tighter CORS or rate-limit handling exposes hidden dependencies]** → Verify `/log`, `/api/v1/log`, `/api/v2/log`, `/js`, and `/bench/write` explicitly so the compatibility surface remains intact.
- **[Refactor spreads into unrelated packages]** → Limit implementation scope to `apps/api` plus any minimal docs/tests updates required by the preserved public compatibility routes.

## Migration Plan

1. Update the public counter spec to preserve `/log`, `/api/v1/log`, and `/api/v2/log` while clarifying the public credentialless CORS behavior.
2. Simplify the router and handler structure in `apps/api` so the compatibility routes stay available but share one cleaner internal counter flow alongside `/js`, `/healthz`, and `/bench/write`.
3. Refactor counter target handling and initialization flow to use one accepted target identity and fewer generic helpers while preserving Redis keys and Busuanzi bootstrap behavior.
4. Tighten CORS and edge handling, then update docs and root metadata to list only supported public routes.
5. Run the Go API tests and add/update targeted tests around the preserved compatibility routes, request flow, and counter initialization.

Rollback:
- Restore the prior handler/helper structure if the compatibility-preserving cleanup changes route behavior or response shapes unexpectedly.

## Open Questions

None.
