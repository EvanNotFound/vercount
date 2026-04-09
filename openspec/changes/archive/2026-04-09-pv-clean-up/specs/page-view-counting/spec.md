## ADDED Requirements

### Requirement: Public PV writes remain exact

The system SHALL continue to store exact site PV and exact page PV for tracked requests, and public counter APIs SHALL continue to return the same `site_pv` and `page_pv` fields.

#### Scenario: Tracked page request updates exact PV values

- **WHEN** a valid public counter write request is received for a host and page path
- **THEN** the system SHALL increment that host's stored site PV by one
- **AND** the system SHALL increment that host/path's stored page PV by one
- **AND** the response SHALL include the updated `site_pv` and `page_pv` values

### Requirement: Read-only PV retrieval does not mutate persisted PV records

Read-only PV retrieval SHALL return the current visible site PV and page PV values without creating new persisted PV records or extending retention for existing PV records.

#### Scenario: Read-only request for an existing PV record

- **WHEN** a read-only PV request targets a host or page that already has a stored PV record
- **THEN** the system SHALL return the stored PV value
- **AND** the system SHALL NOT create a new PV record
- **AND** the system SHALL NOT extend retention for that stored PV record

#### Scenario: Read-only request for a missing PV record with fallback data

- **WHEN** a read-only PV request targets a host or page that does not have a stored PV record but a fallback PV value is available
- **THEN** the system SHALL return the fallback PV value
- **AND** the system SHALL NOT persist a new PV record for that read-only request

### Requirement: Known page PV records remain discoverable in domain analytics

The system SHALL keep locally stored page PV records discoverable for a domain's analytics view without depending on whole-keyspace pattern matching.

#### Scenario: New tracked page becomes discoverable

- **WHEN** the system creates or updates a stored page PV record for a host/path
- **THEN** that page SHALL be discoverable in subsequent domain analytics page listings for that host

#### Scenario: Existing stored page records remain discoverable after cleanup rollout

- **WHEN** domain analytics loads a domain that already has stored page PV records from before the cleanup
- **THEN** the system SHALL rebuild page discoverability for those existing records without changing their stored PV counts

### Requirement: Manual PV updates remain discoverable

When an authenticated user saves page PV values for a verified domain, those page records SHALL remain discoverable in subsequent domain analytics reads.

#### Scenario: User saves page PV values in analytics

- **WHEN** an authenticated user saves one or more page PV values for a verified domain
- **THEN** the system SHALL persist those exact page PV values
- **AND** those pages SHALL appear in subsequent domain analytics page listings for that domain
