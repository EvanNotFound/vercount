## Context

Vercount currently updates site UV by storing visitor identity data in Redis. The public log APIs call `recordSiteUV`, which adds the request IP to `uv:site:<host>` and combines that set size with `uv:baseline:<host>`. This keeps UV logic on the server, but it also makes Redis grow with traffic and makes UV storage harder to inspect.

This change moves the dedupe decision to the browser. The public client script already runs on the tracked site and sends one counter request per page load. That makes it a natural place to check whether the current browser has already been counted for the current host. The server can then store site UV as a plain number instead of a growing identity-backed structure.

Constraints:

- The public counter still needs to work through both `/api/v1/log` and `/api/v2/log`.
- The current host-based counter model should stay intact.
- Existing imported UV totals and manual dashboard edits should continue to work.
- This change is about UV only; PV logic stays as-is.

## Goals / Non-Goals

**Goals:**

- Remove per-visitor UV identity storage from Redis.
- Keep site UV behavior simple and intuitive for a public-facing counter.
- Preserve current API response fields and dashboard editing flows.
- Keep the storage model easy to inspect: one numeric UV value per host.

**Non-Goals:**

- Making UV exact across devices, private windows, or cleared browser state.
- Changing page view storage or page discovery behavior.
- Adding fallback storage layers such as localStorage, HLL, or a durable visitor ledger.

## Decisions

### 1. Use a client-side cookie for UV dedupe

The public script will decide whether the current browser is new for the current host by checking a cookie on the tracked site.

- **Why:** The script already executes in the tracked page context, so it can read and write a first-party cookie without relying on `events.vercount.one` cookies or third-party cookie behavior.
- **Alternative considered:** localStorage. Rejected because a small persistent marker is all that is needed, and cookie-only is simpler.
- **Alternative considered:** server-side IP or fingerprint dedupe. Rejected because the goal is to stop storing visitor identity state in Redis.

### 2. Scope the UV cookie to the current host

The cookie will be host-scoped rather than shared across subdomains.

- **Why:** Current counters are keyed by parsed host, and the repo explicitly preserves host distinctions such as `www`. Host-scoped cookies keep client dedupe aligned with existing counter boundaries.
- **Alternative considered:** broader domain-scoped cookie. Rejected because it would merge UV behavior across hosts that are currently counted separately.

### 3. Store site UV as a plain numeric counter

The server will keep a single numeric UV value per host and increment it only when the client marks a request as a new UV.

- **Why:** This gives bounded UV storage while keeping the returned `site_uv` value simple and editable.
- **Alternative considered:** HyperLogLog. Rejected because approximate stepping is less intuitive for small public counters and is unnecessary once strict accuracy is no longer a goal.
- **Alternative considered:** Redis sets with visitor identities. Rejected because they grow with traffic and are the main issue this change is trying to remove.

### 4. Migrate UV totals lazily from the current model

When the new numeric UV value for a host does not exist yet, the server will initialize it from the currently available UV total before using the new model.

- **Why:** This preserves existing counts without requiring a separate migration job before rollout.
- **Alternative considered:** one-time bulk migration. Rejected because it adds operational work and is not necessary for an approximate public counter.

### 5. Set the cookie when sending a new-UV request

The client will write the host cookie when it decides a request is a new UV, instead of waiting for the server response.

- **Why:** This reduces the chance of duplicate UV increments from repeated immediate loads or parallel tabs on a first visit.
- **Alternative considered:** set the cookie only after a successful response. Rejected because it increases the chance of duplicate counting during first-load races.

## Risks / Trade-offs

- **Cookie reset or private browsing can increase UV** → Accept as part of the public-counter model.
- **If the cookie is written but the request fails, a browser may not be counted on that first load** → Acceptable because UV is approximate and users can edit counters manually.
- **Legacy UV keys remain in Redis after rollout** → Let them age out naturally or clean them up later in a separate operational task.
- **Client-provided new-UV signaling is easier to spoof than server-side identity tracking** → Acceptable because vercount already exposes editable public counters and does not treat UV as an audit metric.

## Migration Plan

1. Update the public script to manage a host-scoped UV cookie and send a new-UV signal with counter requests.
2. Update the public log APIs to use that signal instead of request IP for UV increments.
3. Change UV read/write helpers to use a plain numeric host counter.
4. On first access to a host under the new model, initialize the numeric UV value from the currently available UV total.
5. Update authenticated domain analytics reads and writes to use the numeric UV value directly.
6. Leave legacy `uv:site:*` and `uv:baseline:*` keys to expire naturally.

Rollback:

- Restore the old server-side UV flow.
- If needed, copy the numeric UV value into the legacy baseline key so the previous total calculation can continue returning the same displayed number.

## Open Questions

None.
