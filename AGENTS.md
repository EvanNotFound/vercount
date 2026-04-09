# AGENTS.md

## Commands

- Use `pnpm`; this is now a workspace repo with the Next.js app in `app/` and packages under `packages/*`.
- Root commands (`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm db:generate`, `pnpm db:migrate`) delegate to the web app in `app/`.
- The web app bundles `app/src/lib/client.js` into `app/public/js/client.min.js` during app scripts. Edit `app/src/lib/client.js`, not the built output.
- Shared browser-side request/cache/cookie logic livespackages/kage/core`.
- `pnpm react:build` runs the React package build in `package/react`.
- `pnpm core:build` runs the shared core package build in `package/core`.
- There is no test script and no checked-in `.github/workflows/*` CI config in the repo as checked in.
- Database commands run from `app/`; `app/drizzle.config.ts` reads `env.DATABASE_URL`, so these commands require env setup.

## Environment

- Trust `app/src/env.ts` and `app/.env.example` for env names. Required server vars are `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN`.
- `CLAUDE.md` still mentions `GITHUB_ID` and `GITHUB_SECRET`; those names are stale.

## Architecture

- Main public app is the Next.js App Router site under `app/src/app`; landing page is `app/src/app/page.tsx`.
- Dashboard UI lives under `app/src/app/dashboard/**`; `app/src/app/dashboard/layout.tsx` enforces auth with `getServerSession()` and redirects to `/auth/signin`.
- Public counter client source is `app/src/lib/client.js`. `app/next.config.js` rewrites `/js` to `/js/client.min.js` and `/log` to `/api/v1/log`.
- Counter APIs are `app/src/app/api/v1/log/route.ts` and `app/src/app/api/v2/log/route.ts`.
- `v1` is the legacy plain-JSON API; `v2` uses the standardized envelope from `app/src/lib/api-response.ts`.
- Counter state lives in Upstash Redis via `app/src/lib/kv.ts` and `app/src/utils/counter.ts`. Domain ownership/auth data lives in Postgres via Drizzle in `app/src/db/*`.
- `app/src/utils/counter.ts` lazilypackages/edis counters from Busuanzi on first access. Be careful not to bypass that initialization path when changing counter logic.
- Domain verification and analytics logic are centered in `app/src/lib/domain-service.ts` and the `/api/domains/*` routes.
- The React hook package lives in `package/react` and is consumed by the app via the workspace package name `vercount-react`.

## Behavioral Gotchas

- `app/next.config.js` also owns the permissive CORS headers for `/log`, `/api/v1/log`, and `/api/v2/log`; keep rewrites and headers aligned if you touch routing.
- Rate limiting is implemented in `app/src/lib/rate-limit.ts` as an 80 requests/minute sliding window per IP. Suspicious user-agent detection only logs warnings; IP blocking helpers exist but are not currently enabled.

## Repo-local OpenCode Context

- The repo includes OpenSpec/OpenCode scaffolding under `.opencode/command/*`, `.opencode/skills/*`, and `openspec/config.yaml`.
- `openspec/config.yaml` declares a `spec-driven` workflow. If the user asks for OpenSpec work, follow that flow instead of inventing a new artifact process.
