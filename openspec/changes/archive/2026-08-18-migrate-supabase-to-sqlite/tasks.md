# Tasks

## 1. Shared contract

- [x] 1.1 Add `AuthResponse`, `CreateBookingRequest`, `BookingAddon`, and
      pagination shapes to `shared/types.ts`
- [x] 1.2 Point the server tsconfig at `../shared` so both sides compile
      against the same types

## 2. Database layer

- [x] 2.1 Write the SQLite schema (users, vendor_profiles, packages, addons,
      bookings, booking_addons, reviews) with CHECK constraints and indexes
- [x] 2.2 Open the database with WAL + foreign keys and apply the schema
      idempotently at startup
- [x] 2.3 Add row↔domain mappers (JSON arrays, integer booleans)
- [x] 2.4 Write the seed script with demo accounts and data

## 3. Server rewrite

- [x] 3.1 Replace Supabase calls in auth routes with SQLite + bcrypt + JWT
- [x] 3.2 Rewrite bookings/packages/vendor routes on prepared statements
- [x] 3.3 Add public `/api/vendors` browsing routes (list, detail, reviews)
- [x] 3.4 Remove `@supabase/supabase-js` and the Supabase config block

## 4. Client rewrite

- [x] 4.1 Add the fetch-based API client with token storage
- [x] 4.2 Rewrite `AuthContext` onto `/api/auth/*`
- [x] 4.3 Add the Vite `/api` proxy
- [x] 4.4 Rewire all screens from mock data to live endpoints with
      loading/error/empty states

## 5. Verification

- [x] 5.1 Typecheck and build both sides
- [x] 5.2 Seed, run both dev servers, click through customer and vendor flows
