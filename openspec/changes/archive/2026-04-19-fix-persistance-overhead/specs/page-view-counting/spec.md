## MODIFIED Requirements

### Requirement: Read-only PV retrieval does not mutate persisted PV records

Read-only PV retrieval SHALL return the current visible site PV and page PV values without extending retention for existing PV records. When a requested PV record is missing locally, the system SHALL resolve that missing counter through a one-time migration initialization flow that makes Redis authoritative for subsequent requests.

#### Scenario: Read-only request for an existing PV record
- **WHEN** a read-only PV request targets a host or page that already has a stored PV record
- **THEN** the system SHALL return the stored PV value
- **AND** the system SHALL NOT create a new PV record
- **AND** the system SHALL NOT extend retention for that stored PV record

#### Scenario: First read-only request for a missing PV record with fallback data
- **WHEN** a read-only PV request targets a host or page that does not have a stored PV record and a fallback PV value is available
- **THEN** the system SHALL attempt the fallback import at most once for that missing counter
- **AND** the system SHALL persist the resolved PV value locally before returning it
- **AND** subsequent requests for that same counter SHALL use the persisted local value without consulting Busuanzi again

#### Scenario: First read-only request for a missing PV record without fallback data
- **WHEN** a read-only PV request targets a host or page that does not have a stored PV record and no fallback PV value can be imported
- **THEN** the system SHALL persist a local zero value for that missing counter
- **AND** subsequent requests for that same counter SHALL return the local value without retrying Busuanzi

## ADDED Requirements

### Requirement: PV migration fallback stays best-effort

The system SHALL treat Busuanzi as a best-effort migration source for missing PV counters and SHALL NOT let fallback behavior materially delay normal public counter requests.

#### Scenario: Missing PV counter triggers migration import
- **WHEN** a public counter read or write touches a site PV or page PV counter that has not been initialized locally yet
- **THEN** the system SHALL make at most one Busuanzi request for that counter's migration attempt
- **AND** the system SHALL NOT retry failed Busuanzi requests in the hot path

#### Scenario: Page PV migration uses a canonical fallback request
- **WHEN** the system attempts to import a missing page PV counter from Busuanzi
- **THEN** the system SHALL use one canonical fallback request shape for that page
- **AND** the system SHALL NOT issue multiple Busuanzi requests for slash and non-slash variants of the same page during that migration attempt
