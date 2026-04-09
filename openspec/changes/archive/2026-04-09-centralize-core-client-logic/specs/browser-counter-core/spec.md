## ADDED Requirements

### Requirement: Shared browser counter core package exists
The repository SHALL provide a shared browser-side counter core package under `/packages/core` that can be consumed by multiple browser-facing clients.

#### Scenario: Workspace contains shared browser core
- **WHEN** the change is implemented
- **THEN** the repository SHALL contain a workspace package at `/packages/core`
- **AND** that package SHALL own the shared browser-side counter logic instead of duplicating it in each consumer

### Requirement: Shared core owns common request, cache, and cookie logic
The shared browser counter core SHALL own the common browser-side logic for fetching counter data, parsing the response, handling the UV cookie, and reading/writing cached counter data.

#### Scenario: Consumer requests fresh counter data
- **WHEN** a browser-side consumer asks the shared core for counter data
- **THEN** the shared core SHALL perform the request using the current browser URL
- **AND** the shared core SHALL apply the existing UV cookie behavior and response parsing behavior

#### Scenario: Consumer uses cached counter data
- **WHEN** a browser-side consumer reads or writes cached counter data
- **THEN** the shared core SHALL provide the cache read/write behavior used by both the embed client and React hook

### Requirement: Shared core stays browser-specific but framework-agnostic
The shared browser counter core SHALL remain browser-specific while not depending on React or embedded DOM rendering behavior.

#### Scenario: Shared core is used by different browser consumers
- **WHEN** the embedded client and the React package consume the shared core
- **THEN** the shared core SHALL NOT require React hook APIs
- **AND** the shared core SHALL NOT require DOM counter-container rendering behavior
