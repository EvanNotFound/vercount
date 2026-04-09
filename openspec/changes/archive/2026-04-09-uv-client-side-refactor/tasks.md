## 1. Public client UV dedupe

- [x] 1.1 Add host-scoped UV cookie helpers to `src/lib/client.js`.
- [x] 1.2 Update the public counter request payload so the client marks whether the current visit is a new UV.
- [x] 1.3 Keep the existing public counter rendering flow working after the UV cookie check is added.

## 2. Server-side UV counter model

- [x] 2.1 Replace server-side UV identity tracking in `src/utils/counter.ts` with a plain numeric site UV counter.
- [x] 2.2 Add lazy migration logic so a host without the new numeric UV key initializes from the currently available UV total.
- [x] 2.3 Update `/api/v1/log` and `/api/v2/log` to use the client-provided new-UV signal instead of request IP for UV increments.

## 3. Dashboard and analytics compatibility

- [x] 3.1 Update authenticated domain analytics reads to return the numeric site UV value directly.
- [x] 3.2 Update authenticated domain analytics writes to persist the numeric site UV value directly.
- [x] 3.3 Make sure legacy UV Redis keys are no longer refreshed by the new flow.

## 4. Docs and verification

- [x] 4.1 Update user-facing docs or inline comments that describe how site UV is counted.
- [x] 4.2 Verify first-visit and returning-visit UV behavior for the same host still returns the expected counter fields.
- [x] 4.3 Run `pnpm lint` and fix any issues caused by the refactor.
