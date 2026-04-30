## Why

Search engines still index the public Go events host as if it were the main Vercount web page because the host previously served the Next.js site and now returns API metadata at `/`. The public events host should keep serving machine endpoints, while human-facing and previously indexed page URLs should move users and crawlers to the canonical `https://www.vercount.one` site.

## What Changes

- Change `GET /` on the public events host from a JSON metadata response to a redirect to `https://www.vercount.one/`.
- Redirect selected human-facing page paths that may have been indexed on the events host to the same path on the canonical web host.
- Keep public machine endpoints on the events host available and non-redirecting, including `/healthz`, `/js`, `/bench/write`, `/log`, `/api/v1/log`, and `/api/v2/log`.
- Keep unknown API-style paths as API-host misses rather than redirecting them to the web app.
- Document the new split between canonical web pages and public events API endpoints.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `public-service-meta-endpoints`: replace the root JSON metadata behavior with canonical redirects for human-facing events-host pages while preserving Redis-backed readiness behavior.

## Impact

- Affected code: Go API router and public handler code under `apps/api/internal/app/server.go` and `apps/api/internal/api/public.go`.
- Affected documentation: `apps/api/README.md` and any route listing that currently describes `/` as JSON metadata.
- Public API compatibility: counter and script endpoints must continue to serve existing clients without redirects.
- SEO behavior: crawlers and browser users requesting selected page URLs on `events.vercount.one` should be sent to `www.vercount.one`.
