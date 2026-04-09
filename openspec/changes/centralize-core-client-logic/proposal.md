## Why

The browser-side counter logic now lives in two places: the embedded client in `app/src/lib/client.js` and the React hook in `packages/react/src/hooks/use-vercount.ts`. They duplicate the same API call, response parsing, cache behavior, and UV cookie logic, which makes future changes easy to drift.

## What Changes

- Extract the shared browser-side counter logic into a new workspace package at `/packages/core`.
- Move common logic such as request execution, response parsing, cache helpers, and UV cookie handling into the shared core package.
- Update the embedded client in `/app` to use the shared core package while keeping its DOM-specific behavior in place.
- Update `vercount-react` to use the shared core package while keeping its React hook API in place.
- Keep the public counter API contract and current visible counter behavior unchanged.

## Capabilities

### New Capabilities
- `browser-counter-core`: Shared browser-side logic for fetching, caching, and deduping counter data across client consumers.

### Modified Capabilities
- `react-package-integration`: The React package now depends on the shared in-repo core package instead of carrying its own duplicated browser logic.

## Impact

- Affected code: `app/src/lib/client.js`, `packages/react/src/hooks/use-vercount.ts`, new `/packages/core` package files, workspace package metadata, and related docs.
- Affected systems: workspace dependency graph, React package build flow, and the embedded script build flow.
- No server API changes are intended; this is a browser-side architecture cleanup.
