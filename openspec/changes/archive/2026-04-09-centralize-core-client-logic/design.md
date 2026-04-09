## Context

After the monorepo migration, Vercount now has two browser-side consumers of the same counting flow: the embedded client in `app/src/lib/client.js` and the React hook in `packages/react/src/hooks/use-vercount.ts`. Both currently duplicate the same browser-facing logic: fixed API endpoint, timeout handling, response parsing, host-scoped UV cookie logic, and local cache read/write behavior. The embedded client then adds DOM-specific rendering, while the React package adds hook state/lifecycle behavior.

This is now a good point to extract a shared client core because the duplication is no longer incidental across separate repos; it lives in one monorepo and will drift if future browser-side changes keep landing in two places.

Constraints:
- The public counter API and returned fields must stay unchanged.
- The shared core should remain browser-oriented and simple; this change is not trying to build a generic SDK abstraction layer.
- The embedded script still needs a build output that works as plain JS in `app/public/js/client.min.js`.
- `@vercount/react` must remain independently buildable/publishable.

## Goals / Non-Goals

**Goals:**
- Extract the duplicated browser-side counting logic into `/packages/core`.
- Keep the shared core framework-agnostic but browser-specific.
- Let the embedded client and React hook both depend on the same request/cookie/cache logic.
- Preserve current visible behavior for both the plain JS embed and the React hook.

**Non-Goals:**
- Changing the server API contract.
- Changing PV/UV product semantics.
- Turning the shared core into a universal runtime-agnostic package for Node, SSR, or React Server Components.
- Redesigning the public React hook API beyond what is needed to wrap the shared core.

## Decisions

### 1. Create a browser-specific shared core package at `/packages/core`
The new package will hold the common browser-side counting logic and will be consumed by both `/app` and `/packages/react`.

- **Why:** It gives both consumers one source of truth without making either depend on the other's internal files.
- **Alternative considered:** keep logic duplicated. Rejected because drift is already likely.
- **Alternative considered:** make `packages/react` the source of truth. Rejected because the embedded client is not React-specific.
- **Alternative considered:** import app-owned code into the React package. Rejected because package ownership would point in the wrong direction.

### 2. Keep the shared core browser-specific, not highly abstracted
The core should directly use browser APIs such as `window.location`, `document.cookie`, `localStorage`, `AbortController`, and `fetch`.

- **Why:** Both current consumers run in the browser, and this keeps the core simple.
- **Alternative considered:** inject storage/fetch/cookie adapters. Rejected for now because it adds indirection without a current need.

### 3. Put only genuinely shared logic into the core
The shared core should own request execution, response parsing, caching, and UV cookie behavior. The embedded client should keep DOM lookup/show-hide/update responsibilities, and the React package should keep hook lifecycle/state responsibilities.

- **Why:** This avoids forcing unrelated abstractions across different UI surfaces.
- **Alternative considered:** centralize all logic including DOM or React behavior. Rejected because those are not shared concerns.

### 4. Give the core a small stable contract oriented around fetching counter data
The shared package should expose a small set of browser helpers, such as a function to fetch fresh counter data plus cache/cookie utilities and typed counter result shapes.

- **Why:** A small contract reduces coupling and makes it easy for each consumer to compose what it needs.
- **Alternative considered:** expose one large all-in-one initializer. Rejected because the embed and React consumers have different orchestration needs.

### 5. Use workspace dependencies to connect `packages/react` and `app` to `packages/core`
Both consumers should depend on the shared package through the monorepo workspace instead of relative cross-package imports.

- **Why:** This matches the current workspace direction and keeps package boundaries clean.
- **Alternative considered:** raw relative imports across package boundaries. Rejected because it is brittle and poor for publishing.

## Risks / Trade-offs

- **Shared package introduces another workspace package** → Keep the API small and focused on currently duplicated logic only.
- **Embed script bundling may get trickier when importing workspace code** → Verify the app's client-minification/build flow works after the extraction.
- **React package may accidentally inherit embed-specific assumptions** → Keep DOM rendering concerns outside the shared core.
- **Core API may still be too narrow or too broad** → Start with the currently duplicated logic and avoid speculative options/config.

## Migration Plan

1. Create `/packages/core` with browser-side counter types and shared helpers.
2. Move duplicated request/cookie/cache/response logic from the embed client and React hook into the shared core.
3. Update the embedded client to use the shared core while keeping DOM update logic in place.
4. Update `@vercount/react` to use the shared core while keeping the hook API in place.
5. Update package metadata and docs to reflect the new dependency structure.
6. Verify the app build/minified client output and React package build still work.

Rollback:
- Inline the shared logic back into the embed client and React hook.
- Remove `/packages/core` and restore direct logic ownership in each consumer.

## Open Questions

None.
