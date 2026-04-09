## ADDED Requirements

### Requirement: Repository uses a pnpm workspace layout

The repository SHALL use a pnpm workspace layout that places the current Next.js app under `/app` and workspace packages under `/packages/*`.

#### Scenario: Repository layout after migration

- **WHEN** the monorepo migration is complete
- **THEN** the current Next.js application SHALL live under `/app`
- **AND** the React package SHALL live under `/packages/react`
- **AND** the repository SHALL include workspace configuration that recognizes those package locations

### Requirement: Root workflows remain usable after the app move

The repository SHALL continue to provide a usable root-level development workflow after the Next.js app moves into `/app`.

#### Scenario: Developer runs root workflow commands

- **WHEN** a developer runs the repository's standard root commands for development, build, or lint
- **THEN** those commands SHALL delegate to the moved app package in `/app`
- **AND** the commands SHALL not require the app to remain at repo root

### Requirement: App-owned build assumptions move with the app

Files and scripts that are part of the web app's runtime or build process SHALL move with the app into `/app`.

#### Scenario: Web app build after migration

- **WHEN** the web app builds or starts from its new location
- **THEN** app-owned config, source, static assets, and generated client bundle paths SHALL resolve correctly from within `/app`
