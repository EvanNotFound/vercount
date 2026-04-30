## 1. Redirect routing behavior

- [x] 1.1 Replace the Go API root JSON metadata behavior with permanent redirects for `GET /` and `HEAD /` to `https://www.vercount.one/`.
- [x] 1.2 Add explicit permanent redirects for selected old web-app paths on the events host: `/dashboard`, `/dashboard/analytics`, `/dashboard/domains`, and `/auth/signin`.
- [x] 1.3 Preserve query strings when redirecting selected human-facing paths to the canonical web host.
- [x] 1.4 Ensure `/healthz`, `/js`, `/bench/write`, `/log`, `/api/v1/log`, and `/api/v2/log` continue serving their existing events-host behavior without redirects.
- [x] 1.5 Ensure unsupported `/api/*` requests remain API-host misses and are not redirected to the canonical web host.

## 2. Tests and documentation

- [x] 2.1 Update Go API server tests that currently expect root metadata so they assert the new canonical redirect behavior instead.
- [x] 2.2 Add or update tests covering selected page redirects, query string preservation, and non-redirect behavior for supported machine endpoints.
- [x] 2.3 Update `apps/api/README.md` and related route listings to describe the root and selected page redirects while keeping machine endpoint documentation accurate.
- [x] 2.4 Run the relevant Go API verification commands, including `pnpm api:build` and the Go API test suite.
