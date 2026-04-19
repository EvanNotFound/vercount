# apps/api

Minimal Go service for the public `events.vercount.one` surface.

## What it serves

- `/js`
- `/log`
- `/api/v1/log`
- `/api/v2/log`

## Environment

Copy `.env.example` to `.env` and set:

- `REDIS_URL` - direct Redis connection URL for the existing counter backend
- `PORT` - HTTP port (default `8080`)
- `SCRIPT_PATH` - path to the built browser script (default `../web/public/js/client.min.js`)
- `DEBUG` - set to `true` for debug logs

## Run

From the repo root:

```bash
pnpm api:dev
```

## Build

From the repo root:

```bash
pnpm api:build
```

## Cutover

1. Build the web app script so `apps/web/public/js/client.min.js` is up to date.
2. Deploy this service behind `events.vercount.one`.
3. Verify `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` on the new host.
4. Confirm the dashboard in `apps/web` still reads the shared Redis data correctly.

## Rollback

1. Point `events.vercount.one` back to the previous web deployment.
2. Keep the Redis backend unchanged so no counter data has to move.
3. Re-deploy the Go service only after the compatibility issue is fixed.
