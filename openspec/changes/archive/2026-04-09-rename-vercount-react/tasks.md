## 1. Package metadata and workspace rename

- [x] 1.1 Rename the package in `packages/react/package.json` from `vercount-react` to `@vercount/react`.
- [x] 1.2 Update workspace dependency references so the app depends on `@vercount/react` instead of `vercount-react`.
- [x] 1.3 Verify package metadata and publish-facing fields still point to the correct repository and package directory after the rename.

## 2. Code and docs rename

- [x] 2.1 Update in-repo imports from `vercount-react` to `@vercount/react`.
- [x] 2.2 Update README/docs/install examples to use `@vercount/react`.
- [x] 2.3 Update active OpenSpec artifacts that still define the old package name as the current contract.

## 3. Verification and migration messaging

- [x] 3.1 Run the relevant package/app verification commands after the rename.
- [x] 3.2 Make sure the app still resolves and builds against the renamed workspace package.
- [x] 3.3 Add or update user-facing migration wording so consumers know to replace `vercount-react` with `@vercount/react`.
