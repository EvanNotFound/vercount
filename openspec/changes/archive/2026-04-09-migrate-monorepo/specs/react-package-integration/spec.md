## ADDED Requirements

### Requirement: React package is maintained inside the monorepo

The repository SHALL include the `@vercount/react` package under `/packages/react` as a first-class workspace package.

#### Scenario: React package exists in repository layout

- **WHEN** the monorepo migration is complete
- **THEN** the source for `@vercount/react` SHALL exist under `/packages/react`
- **AND** the package SHALL remain independently buildable and publishable

### Requirement: Web app can reference the local React package

The web app SHALL be able to depend on the colocated React package through workspace-aware package resolution.

#### Scenario: Web app imports the React package after migration

- **WHEN** code in the `/app` package imports `@vercount/react`
- **THEN** the repository workspace configuration SHALL resolve that import to the local `/packages/react` package during development and build

### Requirement: Docs reflect in-repo React package ownership

Repository documentation SHALL describe `@vercount/react` as part of this monorepo instead of pointing contributors to a separate source repository for maintenance.

#### Scenario: Reader looks up React package information

- **WHEN** a reader checks repository docs or in-app usage references about `@vercount/react`
- **THEN** those references SHALL reflect that the package is maintained inside this repository
