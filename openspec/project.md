# Project Context

## Purpose

Mandap Bazaar is a full-stack event-vendor marketplace for Indian weddings and
celebrations. Customers browse verified vendors (decor, catering, DJ, mandap
setups), customise packages with add-ons, and request date-slot bookings.
Vendors manage packages, respond to booking requests, and track revenue.

## Tech Stack

- **Backend:** Node.js, Express 5, TypeScript, SQLite (`node:sqlite`), zod,
  bcryptjs, jsonwebtoken, helmet, express-rate-limit
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, react-router-dom 7
- **Shared:** `shared/types.ts` — the API contract both sides compile against

## Project Conventions

### Architecture

- `server/src/routes/*` — thin Express routers; domain rules live in
  `server/src/services/*`.
- `server/src/db/` — the only place that touches SQLite: schema, connection,
  row↔domain mappers, seed.
- The client talks to the API exclusively through `client/src/lib/api.ts`;
  screens load data with the `useFetch` hook.

### Domain rules

- **Validation at the boundary:** every mutating endpoint validates its body
  with a zod schema (`middleware/validate.ts`). Update endpoints use explicit
  field allowlists — platform-owned fields (`is_verified`, `rating`,
  `total_reviews`) are structurally unsettable by clients.
- **Transactions for multi-write operations:** any operation that reads then
  writes (booking creation, accept + auto-decline, package + addons save) runs
  inside `transactionImmediate` — a `BEGIN IMMEDIATE` SQLite transaction that
  takes the write lock up front, making check-then-insert sequences race-free.
- **Money is server-computed:** booking totals come from the package price plus
  addon prices read inside the transaction; add-on prices are snapshotted into
  `booking_addons` at booking time.
- **Status changes go through one state machine:** `BOOKING_TRANSITIONS` in
  `shared/types.ts`, enforced by `bookingService.transitionBooking`.

### Testing / verification

- `npm run typecheck` must pass on both sides.
- The booking conflict flows are verified with an end-to-end API test sequence
  (create-conflict 409, accept-time 409, auto-decline count, terminal states).

## Domain glossary

- **Time slot:** `morning | afternoon | evening | full_day`. Two bookings for
  the same vendor and date conflict iff their slots are equal or either is
  `full_day`.
- **Verified vendor:** vendor approved by the platform; only verified vendors
  appear in public browsing.
