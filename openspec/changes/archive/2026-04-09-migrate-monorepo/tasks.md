## 1. Workspace foundation

- [x] 1.1 Add pnpm workspace configuration for `/app` and `/packages/*`.
- [x] 1.2 Convert the root `package.json` into a workspace root that delegates web app workflows into `/app`.
- [x] 1.3 Update root lockfile/config assumptions needed for the workspace layout.

## 2. Move the current web app into `/app`

- [x] 2.1 Move the current Next.js app source, static assets, and app-owned config into `/app`.
- [x] 2.2 Update app-local build paths so `src/lib/client.js` still compiles to `public/js/client.min.js` from inside `/app`.
- [x] 2.3 Update TypeScript, lint, and Next.js config so the moved app builds and runs from `/app`.

## 3. Bring in the React package

- [x] 3.1 Add the existing React package under `/packages/react` with its package metadata and source.
- [x] 3.2 Wire workspace dependency resolution so the app can import the local React package.
- [x] 3.3 Verify the React package remains independently buildable/publishable in the monorepo layout.

## 4. Docs and workflow cleanup

- [x] 4.1 Update repository docs and in-app references to describe the React package as maintained in this monorepo.
- [x] 4.2 Review deployment and environment assumptions affected by moving the app into `/app`.
- [x] 4.3 Run lint/build verification for the migrated workspace layout and fix issues introduced by the move.
