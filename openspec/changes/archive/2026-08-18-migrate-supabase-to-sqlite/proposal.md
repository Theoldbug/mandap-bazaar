# Migrate from Supabase to SQLite

## Why

The app was split across two disconnected stacks: an Express API using the
Supabase REST client (service-role key, RLS bypassed) and a React client that
talked to Supabase Auth directly and never called the API. The Supabase JS
client cannot express multi-statement transactions, which blocks the planned
transaction-safe booking conflict-resolution work. Consolidating on Express +
SQLite gives one auth story, real transactions, and a zero-dependency local
setup.

## What Changes

- Replace all Supabase data access with SQLite via `node:sqlite`
  (schema applied idempotently at startup; WAL mode; foreign keys on).
- **BREAKING:** client auth moves from Supabase Auth to the Express API
  (bcrypt + JWT); `@supabase/supabase-js` removed from both sides.
- `selected_addons UUID[]` becomes a `booking_addons` join table with
  name/price snapshots (SQLite has no array types).
- Array-ish columns (`category`, `images`, `inclusions`) stored as JSON text
  with a mapper layer keeping `shared/types.ts` shapes.
- New API client (`client/src/lib/api.ts`) and Vite `/api` proxy; every screen
  rewired from mock data to live endpoints.
- Seed script with demo vendors, packages, bookings, and reviews.

## Impact

- Affected specs: auth, vendors, packages, bookings, vendor-dashboard
- Affected code: `server/src/**`, `client/src/lib/**`,
  `client/src/context/AuthContext.tsx`, all screens, `shared/types.ts`
