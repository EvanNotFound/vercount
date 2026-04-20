## MODIFIED Requirements

### Requirement: Repository uses a pnpm workspace layout

The repository SHALL use a pnpm workspace layout that places the current Next.js app under `/apps/web`, the public events Go app under `/apps/api`, and workspace packages under `/packages/*`.

#### Scenario: Repository layout after migration
- **WHEN** the repository layout migration is complete
- **THEN** the current Next.js application SHALL live under `/apps/web`
- **AND** the public events Go app SHALL live under `/apps/api`
- **AND** the React package SHALL live under `/packages/react`
- **AND** the repository SHALL include workspace configuration that recognizes those package locations

### Requirement: Root workflows remain usable after the app move

The repository SHALL continue to provide a usable root-level development workflow after the Next.js app moves into `/apps/web` and the public events Go app is added under `/apps/api`.

#### Scenario: Developer runs root workflow commands
- **WHEN** a developer runs the repository's standard root commands for development, build, start, lint, or workspace orchestration
- **THEN** those workflows SHALL continue to delegate the web app flows to `/apps/web`
- **AND** the repository SHALL NOT require the web app to remain at `/app`
- **AND** the workspace SHALL make the public events Go app addressable from the repository root

### Requirement: App-owned build assumptions move with the app

Files and scripts that are part of an app's runtime or build process SHALL live with that app under its app directory.

#### Scenario: Web app build after migration
- **WHEN** the web app builds or starts from its new location
- **THEN** the web app's config, source, static assets, and generated client bundle paths SHALL resolve correctly from within `/apps/web`

#### Scenario: Public events app build after migration
- **WHEN** the public events Go app builds or starts from its new location
- **THEN** that app's source, config, and runtime assets SHALL resolve correctly from within `/apps/api`
