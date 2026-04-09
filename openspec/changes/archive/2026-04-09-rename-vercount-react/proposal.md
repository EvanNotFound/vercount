## Why

The React package is now part of the same monorepo as `@vercount/core`, but it still uses the old unscoped package name `vercount-react`. Since adoption is still low, this is the right time to rename it to `@vercount/react` and align the package family before the current name spreads further.

## What Changes

- Rename the published React package from `vercount-react` to `@vercount/react`.
- Update workspace dependencies, imports, docs, examples, and package metadata to use the new scoped name.
- Keep the package location at `/packages/react` and keep the package behavior/API the same apart from the install/import name.
- **BREAKING**: consumers must replace `vercount-react` with `@vercount/react` in install commands and imports.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `react-package-integration`: The React package naming contract changes from `vercount-react` to `@vercount/react` across workspace usage and user-facing docs.

## Impact

- Affected code: `packages/react/package.json`, `app/package.json`, app imports, docs/examples, and OpenSpec artifacts that reference the old package name.
- Affected systems: npm publishing, workspace dependency names, and package consumer migration messaging.
- No behavior change is intended for the React hook itself.
