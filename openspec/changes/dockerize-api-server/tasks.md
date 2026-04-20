## 1. Add the API container build

- [x] 1.1 Add a Docker build for `apps/api` that produces a runnable API image from the repository.
- [x] 1.2 Ensure the image build includes the browser script asset needed for `/js` instead of relying on a host-local file path at runtime.
- [x] 1.3 Add any supporting ignore/config files needed to keep the image build context predictable and lightweight.

## 2. Add root-level Compose workflows for the API service

- [x] 2.1 Add root Compose files for the API service so production-like and local development workflows can both be run from the repository root.
- [x] 2.2 Configure the default Compose path to run the published API image against the existing external Redis backend through environment configuration.
- [x] 2.3 Add a local Compose workflow that can build the API locally and run it with a local Redis service.
- [x] 2.4 Add or update root scripts and local docs so the container workflows are discoverable from the repository root.

## 3. Add GHCR build and publish automation

- [x] 3.1 Add a GitHub Actions workflow that builds the API Docker image in CI.
- [x] 3.2 Configure the workflow to publish `ghcr.io/<owner>/vercount-api` on `main` and version tags.
- [x] 3.3 Implement the image tag policy so `main` publishes `edge`, stable releases publish `vX.Y.Z`, `vX.Y`, `vX`, and `latest`, and pre-1.0 releases publish exact/minor tags without ever publishing `v0`.

## 4. Verify and document the container delivery path

- [x] 4.1 Verify the Docker build, root Compose workflow, and local Redis profile behave as intended.
- [x] 4.2 Verify the GitHub Actions workflow configuration matches the intended GHCR publish behavior and tag policy.
- [x] 4.3 Update API/container documentation with usage, environment, publish behavior, and rollback guidance.
