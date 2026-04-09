## Why

The current repo is still a single-package Next.js app, while the React package lived in a separate GitHub repository even though it belongs to the same product surface and is already referenced by this project's docs and components. Keeping them separate increases drift in docs, package behavior, and release coordination.

## What Changes

- Convert this repository from a single-package app into a pnpm workspace monorepo.
- Move the current Next.js app into `/app`.
- Add the React package under `/packages/react` and bring the existing React package codebase into this repository.
- Update root scripts, config, and path assumptions so development, build, lint, and publish flows still work after the move.
- Update docs and in-repo references so they point to the new monorepo layout instead of an external React-package repository.
- **BREAKING**: repository layout changes from a flat single-package app to a workspace-based monorepo.

## Capabilities

### New Capabilities

- `repository-workspace-layout`: Defines the monorepo workspace structure, package locations, and shared root workflow expectations.
- `react-package-integration`: Defines how the React package lives and is maintained inside this repository.

### Modified Capabilities

None.

## Impact

- Affected code: root `package.json`, lockfile/workspace config, Next.js app paths, build scripts, lint config, TypeScript config, README/docs, and any file paths that assume the app lives at repo root.
- Affected systems: local development workflow, Vercel/build assumptions, React package publishing workflow, and repository documentation.
- External dependency: existing `git@github.com:EvanNotFound/vercount-react.git` package contents need to be brought into `/packages/react`.
