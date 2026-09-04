# bookings — deltas

## ADDED Requirements

### Requirement: Server-computed totals with addon snapshots

The booking total SHALL equal the package `starting_price` plus the prices of
the selected add-ons as read from the database inside the creation
transaction, with add-ons snapshotted (name + price) into `booking_addons`.

#### Scenario: Later price edits don't change past bookings

- **WHEN** a vendor changes an addon's price after a booking was created
- **THEN** the booking's stored addon prices and total are unchanged

## MODIFIED Requirements

### Requirement: Ownership scoping

`GET /api/bookings` SHALL return only the caller's bookings (customer: by
`customer_id`; vendor: by their vendor profile id resolved in middleware) with
real pagination counts; `GET /api/bookings/:id` responds 404 for bookings the
caller does not own.

#### Scenario: Vendor sees only their bookings

- **WHEN** a vendor lists bookings
- **THEN** every returned booking has that vendor's profile id
