## Why

The Go API server now exists as the public `events.vercount.one` service, but it still lacks a standard container/runtime path and any checked-in CI pipeline. Adding Docker Compose and GHCR publishing makes the API deployable in a consistent way, ensures CI builds the same artifact that will actually run, and gives the project a stable public image tag strategy for both edge and release consumers.

## What Changes

- Add a Docker image build path for `apps/api` that includes the built browser script the API serves at `/js`.
- Add root-level Docker Compose support for the API service, with profiles that support the existing remote Redis setup by default and an optional local Redis container for development.
- Add a GitHub Actions workflow that builds and publishes the API image to `ghcr.io/<owner>/vercount-api`.
- Add image tagging rules for `edge`, `latest`, and version aliases from release tags, including the special rule that `v0` major aliases are never published while exact and minor `v0.x.y` / `v0.x` tags may be published.
- Update local docs and developer workflows so container usage and publish behavior are clear.

## Capabilities

### New Capabilities
- `api-container-delivery`: Define how the Go API server is built into a container image, run through Docker Compose, and published to GHCR with stable and edge image tags.

### Modified Capabilities
- `repository-workspace-layout`: Extend the root workflow expectations so the repository can run and build the API server through checked-in container workflows in addition to the existing app/package scripts.

## Impact

- Affected code: `apps/api`, root workspace scripts/config, new Docker/Compose files, and new GitHub Actions workflow files.
- Affected runtime: the public API service gains a standard container artifact and Compose-based runtime path.
- Affected integrations: GitHub Actions and GHCR publishing, including tag generation for `edge`, `latest`, and version aliases.
