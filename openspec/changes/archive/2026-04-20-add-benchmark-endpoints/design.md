## Context

The Go events service currently exposes public metadata routes in `internal/api/public.go` and counter routes in `internal/api/log.go`. Real browser traffic writes counters through `POST /api/v2/log` with a JSON body, URL validation, rate limiting, Redis-backed UV/PV updates, and a v2 success envelope. External benchmarking tools such as itdog.cn can easily probe `GET` endpoints but cannot reproduce the browser's `POST` body flow, which makes existing public routes a poor fit for measuring real counter write latency from many regions.

The benchmark route needs to stay public, stable, and safe. It should measure the same counter write hot path without polluting customer domains, and it must avoid cache hits that would hide application latency.

## Goals / Non-Goals

**Goals:**
- Expose a public `GET /bench/write` route on the Go events host.
- Reuse the real Redis-backed counter write path so benchmark results reflect counter update latency rather than a no-op handler.
- Keep benchmark traffic isolated under the fixed synthetic tracked URL `https://bench.vercount.one/gurt`.
- Return a stable response contract that is easy to inspect from external benchmark tools.
- Prevent intermediary caches from turning the benchmark route into a static response.

**Non-Goals:**
- Reproduce browser-only behavior such as CORS preflight or JSON body decoding.
- Add a user-configurable benchmark target URL.
- Replace `/api/v1/log` or `/api/v2/log` as the primary embed-facing public API.
- Create a high-volume load-testing endpoint that bypasses the service's normal protections.

## Decisions

### Add a dedicated GET benchmark route that lives with the counter handlers

`GET /bench/write` will be registered as a public route in the Go API and implemented alongside the counter handlers so it can reuse existing validation, write, logging, and response helpers. Keeping the route near `V2Post` avoids duplicating the counter write orchestration and makes the benchmark path a thin facade over the existing write flow.

**Alternatives considered:**
- Put `/bench/write` in `public.go`: rejected because the route is logically a counter write operation and would otherwise need cross-package helper exposure.
- Ask probe tools to call `/api/v2/log` directly: rejected because the target tool only supports simple `GET` probes.

### Use a fixed synthetic target URL and force the full write path

The benchmark route will always target `https://bench.vercount.one/gurt` and will invoke the write flow with deterministic benchmark-owned inputs instead of reading query parameters. The route should execute the full counter write path, including the UV update branch, so the benchmark reflects the heavier real write path instead of a lighter read-mostly variation.

**Alternatives considered:**
- Accept a caller-supplied `url` parameter: rejected because it would mix benchmark traffic into customer namespaces and make results non-repeatable.
- Treat benchmark requests as returning visitors only: rejected because it would skip the fully write-backed UV path and underrepresent the cost of a fresh write.

### Return the v2-style success envelope and disable caching

The benchmark route will return a v2-style success response with the current counter data so the response shape stays familiar and machine-readable. The route will also send no-store cache headers so CDN or intermediary caches do not collapse repeated benchmark requests into a static hit.

**Alternatives considered:**
- Return `204 No Content`: rejected because benchmark tools and manual checks benefit from a visible response payload.
- Return plain v1 JSON: rejected because the benchmark route is modeling the modern public counter surface, which is v2-oriented.

### Reuse the existing request protections and logging middleware

The benchmark route will continue to flow through the existing request logging middleware and rate-limit checks. This keeps the route observable, preserves abuse protection, and keeps the benchmark representative of the public service path instead of introducing a privileged fast lane.

**Alternatives considered:**
- Exempt `/bench/write` from rate limiting: rejected because it increases abuse risk and makes the benchmark less representative of the public service path.
- Add separate benchmark-only logging: rejected because the current request and counter event logging is already sufficient.

## Risks / Trade-offs

- [Synthetic benchmark traffic inflates benchmark namespace counters] → Keep all benchmark writes pinned to `bench.vercount.one/gurt` so no customer-owned domains are affected.
- [GET benchmark results are not a byte-for-byte reproduction of browser POST behavior] → Document that `/bench/write` is a probe-friendly proxy for the real write path, not a full browser simulation.
- [Rate limiting may affect aggressive probe schedules] → Preserve the existing limit for realism and safety, and document that the endpoint is intended for external latency probes rather than sustained load generation.
- [Cache misconfiguration could hide real latency] → Require explicit no-store headers in the benchmark response.

## Migration Plan

1. Add the benchmark route and implementation in the Go events service.
2. Update the public service metadata/documentation to include `/bench/write`.
3. Deploy the Go API and verify repeated benchmark requests hit application logs rather than cache-only responses.
4. Use itdog.cn or similar probes against `/bench/write` to establish baseline regional latency.

Rollback is straightforward: remove the route from the router and documentation. The synthetic benchmark Redis keys can remain because they are isolated from customer traffic and expire under the existing counter TTL rules.

## Open Questions

- None for artifact readiness. The fixed route, target URL, and benchmark intent are now defined well enough to implement.
