# Tasks

## 1. Domain model

- [x] 1.1 Add `TimeSlot` enum and `TIME_SLOTS` labels to shared types
- [x] 1.2 Add `BOOKING_TRANSITIONS` state machine to shared types
- [x] 1.3 CHECK constraint on `event_time`; composite index
      `(vendor_id, event_date)`; partial unique index `uq_accepted_slot`

## 2. Booking service

- [x] 2.1 `transactionImmediate` helper (BEGIN IMMEDIATE / COMMIT / ROLLBACK)
- [x] 2.2 Shared conflict predicate (equal slot OR either `full_day`)
- [x] 2.3 `createBooking`: package/addon validation, server-computed total,
      conflict check, atomic insert with addon snapshots
- [x] 2.4 `transitionBooking`: ownership, state machine, actor rules,
      accept-path re-check + auto-decline with count
- [x] 2.5 Map `uq_accepted_slot` UNIQUE violations to 409

## 3. Routes

- [x] 3.1 `POST /api/bookings` with full zod validation (future date, slot)
- [x] 3.2 `PUT /api/bookings/:id/status` (vendor) through the service
- [x] 3.3 `POST /api/bookings/:id/cancel` (customer)

## 4. UI

- [x] 4.1 Booking form: event type, date (min tomorrow), slot radio group,
      venue fields
- [x] 4.2 Customer 409 handling: inline "slot unavailable" message
- [x] 4.3 Vendor accept feedback: auto-decline count toast, conflict banner
- [x] 4.4 Vendor booking tabs aligned to the real status vocabulary

## 5. Verification

- [x] 5.1 End-to-end sequence: two pendings on one slot → accept →
      `auto_declined_count: 1`; blocked create → 409; declined re-accept →
      409 `INVALID_TRANSITION`; completed is terminal
- [x] 5.2 Seed includes two conflicting pending requests for the demo
