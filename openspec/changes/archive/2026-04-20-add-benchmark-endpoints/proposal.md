## Why

Benchmark tools such as itdog.cn can easily probe public `GET` endpoints, but vercount's real browser write path currently uses `POST /api/v2/log` with a JSON body. Adding a dedicated benchmark route lets operators measure public counter write latency from real-world regions without inventing customer traffic or relying on a no-op endpoint that misses the actual Redis-backed hot path.

## What Changes

- Add a dedicated public `GET /bench/write` endpoint on the Go events service.
- Make the benchmark route execute the real counter write path against a fixed synthetic tracked URL: `https://bench.vercount.one/gurt`.
- Keep benchmark traffic isolated from customer domains while returning a stable public response suitable for external probe tools.
- Document the benchmark route as a public service surface alongside the existing public counter routes.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities
- `public-counter-service`: Extend the public events service contract with a dedicated benchmark write endpoint that triggers real counter writes against a fixed synthetic URL.

## Impact

- Affected code: `apps/api/internal/app/server.go`, `apps/api/internal/api/public.go` and/or `apps/api/internal/api/log.go`, and `apps/api/README.md`.
- Affected API surface: public Go events host gains `GET /bench/write` in addition to the existing `/log`, `/api/v1/log`, and `/api/v2/log` routes.
- Affected runtime behavior: benchmark requests will exercise the Redis-backed counter write flow using the synthetic benchmark namespace `bench.vercount.one/gurt`.
