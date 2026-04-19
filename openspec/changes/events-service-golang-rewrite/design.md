## Context

Vercount currently serves its public events surface from the Next.js app in `/app`. That surface includes the browser script at `/js`, the legacy `/log` route, the public API routes at `/api/v1/log` and `/api/v2/log`, the Redis-backed counter logic in `app/src/utils/counter.ts`, and the Busuanzi bootstrap flow in `app/src/utils/busuanzi.ts`. The same app also owns auth, dashboard pages, domain management, and Postgres-backed flows that are not part of the high-volume public counter path.

The repository already uses a workspace layout with packages in `/packages/*`, but the app still lives at `/app`. This change introduces a second top-level app for the public events surface, so the current layout is no longer a good fit. The user also wants naming and organization to stay simple and readable, with straightforward app and function names rather than overly abstract or exhaustive naming.

Constraints:
- `events.vercount.one` must keep serving `/js`, `/log`, `/api/v1/log`, and `/api/v2/log`.
- The Go service must preserve the current Redis key contract, path normalization, PV/UV semantics, page inventory behavior, and Busuanzi first-touch import behavior.
- The existing Redis backend stays in place, but the Go service should use its direct connection URL rather than an HTTP Redis proxy.
- The authenticated web app should keep handling auth, dashboard, and domain workflows.

## Goals / Non-Goals

**Goals:**
- Move the public events surface to a dedicated Go service under `/apps/api`.
- Move the current Next.js app to `/apps/web` without breaking root developer workflows.
- Preserve the existing public script URL, legacy route compatibility, and v1/v2 response behavior.
- Keep synchronous first-touch Busuanzi import for migrating users while making Redis authoritative after initialization.
- Keep naming, package boundaries, and function naming simple and direct.

**Non-Goals:**
- Replacing the existing Redis backend.
- Reworking the authenticated dashboard or domain management flows.
- Changing public PV/UV product semantics.
- Redesigning the browser-side API contract or forcing existing embeds to change URLs.
- Adding a more complex migration subsystem such as prewarm jobs or per-key Busuanzi singleflight in this change.

## Decisions

### 1. Use `/apps/web` and `/apps/api` as the top-level app layout
The current Next.js app will move to `/apps/web`, and the new Go public events service will live under `/apps/api`.

- **Why:** This keeps the app layout simple, direct, and readable. `web` and `api` clearly describe the two app roles without overloading the broader term `server`.
- **Alternative considered:** keep the Next.js app in `/app` and add a special-case Go directory elsewhere. Rejected because it creates an inconsistent repo layout.
- **Alternative considered:** use `/apps/server` instead of `/apps/api`. Rejected because `api` is more direct for an HTTP-facing public service.

### 2. Split the public events host from the authenticated web app
The new Go service will own the `events.vercount.one` surface, including `/js`, `/log`, `/api/v1/log`, and `/api/v2/log`, while the Next.js app continues to own auth, dashboard, and domain management.

- **Why:** This isolates the hottest public traffic path from the heavier app runtime without forcing a full product migration.
- **Alternative considered:** move the API only and leave `/js` elsewhere. Rejected because keeping the whole public host together is simpler and preserves existing embed URLs cleanly.
- **Alternative considered:** move the entire product off Next.js/Vercel in one step. Rejected because it expands the scope far beyond the current cost problem.

### 3. Use the existing Redis backend through a direct Go connection
The Go service will connect directly to the existing Redis backend and preserve the current key names, expiration rules, page inventory records, and counter initialization behavior.

- **Why:** This keeps the storage contract stable while removing the serverless-oriented HTTP Redis access pattern from the new long-running service.
- **Alternative considered:** keep using an HTTP Redis proxy from Go. Rejected because it adds an unnecessary hop for a self-hosted service.
- **Alternative considered:** migrate to a new Redis deployment at the same time. Rejected because it would add operational and data-migration risk to a change that can otherwise reuse the current backend.

### 4. Preserve synchronous first-touch Busuanzi import
When the Go service sees a missing local counter, it will synchronously try Busuanzi once, persist the imported value or zero, and then continue from Redis on later requests. This change will not add per-key dedupe or a separate prewarm system.

- **Why:** Most users are migrating from Busuanzi, so keeping the existing first-touch import model preserves their current onboarding path.
- **Alternative considered:** remove Busuanzi import support. Rejected because migration compatibility is still important.
- **Alternative considered:** add request dedupe or a background import system now. Rejected for this change because the user prefers a simpler first cut.

### 5. Preserve route compatibility and tolerant client-facing behavior
The Go service will keep the current route split and response conventions: `/api/v1/log` stays plain JSON, `/api/v2/log` stays envelope-based, `/log` stays as the legacy-compatible path, invalid URLs keep returning client-safe zero-counter responses, and public routes remain cross-origin accessible.

- **Why:** Existing embeds and integrations already depend on these routes and tolerant response behaviors.
- **Alternative considered:** drop legacy routes and keep only `/api/v2/log`. Rejected because it raises migration risk for little immediate benefit.

### 6. Keep code organization and naming plain and human-readable
The Go service should use straightforward packages and function names that match the service responsibilities directly, instead of deeply layered abstractions or overly comprehensive names.

- **Why:** This is a focused service with a clear boundary, and simple naming makes the rewrite easier to maintain.
- **Alternative considered:** introduce a more abstracted internal architecture up front. Rejected because it adds ceremony before the service proves its shape.

## Risks / Trade-offs

- **Mixed Redis access paths (Next via REST, Go via direct connection)** → Preserve the same key contract and expiration behavior so both runtimes can safely share the backend.
- **Behavior drift during the rewrite** → Treat path normalization, page inventory updates, invalid-URL handling, and response shapes as compatibility requirements, not implementation details.
- **First-touch Busuanzi requests can still be slower than warm Redis reads** → Keep the import path best-effort, short-lived, and limited to missing counters only.
- **Repo move can disrupt existing root scripts or deploy assumptions** → Update workspace and root workflow configuration as part of the same change instead of leaving partial path assumptions behind.

## Migration Plan

1. Move the current Next.js app from `/app` to `/apps/web` and update workspace/root command wiring.
2. Create the Go public events service in `/apps/api` with simple, direct package naming.
3. Port the public route surface, CORS behavior, and script serving to the Go service while keeping the existing URLs.
4. Port the Redis-backed counter logic and Busuanzi first-touch initialization while preserving the current key contract.
5. Point `events.vercount.one` at the Go service and verify `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` continue to work.
6. Keep the authenticated web app on its existing runtime and verify dashboard/domain flows still read the shared Redis data correctly.

Rollback:
- Point `events.vercount.one` back to the Next.js app.
- Restore the previous app layout if the repo move needs to be reverted as part of the same release window.

## Open Questions

None.
