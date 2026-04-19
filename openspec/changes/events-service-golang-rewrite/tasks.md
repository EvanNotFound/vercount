## 1. Move the web app into the new workspace layout

- [x] 1.1 Move the current Next.js app from `/app` to `/apps/web` and update workspace configuration to recognize the new app path.
- [x] 1.2 Update the repository's root scripts and developer workflows so the existing web-focused commands still work from the repo root after the move.
- [x] 1.3 Update app-owned path assumptions, generated client bundle paths, and related docs so the web app still builds and runs correctly from `/apps/web`.

## 2. Scaffold the Go public events service

- [x] 2.1 Create the new Go app under `/apps/api` with simple, direct package and file naming.
- [x] 2.2 Add the Go service's configuration for HTTP serving, direct Redis access, logging, and environment loading against the existing Redis backend.
- [x] 2.3 Add the basic public route structure for `/js`, `/log`, `/api/v1/log`, `/api/v2/log`, and `OPTIONS` handling.

## 3. Port the public counter behavior to Go

- [x] 3.1 Port the current URL normalization, Redis key usage, TTL behavior, and page inventory updates into the Go service while preserving the existing storage contract.
- [x] 3.2 Port the synchronous first-touch Busuanzi initialization flow for site PV, page PV, and site UV into the Go service.
- [x] 3.3 Implement the v1, v2, and legacy `/log` handlers so they preserve the current read/write behavior, response shapes, invalid-URL handling, and permissive CORS behavior.
- [x] 3.4 Serve the public browser counter script from `/js` in the Go service while keeping the existing embed URL and cache behavior.

## 4. Integrate and verify the split deployment

- [x] 4.1 Update shared references, build wiring, and any affected package paths so the moved web app and new API app work together in the monorepo.
- [x] 4.2 Verify the Go service and the Next.js app can both use the shared Redis data correctly, including dashboard-facing page inventory and counter reads.
- [x] 4.3 Verify the public compatibility surface and root workflows end-to-end, then document the `events.vercount.one` cutover and rollback steps.
