# AGENTS.md

## Commands

- Use `pnpm`; this is now a workspace repo with the Next.js app in `apps/web/` and packages under `packages/*`.
- Root commands (`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm db:generate`, `pnpm db:migrate`) delegate to the web app in `apps/web/`.
- Use `pnpm api:dev` and `pnpm api:build` for the Go public events service in `apps/api/`.
- Use `pnpm api:docker:build`, `pnpm api:compose`, and `pnpm api:compose:local` for the checked-in API container workflows. `compose.yaml` is the production-like GHCR path and `compose-local.yaml` is the local development path.
- Compose workflows read repo-root `.env`; direct source runs in `apps/api` read `apps/api/.env` first and then fall back to the repo-root `.env`.
- The web app bundles `apps/web/src/lib/client.js` into `apps/web/public/js/client.min.js` during app scripts. Edit `apps/web/src/lib/client.js`, not the built output.
- Shared browser-side request/cache/cookie logic lives in `packages/core`.
- `pnpm react:build` runs the React package build in `packages/react`.
- `pnpm core:build` runs the shared core package build in `packages/core`.
- The repo includes a checked-in GitHub Actions workflow for building and publishing the API image to GHCR.
- Database commands run from `apps/web/`; `apps/web/drizzle.config.ts` reads `env.DATABASE_URL`, so these commands require env setup.

## Environment

- Trust `apps/web/src/env.ts` and `apps/web/.env.example` for web env names. Required web vars are `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN`.
- The Go service in `apps/api/` uses the existing Redis backend through a direct connection URL and serves the public `events.vercount.one` surface.
- `CLAUDE.md` still mentions `GITHUB_ID` and `GITHUB_SECRET`; those names are stale.

## Architecture

- Main web app is the Next.js App Router site under `apps/web/src/app`; landing page is `apps/web/src/app/page.tsx`.
- Dashboard UI lives under `apps/web/src/app/dashboard/**`; `apps/web/src/app/dashboard/layout.tsx` enforces auth with `getServerSession()` and redirects to `/auth/signin`.
- Public counter client source is `apps/web/src/lib/client.js`.
- The Go service under `apps/api/` owns the public `events.vercount.one` surface for `/js`, `/log`, `/api/v1/log`, and `/api/v2/log`.
- The Next.js app still contains the existing counter utilities and dashboard/domain flows under `apps/web/src/**`.
- `v1` is the legacy plain-JSON API; `v2` uses the standardized envelope from `apps/web/src/lib/api-response.ts`.
- Counter state lives in Upstash Redis via `apps/web/src/lib/kv.ts` and `apps/web/src/utils/counter.ts`. Domain ownership/auth data lives in Postgres via Drizzle in `apps/web/src/db/*`.
- `apps/web/src/utils/counter.ts` lazily initializes counters from Busuanzi on first access. Be careful not to bypass that initialization path when changing counter logic.
- Domain verification and analytics logic are centered in `apps/web/src/lib/domain-service.ts` and the `/api/domains/*` routes.
- The React hook package lives in `packages/react` and is consumed by the app via the workspace package name `@vercount/react`.

## Behavioral Gotchas

- `apps/web/next.config.js` still owns the old Next.js-side CORS and rewrite config for `/log`, `/api/v1/log`, and `/api/v2/log`, but the dedicated public host now lives in `apps/api/`.
- Rate limiting is implemented in `apps/web/src/lib/rate-limit.ts` as an 80 requests/minute sliding window per IP. Suspicious user-agent detection only logs warnings; IP blocking helpers exist but are not currently enabled.

## Repo-local OpenCode Context

- The repo includes OpenSpec/OpenCode scaffolding under `.opencode/command/*`, `.opencode/skills/*`, and `openspec/config.yaml`.
- `openspec/config.yaml` declares a `spec-driven` workflow. If the user asks for OpenSpec work, follow that flow instead of inventing a new artifact process.
