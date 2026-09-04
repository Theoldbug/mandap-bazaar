# bookings Specification

## Purpose

Customers request bookings for a package on a specific date and time slot;
vendors and customers see only their own bookings; totals are computed and
snapshotted server-side.

## Requirements

### Requirement: Booking creation input

`POST /api/bookings` (customer only) SHALL validate: `package_id` (UUID),
`event_type` (event category enum), `event_date` (`YYYY-MM-DD`, not in the
past), `event_time` (time-slot enum), venue address and city lengths, at most
20 addon ids, and optional instructions ≤ 1000 chars. Malformed input responds
400 `VALIDATION_ERROR` with field details.

#### Scenario: Past date rejected

- **WHEN** a booking is submitted with yesterday's date
- **THEN** the API responds 400 `VALIDATION_ERROR`

### Requirement: Server-computed totals with addon snapshots

The booking total SHALL equal the package `starting_price` plus the prices of
the selected add-ons as read from the database inside the creation
transaction. Selected add-ons SHALL be validated to belong to the booked
package (else 400 `INVALID_ADDONS`) and stored in `booking_addons` with their
name and price at booking time.

#### Scenario: Foreign addon rejected

- **WHEN** a booking request includes an addon id from a different package
- **THEN** the API responds 400 `INVALID_ADDONS` and nothing is written

#### Scenario: Later price edits don't change past bookings

- **WHEN** a vendor changes an addon's price after a booking was created
- **THEN** the booking's stored addon prices and total are unchanged

### Requirement: Ownership scoping

`GET /api/bookings` SHALL return only the caller's bookings (customer: by
`customer_id`; vendor: by their vendor profile id) with real pagination counts.
`GET /api/bookings/:id` SHALL respond 404 for bookings the caller does not
own.

#### Scenario: Vendor sees only their bookings

- **WHEN** a vendor lists bookings
- **THEN** every returned booking has that vendor's profile id

### Requirement: Inactive packages cannot be booked

Booking creation SHALL respond 404 for unknown packages and 409 for packages
with `is_active = 0`.

#### Scenario: Deactivated package

- **WHEN** a customer books a package the vendor has deactivated
- **THEN** the API responds 409
