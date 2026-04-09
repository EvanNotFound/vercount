## Purpose

Define the public site visitor counting behavior for unique visitor deduplication, numeric UV storage, and direct manual UV editing.

## Requirements

### Requirement: Browser cookie dedupes site UV

The public counter client SHALL use a persistent cookie on the tracked site's current host to decide whether the current browser has already been counted for that host's site UV.

#### Scenario: First browser visit to a host

- **WHEN** the client script runs on a host and the site UV cookie for that host is absent
- **THEN** the client SHALL mark the counter request as a new UV and set the site UV cookie for that host

#### Scenario: Returning browser visit to the same host

- **WHEN** the client script runs on a host and the site UV cookie for that host is present
- **THEN** the client SHALL send the counter request without marking it as a new UV

### Requirement: Site UV is stored as a numeric counter

The system SHALL store each host's site UV as a plain numeric counter and SHALL return that numeric value from the public counter APIs.

#### Scenario: First access under the new model

- **WHEN** a public counter request targets a host whose numeric UV counter does not yet exist
- **THEN** the system SHALL initialize the numeric UV counter from the currently available UV total before returning or incrementing it

#### Scenario: New UV increments the site value

- **WHEN** a public counter request is marked as a new UV for a host
- **THEN** the system SHALL increment that host's numeric UV counter by one and return the updated value

### Requirement: Manual site UV updates remain supported

The authenticated domain analytics flow SHALL read and write the numeric site UV value directly.

#### Scenario: User saves a site UV value

- **WHEN** an authenticated user saves a site UV value for a verified domain
- **THEN** the system SHALL persist that numeric value and return the same value in subsequent analytics reads
