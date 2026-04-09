## Context

The repository now has a scoped shared package, `@vercount/core`, but the React package still uses the older unscoped package name `vercount-react`. Since adoption is still low, renaming it now avoids carrying a mismatched package family forward and makes the monorepo package naming more coherent.

This rename is cross-cutting because it affects package metadata, workspace dependency names, imports inside the app, docs/examples, and the React-package-related specs created during the monorepo migration and shared-core extraction.

Constraints:
- The package should stay at `/packages/react`; only the published/imported name changes.
- The React hook behavior should remain unchanged.
- The rename should cover both internal workspace usage and external consumer-facing docs.

## Goals / Non-Goals

**Goals:**
- Rename the package from `vercount-react` to `@vercount/react`.
- Update workspace dependencies and imports to the new scoped name.
- Update docs and examples to show the new install/import name.
- Keep the package functionality and directory layout unchanged.

**Non-Goals:**
- Changing the package API beyond the import/install name.
- Renaming `@vercount/core` or other packages.
- Creating a dual-publish compatibility layer for the old name.

## Decisions

### 1. Rename directly instead of dual-publishing
The package will move directly to `@vercount/react` with a clean rename instead of publishing both names in parallel.

- **Why:** Adoption is currently low, so this is the cheapest time to make the better naming decision.
- **Alternative considered:** keep `vercount-react` indefinitely. Rejected because it leaves the package family inconsistent.
- **Alternative considered:** dual-publish temporarily. Rejected because it adds release and documentation overhead that is unnecessary at current adoption.

### 2. Keep the package location and package contents stable
Only the package name and references will change; the package remains under `/packages/react` and keeps the same hook behavior.

- **Why:** This makes the rename focused and low-risk.
- **Alternative considered:** combine rename with a broader package redesign. Rejected because the name change is already enough surface area.

### 3. Update both code references and spec/docs references
The rename should be reflected not only in current code/docs, but also in active OpenSpec artifacts whose requirements would otherwise immediately go stale.

- **Why:** OpenSpec artifacts should reflect the intended system contract after the rename.
- **Alternative considered:** only update implementation files. Rejected because it leaves current specs/design docs inconsistent with the repo state.

## Risks / Trade-offs

- **Existing low-volume users may still be broken by the rename** → Update docs clearly and treat the change as breaking.
- **Missed string references can leave mixed naming in the repo** → Search all package/docs/spec references and verify imports/install commands.
- **Publish workflow assumptions may still reference the old package name outside the repo** → Review package metadata and release-facing docs during implementation.

## Migration Plan

1. Rename the package in `packages/react/package.json`.
2. Update workspace dependencies and in-repo imports to `@vercount/react`.
3. Update docs/examples/install commands to the new name.
4. Update active OpenSpec artifacts that currently define the old package name as the contract.
5. Run package/app verification commands.

Rollback:
- Restore the old package name and revert the updated imports/docs if needed.

## Open Questions

None.
