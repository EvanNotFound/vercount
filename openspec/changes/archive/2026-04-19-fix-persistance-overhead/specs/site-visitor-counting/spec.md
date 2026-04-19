## MODIFIED Requirements

### Requirement: Site UV is stored as a numeric counter

The system SHALL store each host's site UV as a plain numeric counter and SHALL return that numeric value from the public counter APIs. When a host's numeric UV counter does not yet exist, the system SHALL resolve initialization through a one-time migration flow and then continue from local Redis state only.

#### Scenario: First access under the new model with available migration data
- **WHEN** a public counter request targets a host whose numeric UV counter does not yet exist and a migration UV total is available
- **THEN** the system SHALL initialize the numeric UV counter from that available total before returning or incrementing it
- **AND** the system SHALL persist that numeric UV counter locally so later requests for the host do not consult Busuanzi again

#### Scenario: First access under the new model without available migration data
- **WHEN** a public counter request targets a host whose numeric UV counter does not yet exist and no migration UV total can be imported
- **THEN** the system SHALL initialize the numeric UV counter to zero
- **AND** later requests for the host SHALL continue from local Redis state without retrying Busuanzi

#### Scenario: New UV increments the site value
- **WHEN** a public counter request is marked as a new UV for a host
- **THEN** the system SHALL increment that host's numeric UV counter by one and return the updated value

## ADDED Requirements

### Requirement: UV migration fallback stays best-effort

The system SHALL treat Busuanzi as a best-effort migration source for missing numeric UV counters and SHALL NOT make Busuanzi reliability a requirement for normal public counter performance.

#### Scenario: Missing numeric UV counter triggers migration import
- **WHEN** the system attempts to initialize a missing numeric UV counter for a host
- **THEN** the system SHALL make at most one Busuanzi request for that host's UV migration attempt
- **AND** the system SHALL NOT retry failed Busuanzi requests in the hot path
