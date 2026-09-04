# vendors — deltas

## MODIFIED Requirements

### Requirement: Profile updates cannot touch trust fields

`PUT /api/vendor` SHALL accept only allowlisted business fields;
`is_verified`, `rating`, and `total_reviews` are absent from the schema, so a
request including them has those fields stripped before reaching SQL.

#### Scenario: Self-verification attempt

- **WHEN** a vendor sends `{"is_verified": true, "rating": 5}`
- **THEN** the stored profile's verification and rating are unchanged
