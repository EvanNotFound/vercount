## 1. Create the shared core package

- [x] 1.1 Add a new workspace package at `/packages/core` with package metadata, build config, and public exports.
- [x] 1.2 Define shared browser-side counter types and core helper exports for request, cache, and UV cookie behavior.
- [x] 1.3 Make sure both the app and React package can depend on the new core package through workspace resolution.

## 2. Move duplicated browser logic into the core

- [x] 2.1 Move shared request execution and response parsing logic into `/packages/core`.
- [x] 2.2 Move shared local cache helpers into `/packages/core`.
- [x] 2.3 Move shared UV cookie helpers into `/packages/core`.

## 3. Update the consumers

- [x] 3.1 Refactor `app/src/lib/client.js` to use the shared core while keeping DOM-ready and counter-rendering behavior local to the embed client.
- [x] 3.2 Refactor `packages/react/src/hooks/use-vercount.ts` to use the shared core while keeping React hook lifecycle/state behavior local to the hook.
- [x] 3.3 Keep the visible counter behavior and hook return shape unchanged after the refactor.

## 4. Docs and verification

- [x] 4.1 Update package docs or comments to explain the new `/packages/core` responsibility.
- [x] 4.2 Verify that both the embedded client and React hook still use the current API flow and UV/caching behavior after the shared-core extraction.
- [x] 4.3 Run the relevant packages/app verification commands and fix issues introduced by the refactor.
