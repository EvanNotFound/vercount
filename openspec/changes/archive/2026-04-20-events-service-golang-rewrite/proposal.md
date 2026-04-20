## Why

The public counter traffic on `events.vercount.one` is the hottest part of the product, and running that path inside the current Next.js/Vercel setup is costing more than it should. Splitting the public events surface into a small Go service lets the project keep the existing counter behavior and Busuanzi migration flow while moving the expensive hot path onto a simpler deployment target.

## What Changes

- Add a dedicated Go public counter service under `/apps/api` to serve the `events.vercount.one` surface.
- Move the current Next.js app from `/app` to `/apps/web` and update the workspace layout and root workflows to match.
- Keep the public script and compatibility routes available at `/js`, `/log`, `/api/v1/log`, and `/api/v2/log`.
- Preserve the current public counter behavior, including direct Redis-backed counters, synchronous first-touch Busuanzi initialization, and the existing v1/v2 response shapes.
- Keep the authenticated dashboard, domain management, and other web app features in the Next.js app while only moving the public events surface to Go.

## Capabilities

### New Capabilities
- `public-counter-service`: Define the dedicated public service that owns the `events.vercount.one` script, compatibility routes, CORS behavior, and public counter API surface.

### Modified Capabilities
- `repository-workspace-layout`: Change the workspace layout so the main Next.js app lives under `/apps/web`, the new Go service lives under `/apps/api`, and root workflows continue to work from the repository root.

## Impact

- Affected code: root workspace config, root scripts, the current `/app` Next.js package, the public counter client bundle path, and a new Go app under `/apps/api`.
- Affected runtime: `events.vercount.one` moves from the Next.js app to a dedicated Go service, while the main web app keeps handling auth, dashboard, and domain management.
- Affected integrations: the Go service will use the existing Redis backend through a direct connection and must preserve the current Redis key contract, Busuanzi initialization flow, and public API compatibility.
