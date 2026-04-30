## ADDED Requirements

### Requirement: Public events host SHALL redirect service root to canonical web homepage

The system SHALL redirect `GET` and `HEAD` requests for `/` on the public Go API host to the canonical Vercount web homepage at `https://www.vercount.one/`.

#### Scenario: Client requests the service root

- **WHEN** a client sends a `GET` request to `/`
- **THEN** the system SHALL return a permanent redirect to `https://www.vercount.one/`
- **AND** the system SHALL NOT return the public Go API service metadata JSON

#### Scenario: Client sends a HEAD request to the service root

- **WHEN** a client sends a `HEAD` request to `/`
- **THEN** the system SHALL return a permanent redirect to `https://www.vercount.one/`

### Requirement: Public events host SHALL redirect known human-facing pages to the canonical web host

The system SHALL redirect known human-facing page requests on the public events host to the same path on `https://www.vercount.one` so old indexed or bookmarked web-app URLs resolve to the canonical site.

#### Scenario: Client requests an old dashboard page on the events host

- **WHEN** a client sends a `GET` request to `/dashboard` on the public events host
- **THEN** the system SHALL return a permanent redirect to `https://www.vercount.one/dashboard`

#### Scenario: Client requests an old dashboard subpage on the events host

- **WHEN** a client sends a `GET` request to `/dashboard/analytics` or `/dashboard/domains` on the public events host
- **THEN** the system SHALL return a permanent redirect to the same path on `https://www.vercount.one`

#### Scenario: Client requests an old auth page on the events host

- **WHEN** a client sends a `GET` request to `/auth/signin` on the public events host
- **THEN** the system SHALL return a permanent redirect to `https://www.vercount.one/auth/signin`

#### Scenario: Client request includes a query string

- **WHEN** a redirected human-facing request includes a query string
- **THEN** the system SHALL preserve that query string on the canonical web-host redirect target

### Requirement: Public events host SHALL preserve machine endpoint routing

The system SHALL keep machine-facing events-host endpoints available without canonical web redirects.

#### Scenario: Client requests a supported machine endpoint

- **WHEN** a client sends a request to `/healthz`, `/js`, `/bench/write`, `/log`, `/api/v1/log`, or `/api/v2/log`
- **THEN** the system SHALL serve the existing endpoint behavior on the public events host
- **AND** the system SHALL NOT redirect the request to the canonical web host

#### Scenario: Client requests an unknown API-style path

- **WHEN** a client sends a request to an unsupported `/api/*` path on the public events host
- **THEN** the system SHALL treat the request as an API-host miss
- **AND** the system SHALL NOT redirect the request to the canonical web host

## REMOVED Requirements

### Requirement: Public events host SHALL expose a service metadata root endpoint

**Reason**: The public events host is no longer the canonical human-facing site, and returning service metadata at `/` causes search engines and users to land on an API response instead of the Vercount homepage.

**Migration**: Use `/healthz` for machine-readable service readiness and `https://www.vercount.one/` for the canonical homepage.
