# apps/api

Minimal Go service for the public `events.vercount.one` surface.

## What it serves

- `/`
- `/healthz`
- `/js`
- `/log`
- `/api/v1/log`
- `/api/v2/log`

## Internal structure

The Go API stays intentionally small and is organized by runtime surface instead of generic web layers:

- `internal/app/runtime.go` - env/config loading and logger setup
- `internal/app/server.go` - dependency wiring and chi route registration
- `internal/api/public.go` - `/`, `/healthz`, and `/js`
- `internal/api/log.go` - `/log`, `/api/v1/log`, and `/api/v2/log`
- `internal/counter/*` - counter reads/writes and Redis-backed counting behavior

## Environment

For direct source runs from `apps/api`, copy `apps/api/.env.example` to `apps/api/.env` and set:

- `REDIS_URL` - direct Redis connection URL for the existing counter backend
- `PORT` - HTTP port (default `8080`)
- `SCRIPT_PATH` - optional override for the browser script path used for `/js`
- `DEBUG` - set to `true` for debug logs

## Run

From the repo root:

```bash
pnpm api:dev
```

This runs the API directly from source and reads `apps/api/.env` first, then falls back to the repo-root `.env` if present.

## Build

From the repo root:

```bash
pnpm api:build
```

## Docker image

Build the local API image from the repo root:

```bash
pnpm api:docker:build
```

The image build includes the built browser script for `/js`, and the API uses that bundled copy automatically inside the container.
`SCRIPT_PATH` remains available as an override if you ever need to point at a different file.

## Docker Compose

### Production-like compose

Copy `.env.example` to `.env` at the repo root, set `REDIS_URL`, then run:

```bash
pnpm api:compose
```

This uses `compose.yaml`, starts the published GHCR image from the repository root, and keeps using your existing Redis backend.
If you need to override the bundled `/js` file path for a one-off run, set `SCRIPT_PATH` in the shell before starting Compose.
Inside the container, the API always listens on `8080`; use `API_PORT` in the root `.env` to choose the host-side published port.

The production-like Compose file uses:

```text
ghcr.io/evannotfound/vercount-api:edge
```

### Local development compose

To run the API against a local Redis container instead:

```bash
pnpm api:compose:local
```

This uses `compose-local.yaml`, builds the API image locally, and wires the API container to `redis://redis:6379/0`.
It also defaults to the bundled in-image `/js` asset, with `SCRIPT_PATH` still available as a one-off shell override.
The root `.env` file can still provide values like `API_PORT` and `DEBUG` for this workflow.
Inside the container, the API still listens on `8080`; `API_PORT` only controls the host-side published port.

Stop the production-like Compose workflow from the repo root with:

```bash
pnpm api:compose:down
```

Stop the local Compose workflow with:

```bash
pnpm api:compose:local:down
```

## GHCR image publishing

GitHub Actions builds and publishes the API image to:

`ghcr.io/<owner>/vercount-api`

Published tags follow this policy:

- `edge` from the `main` branch
- `latest` from stable release tags only
- stable releases publish `v1.2.3`, `v1.2`, `v1`, and `latest`
- pre-1.0 releases publish `v0.1.2` and `v0.1`, but never `v0`

If GHCR creates the package with private visibility on first publish, update the package visibility in GitHub package settings.

## Cutover

1. Build the web app script so `apps/web/public/js/client.min.js` is up to date.
2. Deploy this service behind `events.vercount.one`.
3. Verify `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` on the new host.
4. Confirm the dashboard in `apps/web` still reads the shared Redis data correctly.

## Rollback

1. Point `events.vercount.one` back to the previous web deployment.
2. Keep the Redis backend unchanged so no counter data has to move.
3. Re-deploy the Go service only after the compatibility issue is fixed.
