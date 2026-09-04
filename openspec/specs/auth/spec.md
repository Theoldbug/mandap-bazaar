# auth Specification

## Purpose

Account creation, login, and request authentication for customers and vendors
using bcrypt password hashing and short-lived HS256 JWTs issued by the Express
server.

## Requirements

### Requirement: Signup

`POST /api/auth/signup` SHALL validate email format, password length (≥ 8),
full name, and role (`customer` | `vendor`); hash the password with bcrypt
(cost 12); and, for vendors, create the user row and vendor profile row in one
transaction. Duplicate emails respond 409. Emails are stored lowercase and
compared case-insensitively.

#### Scenario: Vendor signup is atomic

- **WHEN** a vendor account is created
- **THEN** the `users` row and its `vendor_profiles` row are inserted in one
  transaction — neither exists without the other

#### Scenario: Duplicate email

- **WHEN** signup is attempted with an email that already exists (any casing)
- **THEN** the API responds 409 without creating a row

### Requirement: Login without user enumeration

`POST /api/auth/login` SHALL respond 401 with the same generic message for
both unknown emails and wrong passwords, and SHALL run a bcrypt comparison
against a dummy hash when the email is unknown so response timing does not
reveal whether an account exists.

#### Scenario: Unknown email takes the bcrypt path

- **WHEN** login is attempted with an email that has no account
- **THEN** the server still performs a bcrypt comparison before responding 401

### Requirement: Token verification

Authenticated endpoints SHALL verify the Bearer token with an explicit
`algorithms: ['HS256']` allowlist, re-read the user's role from the database
(never trusting the token payload for authorization), and resolve the vendor's
profile id once in middleware so no route can run an unscoped vendor query.

#### Scenario: Tampered token

- **WHEN** a request carries a modified or wrongly-signed token
- **THEN** the API responds 401

#### Scenario: Vendor without a profile row

- **WHEN** a vendor-role user with no vendor profile calls a vendor endpoint
- **THEN** the middleware responds 403 before any handler runs

### Requirement: Startup secret validation

The server SHALL refuse to start when `JWT_SECRET` is missing or shorter than
32 characters. There is no fallback secret.

#### Scenario: Missing secret

- **WHEN** the server starts without `JWT_SECRET`
- **THEN** it exits with a clear configuration error

### Requirement: Credential rate limiting

`/api/auth/login` and `/api/auth/signup` SHALL enforce a strict rate limit
(10 failed attempts / 15 min per IP, successful requests exempt) on top of the
global API limit.

#### Scenario: Brute-force slowed

- **WHEN** an IP submits more than 10 failed logins in 15 minutes
- **THEN** further attempts receive 429
