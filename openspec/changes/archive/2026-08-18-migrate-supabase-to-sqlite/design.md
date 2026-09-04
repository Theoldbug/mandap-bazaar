# Design: Supabase → SQLite migration

## Context

Two auth systems (Supabase Auth in the browser, bcrypt+JWT on the server) and
two data paths existed simultaneously; the client never called the Express
API. The migration collapses everything onto one path.

## Decisions

### Driver: `node:sqlite` over `better-sqlite3`

Both are synchronous. `node:sqlite` ships with Node ≥ 22 — no native compile
step on Windows, no version-matching of prebuilds. All driver contact is
isolated in `server/src/db/index.ts`, so swapping drivers later is a one-file
change.

### IDs stay TEXT UUIDs

`crypto.randomUUID()` keeps every id shape identical to the Supabase era —
zero churn in `shared/types.ts` and the client, and seed data stays readable.

### Arrays as JSON text + mapper layer

SQLite has no array type. `category`, `images`, `inclusions` are JSON-encoded
TEXT columns; `db/mappers.ts` is the single place that parses them, so route
code and the client only ever see `string[]`.

### `booking_addons` join table

Replacing the `selected_addons UUID[]` column fixes two bugs at once: addon
ids can now be FK-validated against the booked package, and each row stores a
name/price snapshot so later vendor price edits cannot retroactively change a
booking's total.

### Token storage: localStorage

An httpOnly cookie would need CSRF protection and same-site plumbing for no
demo benefit. The tradeoff (XSS reads the token) is documented in the README;
tokens expire in 7 days.

## Risks

- The client is intentionally broken mid-migration (shared types change
  first); mitigated by landing the server fully green before rewiring screens.
- `rootDir` change moves the tsc output to `dist/server/src`; the `start`
  script is updated in the same commit.
