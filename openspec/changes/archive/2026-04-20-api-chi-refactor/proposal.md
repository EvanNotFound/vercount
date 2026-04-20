## Why

The Go API in `apps/api` owns the public events surface, but its current HTTP structure is hard to scan and extend because routing, endpoint logic, response shaping, and helper behavior are all concentrated in `internal/app/server.go`. Adding a root endpoint and a Redis-backed readiness endpoint is a good moment to reorganize the API into a clearer small-service shape without changing the established counter contracts.

## What Changes

- Add a public root endpoint at `/` that returns a small JSON description of the service and its public routes.
- Add a public readiness endpoint at `/healthz` that reports whether the API process and its Redis dependency are ready to serve traffic.
- Refactor the Go API HTTP layer to use `chi` for route declaration and method-specific handlers.
- Reorganize the Go API into a small feature-oriented structure so public endpoints and log endpoints are easier to find and maintain.
- Preserve the existing `/js`, `/log`, `/api/v1/log`, and `/api/v2/log` behavior and response compatibility while the internal HTTP layer is refactored.

## Capabilities

### New Capabilities
- `public-service-meta-endpoints`: Define the root and readiness endpoints exposed by the public Go API service.

### Modified Capabilities
<!-- None. Existing public counter requirements stay behaviorally compatible; this change adds service metadata/probe endpoints and refactors the internal HTTP structure. -->

## Impact

- Affected code: `apps/api/main.go`, `apps/api/go.mod`, and the Go API files under `apps/api/internal/**`.
- Affected dependencies: the Go API adds `chi` as an HTTP routing dependency.
- Affected runtime: the public API service gains `/` and `/healthz` while keeping the existing public counter routes compatible.
