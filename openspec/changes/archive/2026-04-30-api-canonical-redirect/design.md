## Context

The public events service now lives in `apps/api` and serves the machine-facing `events.vercount.one` surface for the browser script, counter writes/reads, readiness checks, and benchmarks. That host previously served the Next.js web app, so search engines may still treat routes on the events host as human-facing Vercount pages.

The current Go root handler returns JSON metadata at `/`, and the current `public-service-meta-endpoints` spec requires that behavior. The canonical web experience is now `https://www.vercount.one`, so the events host should stop acting like an indexable page origin while preserving its public API contract.

## Goals / Non-Goals

**Goals:**

- Send browser and crawler traffic for the events-host root to `https://www.vercount.one/`.
- Redirect known old web-app page paths from the events host to the same path on `https://www.vercount.one`.
- Keep `/healthz`, `/js`, `/bench/write`, `/log`, `/api/v1/log`, and `/api/v2/log` available on the events host without redirects.
- Keep unknown API-style paths on the events host as misses instead of redirecting them to the web app.
- Update docs so the events host is described as an API/script host, not a main website host.

**Non-Goals:**

- Do not change counter semantics, response shapes, CORS behavior, rate limiting, or Redis key usage.
- Do not move the browser counter script or public counter endpoints to the web app.
- Do not introduce a broad catch-all redirect for every unknown events-host path.
- Do not change the web app routing implementation beyond documentation or canonical references needed for this behavior.

## Decisions

### Use permanent redirects for known human-facing routes

`GET` and `HEAD` requests for `/` and selected old web-app paths should return a permanent redirect to the canonical web host. This directly addresses search indexing and avoids continuing to expose API metadata as the apparent homepage.

Alternatives considered:

- Keep root JSON and add `X-Robots-Tag: noindex`: lower product risk, but users and search results can still land on a JSON response instead of the website.
- Redirect only `/`: simpler, but does not clean up old indexed Next.js page paths that may still exist under the events host.
- Redirect all unknown paths: broader cleanup, but it can hide accidental API URL mistakes and make the events host less predictable for API clients.

### Keep the redirect allowlist explicit

The redirect set should include `/` plus the known web-app page surfaces that may have existed when the host served Next.js, currently `/dashboard`, `/dashboard/analytics`, `/dashboard/domains`, and `/auth/signin`. Redirect targets should preserve the path and query string so bookmarked or indexed URLs land on the equivalent canonical page.

An explicit list keeps API-host behavior predictable and avoids turning unrelated unknown paths into web redirects. Future page paths can be added intentionally if they are found in search results or logs.

### Preserve machine endpoints exactly

The existing public events machine endpoints should remain registered before or alongside redirect handling so they continue to return their current API/script responses. Unknown `/api/*` paths should not redirect to the web app because API consumers benefit from clear misses on the API host.

### Keep canonical host fixed and simple

Use `https://www.vercount.one` as the canonical redirect base. A compile-time constant is enough for the current product need and avoids introducing new environment configuration for a stable public site URL.

## Risks / Trade-offs

- **Risk:** Permanent redirects are sticky in browsers and crawlers. → **Mitigation:** Limit redirects to the root and known human-facing paths, leaving machine endpoints untouched.
- **Risk:** The old JSON root may have been used by ad-hoc health checks. → **Mitigation:** `/healthz` remains the supported readiness endpoint and documentation should point monitors there.
- **Risk:** Some old indexed pages may not be covered by the initial allowlist. → **Mitigation:** Keep the list easy to extend based on logs or search console findings.
- **Risk:** Dashboard redirects may send unauthenticated users to protected web routes. → **Mitigation:** The canonical web app already owns auth redirects for dashboard pages, so the events host should only move traffic to the correct origin.

## Migration Plan

1. Update the Go public handler/router so root and selected human-facing paths redirect to `https://www.vercount.one`.
2. Verify the preserved machine endpoints still serve their existing responses without redirects.
3. Update API documentation and route listings to describe `/` as a canonical redirect and `/healthz` as the machine-readable readiness endpoint.
4. Deploy the Go API service and check search-console or access logs for additional old page paths that should be added later.

Rollback is straightforward: restore the root metadata handler and remove the selected page redirects if the redirect behavior causes unexpected operational issues.

## Open Questions

- Should the web app metadata consistently use `https://www.vercount.one` as its metadata base if `www` is the canonical host? This is related SEO cleanup but can be handled separately if desired.
