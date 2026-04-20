## MODIFIED Requirements

### Requirement: Root workflows remain usable after the app move

The repository SHALL continue to provide a usable root-level development workflow after the Next.js app moves into `/apps/web`, the public events Go app lives under `/apps/api`, and the API service gains checked-in container workflows.

#### Scenario: Developer runs root workflow commands
- **WHEN** a developer runs the repository's standard root commands for development, build, start, lint, database tasks, or API container workflows
- **THEN** the web app workflows SHALL delegate to the web app package in `/apps/web`
- **AND** the API workflows SHALL remain addressable from the repository root
- **AND** the repository SHALL support checked-in root-level container workflows for the API service without requiring the developer to restructure the repo
