# AGENTS.md

## Commands

- Use `pnpm`; this is a single-package repo with `pnpm-lock.yaml` at the root.
- `pnpm dev`, `pnpm build`, and `pnpm start` all run Terser first to regenerate `public/js/client.min.js` from `src/lib/client.js`. Edit `src/lib/client.js`, not the minified output.
- `pnpm lint` is the only built-in verification script.
- There is no `test` script, no checked-in test files, and no `.github/workflows/*` CI config in the repo as checked in.
- Database commands: `pnpm db:generate` and `pnpm db:migrate`. `drizzle.config.ts` reads `env.DATABASE_URL`, so these commands require env setup.

## Environment

- Trust `src/env.ts` and `.env.example` for env names. Required server vars are `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN`.
- `CLAUDE.md` still mentions `GITHUB_ID` and `GITHUB_SECRET`; those names are stale.

## Architecture

- Main public app is the Next.js App Router site under `src/app`; landing page is `src/app/page.tsx`.
- Dashboard UI lives under `src/app/dashboard/**`; `src/app/dashboard/layout.tsx` enforces auth with `getServerSession()` and redirects to `/auth/signin`.
- Public counter client source is `src/lib/client.js`. `next.config.js` rewrites `/js` to `/js/client.min.js` and `/log` to `/api/v1/log`.
- Counter APIs are `src/app/api/v1/log/route.ts` and `src/app/api/v2/log/route.ts`.
- `v1` is the legacy plain-JSON API; `v2` uses the standardized envelope from `src/lib/api-response.ts`.
- Counter state lives in Upstash Redis via `src/lib/kv.ts` and `src/utils/counter.ts`. Domain ownership/auth data lives in Postgres via Drizzle in `src/db/*`.
- `src/utils/counter.ts` lazily seeds Redis counters from Busuanzi on first access. Be careful not to bypass that initialization path when changing counter logic.
- Domain verification and analytics logic are centered in `src/lib/domain-service.ts` and the `/api/domains/*` routes.

## Behavioral Gotchas

- `next.config.js` also owns the permissive CORS headers for `/log`, `/api/v1/log`, and `/api/v2/log`; keep rewrites and headers aligned if you touch routing.
- Rate limiting is implemented in `src/lib/rate-limit.ts` as an 80 requests/minute sliding window per IP. Suspicious user-agent detection only logs warnings; IP blocking helpers exist but are not currently enabled.

## Repo-local OpenCode Context

- The repo includes OpenSpec/OpenCode scaffolding under `.opencode/command/*`, `.opencode/skills/*`, and `openspec/config.yaml`.
- `openspec/config.yaml` declares a `spec-driven` workflow. If the user asks for OpenSpec work, follow that flow instead of inventing a new artifact process.
