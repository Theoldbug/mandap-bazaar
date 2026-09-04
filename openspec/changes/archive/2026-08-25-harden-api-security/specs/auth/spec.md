# auth — deltas

## ADDED Requirements

### Requirement: Login without user enumeration

Login SHALL respond 401 with one generic message for unknown emails and wrong
passwords alike, running a dummy bcrypt comparison on the unknown-email path
to equalize timing.

#### Scenario: Unknown email takes the bcrypt path

- **WHEN** login is attempted with an email that has no account
- **THEN** the server still performs a bcrypt comparison before responding 401

### Requirement: Startup secret validation

The server SHALL refuse to start when `JWT_SECRET` is missing or shorter than
32 characters; there is no fallback secret, and `jwt.verify` pins
`algorithms: ['HS256']`.

#### Scenario: Missing secret

- **WHEN** the server starts without `JWT_SECRET`
- **THEN** it exits with a clear configuration error

### Requirement: Credential rate limiting

Auth endpoints SHALL enforce 10 failed attempts / 15 min per IP on top of the
global API limit.

#### Scenario: Brute-force slowed

- **WHEN** an IP submits more than 10 failed logins in 15 minutes
- **THEN** further attempts receive 429
