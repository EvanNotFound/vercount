## 1. Route and handler wiring

- [x] 1.1 Register `GET /bench/write` on the Go events service router and expose it in the public route metadata where appropriate.
- [x] 1.2 Add a benchmark write handler that uses the fixed target URL `https://bench.vercount.one/gurt` and reuses the existing counter write orchestration.

## 2. Response and protection behavior

- [x] 2.1 Make the benchmark handler return the v2-style success and error response semantics, including rate-limit behavior consistent with the existing v2 public counter route.
- [x] 2.2 Add response headers that prevent benchmark responses from being cached while preserving the existing request logging and public-access behavior.

## 3. Documentation and verification

- [x] 3.1 Update API documentation to list `/bench/write` as a supported public route and describe its fixed synthetic benchmark target.
- [x] 3.2 Verify the new route returns `200` with counter data on success, writes only to the `bench.vercount.one/gurt` namespace, and produces the expected v2-style error on rate limiting.
