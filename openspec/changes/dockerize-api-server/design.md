## Context

The Go API service in `apps/api` now owns the public `events.vercount.one` surface, but it is still run directly from source with local scripts and has no checked-in container/runtime or CI publishing workflow. The service also serves `/js`, which means the deployable artifact is not just a Go binary: it also depends on the built browser script from `apps/web/public/js/client.min.js`.

The repository currently has no `Dockerfile`, no Compose file, and no `.github/workflows/*` CI configuration. Root scripts already exist for `pnpm api:dev` and `pnpm api:build`, and those scripts explicitly build the browser asset before running or building the Go service. The user wants a simple setup that uses Docker Compose for local/runtime orchestration and GitHub Actions to build and publish the image to GHCR under `ghcr.io/<owner>/vercount-api`.

Constraints:
- The API image must include or otherwise reliably provide the `/js` asset the Go server serves.
- Compose should support the existing remote Redis backend by default, while also allowing an optional local Redis container through profiles.
- CI should build and publish the same Docker artifact the service will actually run.
- Image tagging must support `edge`, `latest`, and rolling version aliases, with the special rule that `v0` major aliases are never published.

## Goals / Non-Goals

**Goals:**
- Add a standard Docker image build for the Go API service.
- Add a root-level Compose workflow that can run the API service with either the existing remote Redis backend or an optional local Redis profile.
- Add a GitHub Actions workflow that builds and publishes `ghcr.io/<owner>/vercount-api`.
- Define a clear tag strategy: `edge` from `main`, `latest` from stable releases, stable aliases (`v1.2.3`, `v1.2`, `v1`), and prerelease-era aliases that allow exact/minor `v0.x.y` and `v0.x` tags but never `v0`.
- Keep the container and workflow setup simple and readable.

**Non-Goals:**
- Changing the Go API runtime behavior, Redis contract, or public API semantics.
- Replacing the current Redis backend as the default deployment store.
- Containerizing the Next.js web app as part of this change.
- Adding a broader CD system beyond image publishing to GHCR.

## Decisions

### 1. Build the API as a Docker image that includes the browser script
The deployable artifact will be a Docker image for `apps/api`, and the image build will include the built browser script that the service exposes at `/js`.

- **Why:** The API’s runtime contract includes serving `/js`, so CI must verify the complete runnable artifact rather than only a successful `go build`.
- **Alternative considered:** keep CI limited to `go build ./...`. Rejected because it would not validate the `/js` asset path or the real deploy artifact.
- **Alternative considered:** mount the built script at runtime instead of packaging it into the image. Rejected because it weakens artifact self-containment and makes deploy/runtime drift easier.

### 2. Keep Compose at the repository root with separate prod and local files
Compose will live at the repository root, using `compose.yaml` for the production-like GHCR image path and `compose-local.yaml` for local development.

- **Why:** The API image depends on a built asset from `apps/web`, and the root is the most natural place to express cross-app build context and developer entry points. Splitting prod and local Compose files also makes it obvious whether a developer is running the published image or a locally built image.
- **Alternative considered:** put Compose under `apps/api`. Rejected because it would make the cross-app asset build and repo-level workflows less straightforward.

### 3. Use separate Compose files for remote and local Redis paths
`compose.yaml` will run the API service against the existing external Redis backend through environment configuration, while `compose-local.yaml` will build the API locally and include a local Redis service for development.

- **Why:** This keeps the default behavior aligned with current production assumptions while still allowing an all-local stack when needed, without mixing the published image and the local build path in one Compose file.
- **Alternative considered:** always run local Redis in the default Compose file. Rejected because it would diverge from the production data path and add unnecessary services to the production-like workflow.
- **Alternative considered:** use a single Compose file with profiles. Rejected because it makes the production-like GHCR path and the local development path less obvious.

### 4. Publish the image to GHCR through GitHub Actions
GitHub Actions will build and publish `ghcr.io/<owner>/vercount-api`, with PR/build validation separated from publishing behavior.

- **Why:** The repository already lives on GitHub, there is currently no checked-in CI, and GHCR keeps image publishing close to the code and workflow permissions model.
- **Alternative considered:** manual image builds only. Rejected because the user explicitly wants CI auto-build and publish.
- **Alternative considered:** another registry first. Rejected because GHCR is the requested destination.

### 5. Use branch and release tags with a semver-aware exception for v0
The publishing workflow will follow this tag policy:

- `main` branch publishes `edge` (and optionally commit-specific tags for traceability).
- Stable release tags like `v1.2.3` publish `v1.2.3`, `v1.2`, `v1`, and `latest`.
- Pre-1.0 tags like `v0.1.2` publish `v0.1.2` and `v0.1`, but never `v0`.

- **Why:** This gives users a clean split between development (`edge`), stable current release (`latest`), rolling major/minor channels, and exact pins, while avoiding an overly broad `v0` contract.
- **Alternative considered:** move `latest` on every `main` build. Rejected because the user wants `latest` to represent stable releases, not edge builds.
- **Alternative considered:** publish `v0` as a rolling prerelease major tag. Rejected by explicit user requirement.

## Risks / Trade-offs

- **Image build now depends on both Node and Go toolchains** → Keep the Docker build explicit about the browser asset step and use the image build itself as the CI truth.
- **Compose can become ambiguous about which Redis backend is active** → Make the default remote-Redis path and the local Redis profile behavior explicit in config and docs.
- **GHCR tag policy can get tricky around prerelease tags** → Keep the rule narrow and explicit: `v0.x.y` and `v0.x` are allowed, `v0` is never published, and `latest` only moves on stable releases.
- **No existing CI conventions are checked in yet** → Keep the workflow small and focused on image build/publish rather than introducing unrelated checks at the same time.

## Migration Plan

1. Add a Docker build path for `apps/api` that produces a runnable API image including the browser script asset.
2. Add root Compose files and any supporting env/docs needed for the default remote Redis path and the local development path.
3. Add a GitHub Actions workflow that builds the image on repository events and publishes to GHCR on `main` and version tags.
4. Verify branch/release tags resolve to the intended GHCR tag set, including the `v0` exception.
5. Document how to run the API service through Compose and how the published image tags should be consumed.

Rollback:
- Stop using the Compose/GHCR workflow and continue running the API service through the existing direct local scripts.
- Remove or disable the GitHub Actions publish workflow if the published image behavior is incorrect.

## Open Questions

None.
