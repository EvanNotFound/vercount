## MODIFIED Requirements

### Requirement: Site UV is stored as a numeric counter
The system SHALL store each host's site UV as a plain numeric counter and SHALL return that numeric value from the public counter APIs. When a host's numeric UV counter does not yet exist, the system SHALL resolve initialization through a one-time Busuanzi-backed migration flow and then continue from local Redis state only. The system SHALL NOT consult legacy Redis UV keys such as `uv:site:*` or `uv:baseline:*` when initializing a missing numeric UV counter.

#### Scenario: First access under the new model with available Busuanzi migration data
- **WHEN** a public counter request targets a host whose numeric UV counter does not yet exist and Busuanzi can provide a migration UV total
- **THEN** the system SHALL initialize the numeric UV counter from that Busuanzi total before returning or incrementing it
- **AND** the system SHALL persist that numeric UV counter locally so later requests for the host do not consult Busuanzi again

#### Scenario: First access under the new model without available migration data
- **WHEN** a public counter request targets a host whose numeric UV counter does not yet exist and no migration UV total can be imported
- **THEN** the system SHALL initialize the numeric UV counter to zero
- **AND** later requests for the host SHALL continue from local Redis state without retrying Busuanzi

#### Scenario: Legacy Redis UV keys remain after numeric migration
- **WHEN** a public counter request targets a host whose numeric UV counter does not yet exist but legacy Redis UV keys are still present for that host
- **THEN** the system SHALL ignore those legacy Redis UV keys during initialization
- **AND** the system SHALL continue using the Busuanzi-or-zero initialization path for the missing numeric UV counter

#### Scenario: New UV increments the site value
- **WHEN** a public counter request is marked as a new UV for a host
- **THEN** the system SHALL increment that host's numeric UV counter by one and return the updated value
