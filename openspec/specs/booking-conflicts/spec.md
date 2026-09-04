# booking-conflicts Specification

## Purpose

Guarantee that a vendor can never hold two accepted bookings that overlap on
the same date, and that every conflict decision is made atomically under
SQLite's single-writer transaction model.

## Requirements

### Requirement: Slot conflict definition

Two bookings for the same vendor and `event_date` SHALL be considered
conflicting when their time slots are equal, or when either slot is
`full_day`.

#### Scenario: Equal slots conflict

- **WHEN** a vendor has an accepted `evening` booking on a date
- **THEN** another `evening` booking on that date conflicts with it

#### Scenario: full_day blocks every slot

- **WHEN** a vendor has an accepted `full_day` booking on a date
- **THEN** `morning`, `afternoon`, `evening`, and `full_day` bookings on that
  date all conflict with it

#### Scenario: Different partial slots do not conflict

- **WHEN** a vendor has an accepted `morning` booking on a date
- **THEN** an `evening` booking on the same date does not conflict

### Requirement: Create-time conflict rejection

Booking creation SHALL run inside a `BEGIN IMMEDIATE` transaction and SHALL be
rejected with HTTP 409 and code `SLOT_CONFLICT` when an accepted booking
already conflicts with the requested vendor/date/slot.

#### Scenario: Customer requests a blocked slot

- **WHEN** a customer submits a booking for a vendor/date/slot that conflicts
  with an existing accepted booking
- **THEN** the API responds 409 `SLOT_CONFLICT` and no booking row is created

#### Scenario: Concurrent creations cannot both pass the check

- **WHEN** two requests for the same vendor/date/slot arrive concurrently
- **THEN** the `BEGIN IMMEDIATE` write lock serializes them, so the second
  request observes the first request's outcome

### Requirement: Accept-time conflict resolution

Accepting a booking SHALL, within one transaction: re-check for conflicting
accepted bookings (409 `SLOT_CONFLICT` with the conflicting booking id if
found), mark the booking accepted, and auto-decline every still-pending
booking for the same vendor that conflicts with the accepted slot. The
response SHALL include `auto_declined_count`.

#### Scenario: Accept auto-declines competing pendings

- **WHEN** a vendor accepts one of two pending bookings that share a
  conflicting date/slot
- **THEN** the other pending booking becomes `declined` and the response
  reports `auto_declined_count: 1`

#### Scenario: Accept refused when slot already taken

- **WHEN** a vendor accepts a pending booking whose slot conflicts with an
  already-accepted booking
- **THEN** the API responds 409 `SLOT_CONFLICT` including
  `conflicting_booking_id`, and the booking stays pending

### Requirement: Database-level backstop

The schema SHALL carry a partial unique index
`uq_accepted_slot ON bookings(vendor_id, event_date, event_time) WHERE
status = 'accepted'` so that even a code path that bypasses the service layer
cannot double-accept the exact same slot. (The `full_day`-vs-partial overlap
cannot be expressed in a unique index; it is enforced by the transaction.)

#### Scenario: Direct write violating the index

- **WHEN** any code attempts to set two bookings for the same vendor, date,
  and slot to `accepted`
- **THEN** SQLite rejects the second write with a UNIQUE constraint violation,
  surfaced as HTTP 409

### Requirement: Booking status state machine

Status changes SHALL follow `BOOKING_TRANSITIONS`: pending →
accepted/declined/cancelled; accepted → completed/cancelled; declined,
completed, and cancelled are terminal. Vendors may set
accepted/declined/completed on their own bookings; customers may only cancel
their own pending or accepted bookings. Invalid transitions respond 409
`INVALID_TRANSITION`.

#### Scenario: Terminal states are immutable

- **WHEN** a vendor tries to re-accept a completed or declined booking
- **THEN** the API responds 409 `INVALID_TRANSITION`

#### Scenario: Customer cancels own booking

- **WHEN** a customer cancels their own pending booking
- **THEN** the booking becomes `cancelled`

#### Scenario: Ownership is enforced without an existence oracle

- **WHEN** a user acts on a booking that is not theirs
- **THEN** the API responds 404 (indistinguishable from a missing booking)
