## Context

This repository currently assumes a flat Next.js app at the repo root. Root scripts build and lint that single package directly, TypeScript path aliases assume `./src/*`, and build-specific files such as `next.config.js`, `eslint.config.mjs`, `public/js/client.min.js`, and `src/lib/client.js` all live under the same root package. At the same time, the project already treats `vercount-react` as part of the product surface: docs mention it directly, `src/components/pageview.tsx` imports `useVercount` from `vercount-react`, and the website includes usage examples for the package.

The migration needs to convert the repo into a pnpm workspace while keeping the current web app working and bringing in the external React package. The user wants a simple layout with the current app under `/app` and the React package under `/package/react`.

Constraints:

- The Next.js app must keep serving the current product after being moved.
- Existing build behavior around `src/lib/client.js` and `public/js/client.min.js` must continue to work.
- The React package should remain publishable as `vercount-react`.
- The monorepo migration is primarily a repository/layout change, not a product behavior change.

## Goals / Non-Goals

**Goals:**

- Convert the repo into a pnpm workspace monorepo.
- Move the current Next.js app into `/app` with working dev/build/lint scripts.
- Add the existing `vercount-react` package under `/package/react`.
- Update docs, imports, and workspace references so the React package is maintained in this repo.
- Keep the public web app and React package build/publish workflows understandable.

**Non-Goals:**

- Changing analytics behavior, APIs, or product features.
- Extracting shared code into additional packages during this migration.
- Reworking deployment topology beyond what is needed for the new layout.
- Publishing a second new package name for the React package.

## Decisions

### 1. Use a pnpm workspace with `/app` and `/package/react`

The repository will become a workspace-based monorepo with the Next.js app moved into `/app` and the React package added under `/package/react`.

- **Why:** This matches the desired layout while keeping the repo simple.
- **Alternative considered:** `/apps/web` and `/packages/react`. Rejected because the user explicitly prefers `/app` without the extra `web` level.
- **Alternative considered:** keep separate repositories. Rejected because docs, usage, and release coordination already span both codebases.

### 2. Keep the web app self-contained inside `/app`

Files that currently assume the app lives at repo root should move with the app so the app remains internally coherent.

- **Why:** This minimizes cross-workspace coupling and preserves current build assumptions for `next.config.js`, `src/lib/client.js`, `public/js/client.min.js`, `tsconfig.json`, and related configs.
- **Alternative considered:** leave major config files at repo root while only moving source files. Rejected because it creates confusing split ownership between workspace root and app package.

### 3. Keep `vercount-react` as a standalone publishable package inside the monorepo

`/package/react` should keep its own package metadata and build flow so it can still be published as `vercount-react`.

- **Why:** The package already exists independently and users consume it by package name.
- **Alternative considered:** fold the React code directly into the app. Rejected because a publishable package and a hosted app have different lifecycle needs.

### 4. Update root scripts to delegate into workspace packages

The root package should become a workspace orchestrator that delegates common commands to the app package, and later can add package-specific commands as needed.

- **Why:** The repo currently has root-level scripts only because it is a single package. After migration, root scripts should still provide a convenient entry point without pretending the root is the web app.
- **Alternative considered:** remove root scripts entirely. Rejected because it makes common development workflows less convenient.

### 5. Bring `vercount-react` into the repo as imported source, then normalize docs and references

The migration should focus first on colocating the package in the repo and updating references to point to the in-repo package location rather than the external repo.

- **Why:** Colocation is the main architectural win. History-preservation details can be handled pragmatically during implementation.
- **Alternative considered:** preserve full git history during the first migration step. Deferred because it adds complexity that is not necessary to define the workspace shape.

## Risks / Trade-offs

- **Path assumption breakage in build/dev scripts** → Move app-owned config and scripts with the app and verify delegated root commands.
- **Vercel or deployment config drift after moving the app into `/app`** → Explicitly review deployment-related files and document any required project root change.
- **Workspace import/linking issues between app and `/package/react`** → Use pnpm workspace wiring and verify the app can consume the local package.
- **Docs may become inconsistent during transition** → Update all obvious references to the external `vercount-react` repo as part of the migration.
- **Monorepo adds some tooling complexity** → Keep the workspace minimal with one app and one package only.

## Migration Plan

1. Add pnpm workspace configuration at the repo root.
2. Move the current Next.js app and its app-owned config into `/app`.
3. Update root scripts to delegate to `/app` for web app workflows.
4. Bring the `vercount-react` package into `/package/react`.
5. Wire workspace dependencies/imports so the app can use the local React package.
6. Update docs, references, and any deployment/config assumptions.
7. Run lint/build verification in the new workspace layout.

Rollback:

- Move the app files back to repo root.
- Remove workspace configuration.
- Remove or re-externalize `/package/react`.
- Restore root scripts/config to the single-package shape.

## Open Questions

None.
