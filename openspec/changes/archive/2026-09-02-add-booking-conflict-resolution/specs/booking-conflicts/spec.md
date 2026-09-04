# booking-conflicts — deltas

## ADDED Requirements

### Requirement: Slot conflict definition

Two bookings for the same vendor and `event_date` SHALL conflict when their
time slots are equal or either slot is `full_day`.

#### Scenario: full_day blocks every slot

- **WHEN** a vendor has an accepted `full_day` booking on a date
- **THEN** every slot on that date conflicts with it

### Requirement: Create-time conflict rejection

Booking creation SHALL run inside a `BEGIN IMMEDIATE` transaction and respond
409 `SLOT_CONFLICT` when an accepted booking already conflicts.

#### Scenario: Customer requests a blocked slot

- **WHEN** a customer submits a booking that conflicts with an accepted one
- **THEN** the API responds 409 `SLOT_CONFLICT` and no row is created

### Requirement: Accept-time conflict resolution

Accepting SHALL atomically re-check conflicts (409 with
`conflicting_booking_id` if taken), mark accepted, and auto-decline
conflicting pendings, reporting `auto_declined_count`.

#### Scenario: Accept auto-declines competing pendings

- **WHEN** a vendor accepts one of two conflicting pending bookings
- **THEN** the other becomes `declined` and the response reports
  `auto_declined_count: 1`

### Requirement: Database-level backstop

A partial unique index on `(vendor_id, event_date, event_time) WHERE
status = 'accepted'` SHALL reject same-slot double-accepts at the storage
layer.

#### Scenario: Direct write violating the index

- **WHEN** two bookings for the identical vendor/date/slot are both accepted
- **THEN** SQLite rejects the second write, surfaced as 409

### Requirement: Booking status state machine

Transitions SHALL follow `BOOKING_TRANSITIONS`; terminal states are immutable;
vendors may accept/decline/complete their bookings and customers may cancel
their own pending or accepted bookings.

#### Scenario: Terminal states are immutable

- **WHEN** a vendor tries to re-accept a completed booking
- **THEN** the API responds 409 `INVALID_TRANSITION`
