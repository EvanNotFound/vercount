## Purpose

Define how the Go API service is packaged as a container image, run through Docker Compose, and published to GHCR with stable and edge tags.

## Requirements

### Requirement: API image SHALL package the public API runtime artifact

The system SHALL provide a Docker image for the Go API service that can run the public API server and serve the browser script exposed at `/js`.

#### Scenario: Image build includes API runtime and browser script

- **WHEN** the API image is built from the repository
- **THEN** the resulting image SHALL contain the Go API runtime
- **AND** the image SHALL contain the browser script asset required for `/js`

### Requirement: Compose SHALL run the API service from the checked-in container workflow

The system SHALL provide a checked-in Docker Compose workflow that can run the Go API service from the repository.

#### Scenario: Production-like compose file uses external Redis configuration

- **WHEN** a developer runs the default Compose workflow for the API service
- **THEN** Compose SHALL start the API service container
- **AND** the default workflow SHALL support using the existing external Redis backend through environment configuration

#### Scenario: Local compose file enables local Redis

- **WHEN** a developer runs the local Compose workflow for the API service
- **THEN** Compose SHALL make a local Redis service available for the API stack
- **AND** the API service SHALL be runnable against that local Redis path

### Requirement: CI SHALL build and publish the API image to GHCR

The system SHALL provide a GitHub Actions workflow that builds the API image and publishes it to `ghcr.io/<owner>/vercount-api`.

#### Scenario: Main branch publishes edge image

- **WHEN** changes are pushed to the repository's `main` branch
- **THEN** the workflow SHALL build the API image
- **AND** the workflow SHALL publish an `edge` tag to GHCR

#### Scenario: Stable release tag publishes stable aliases

- **WHEN** a stable semver tag like `v1.2.3` is pushed
- **THEN** the workflow SHALL publish `v1.2.3`
- **AND** the workflow SHALL publish `v1.2`
- **AND** the workflow SHALL publish `v1`
- **AND** the workflow SHALL publish `latest`

#### Scenario: Pre-1.0 release tag avoids v0 major alias

- **WHEN** a pre-1.0 semver tag like `v0.1.2` is pushed
- **THEN** the workflow SHALL publish `v0.1.2`
- **AND** the workflow SHALL publish `v0.1`
- **AND** the workflow SHALL NOT publish `v0`

### Requirement: Published image tags SHALL separate edge and stable channels

The system SHALL keep edge and stable image channels distinct.

#### Scenario: Main branch does not move latest

- **WHEN** the `main` branch workflow publishes an `edge` image
- **THEN** that workflow SHALL NOT move the `latest` tag

#### Scenario: Stable release moves latest

- **WHEN** a stable release tag is published
- **THEN** the workflow SHALL update `latest` to the corresponding stable image
