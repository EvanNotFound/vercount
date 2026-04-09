## Why

Right now site UV counting stores per-visitor identity data in Redis. That data keeps growing with traffic, which makes Redis larger and harder to inspect even though UV is only a public-facing counter and users can already edit counter values manually.

## What Changes

- Change site UV counting from server-side Redis identity tracking to client-side cookie dedupe.
- Store site UV as a plain numeric counter instead of combining a Redis set with a baseline value.
- Increment site UV only when the browser does not already carry the site's UV cookie.
- Keep PV counting behavior unchanged.
- Keep dashboard counter editing working after the UV storage model changes.

## Capabilities

### New Capabilities

- `site-visitor-counting`: Defines how the public counter decides when a browser counts as a site UV and how that value is stored and returned.

### Modified Capabilities

None.

## Impact

- Affected code: `src/lib/client.js`, `src/utils/counter.ts`, `src/app/api/v1/log/route.ts`, `src/app/api/v2/log/route.ts`, `src/app/api/domains/analytics/route.ts`, and related domain analytics helpers.
- Affected storage: Redis UV keys move away from server-side per-visitor identity tracking to a plain site-level number.
- Affected behavior: the browser becomes responsible for remembering whether it has already been counted for a site.
