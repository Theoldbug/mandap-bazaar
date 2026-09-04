# Add transaction-safe booking conflict resolution

## Why

Nothing prevented a vendor from being double-booked: booking creation did no
availability check, accepting a booking did not affect competing requests, and
`event_time` was a free-form string that made "overlap" undefined. Two
customers could both end up accepted for the same wedding date.

## What Changes

- **BREAKING:** `event_time` becomes a time-slot enum
  (`morning | afternoon | evening | full_day`); conflict = same slot or either
  is `full_day`.
- Booking creation and acceptance run inside `BEGIN IMMEDIATE` transactions
  (single entry points in `bookingService`), making check-then-write
  sequences race-free under SQLite's single-writer model.
- Create-time conflict check: 409 `SLOT_CONFLICT` before a request is even
  filed against a blocked slot.
- Accept-time resolution: re-check (409 with `conflicting_booking_id` if
  taken), accept, then auto-decline all still-pending conflicting requests;
  the response reports `auto_declined_count`.
- Partial unique index `uq_accepted_slot` as a DB-level backstop.
- Booking status state machine (`BOOKING_TRANSITIONS` in shared types) with
  terminal states; customers gain a cancel endpoint.
- UI: booking form gains a date picker and slot selector; the customer sees an
  inline conflict message on 409; the vendor sees an auto-decline toast.

## Impact

- Affected specs: booking-conflicts (new), bookings
- Affected code: `server/src/services/bookingService.ts`,
  `server/src/routes/bookings.ts`, `server/src/db/schema.ts`,
  `shared/types.ts`, PackageCustomize/MyBookings/VendorBookings screens
