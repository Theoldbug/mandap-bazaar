# Mandap Bazaar — Event-Vendor Marketplace

A full-stack marketplace for Indian wedding & event vendors (decor, catering,
DJ, mandap setups). Customers browse verified vendors, customise packages with
add-ons, and request date-slot bookings; vendors manage packages, respond to
requests, and track revenue — backed by a **transaction-safe booking
conflict-resolution system** on SQLite.

Built with **Node.js, Express 5, SQLite, TypeScript, React 19, Vite, and
Tailwind CSS v4**, developed spec-first with **OpenSpec** and **Claude Code**
(see [`openspec/`](openspec/)).

## Architecture

```
mandap-bazaar/
├── client/     # React 19 + TypeScript + Tailwind v4 + Vite (mobile-first UI)
├── server/     # Express 5 + TypeScript + SQLite (node:sqlite)
│   └── src/
│       ├── db/         # schema, connection, mappers, seed
│       ├── services/   # bookingService — the transactional conflict engine
│       ├── routes/     # auth, vendors (public), vendor (self), packages, bookings
│       └── middleware/ # JWT auth, zod validation
├── shared/     # shared/types.ts — the API contract both sides compile against
└── openspec/   # OpenSpec capability specs + archived change proposals
```

The client talks to the API through a Vite dev proxy (`/api` →
`localhost:3001`) — no client-side environment variables needed.

## Quickstart

Requires **Node.js ≥ 22** (uses the built-in `node:sqlite` driver — no native
compilation).

```bash
npm run install:all          # installs root + server + client deps

# one-time server config
cp server/.env.example server/.env
# set JWT_SECRET in server/.env:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run seed                 # creates + populates server/data/mandap.db
npm run dev                  # starts API (:3001) and client (:5173) together
```

Open http://localhost:5173.

### Demo accounts (password for all: `password123`)

| Role | Email | Notes |
|---|---|---|
| Customer | priya@example.com | has bookings across all statuses |
| Customer | rahul@example.com | |
| Vendor | royaldecor@example.com | Royal Decor House — has the conflict demo |
| Vendor | blossomevents@example.com | Blossom Events |
| Vendor | spicecaterers@example.com | Spice Route Caterers |
| Vendor | djbeats@example.com | DJ Beats & Lights |
| Vendor | jaipurmandap@example.com | Jaipur Mandap Works |

**Conflict-resolution demo:** the seed creates two pending bookings for Royal
Decor House on the same date (one `full_day`, one `evening`). Log in as
`royaldecor@example.com`, open Bookings → Pending, and accept one — the other
is automatically declined, and the UI reports it. Then try booking that
vendor/date as a customer: the request is rejected with a clear
"slot unavailable" message before it's ever filed.

## Booking conflict resolution (the interesting part)

- **Time-slot model:** every booking takes a slot — `morning`, `afternoon`,
  `evening`, or `full_day`. Two bookings for the same vendor and date conflict
  iff their slots are equal or either is `full_day`.
- **Transaction safety:** booking creation and acceptance run inside
  `BEGIN IMMEDIATE` SQLite transactions (`server/src/db/index.ts` →
  `transactionImmediate`). The write lock is taken up front, so under
  SQLite's single-writer model the check-then-insert sequence is race-free —
  two concurrent requests for the same slot cannot both pass the check.
- **Create-time check:** requesting a blocked slot returns
  `409 SLOT_CONFLICT` immediately.
- **Accept-time resolution:** accepting re-checks conflicts (409 with the
  conflicting booking id if taken), marks the booking accepted, and
  **auto-declines every still-pending conflicting request** in the same
  transaction, returning `auto_declined_count`.
- **DB-level backstop:** a partial unique index
  (`uq_accepted_slot ON bookings(vendor_id, event_date, event_time) WHERE
  status='accepted'`) rejects same-slot double-accepts even if code bypasses
  the service layer.
- **State machine:** `pending → accepted/declined/cancelled`,
  `accepted → completed/cancelled`; terminal states are immutable
  (`BOOKING_TRANSITIONS` in `shared/types.ts`, enforced in
  `server/src/services/bookingService.ts`).
- **Price integrity:** totals are computed server-side inside the transaction;
  add-on prices are snapshotted into `booking_addons`, so later price edits
  never change existing bookings, and add-ons from other packages are
  rejected.

## API overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create account (customer/vendor) |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | ✓ | Current user + vendor profile |
| GET | `/api/vendors` | — | Browse verified vendors (category/city/search) |
| GET | `/api/vendors/:id` | — | Vendor + active packages + add-ons |
| GET | `/api/vendors/:id/reviews` | — | Vendor reviews |
| GET | `/api/packages/public` | — | Browse active packages |
| GET | `/api/packages/:id` | — | Package detail (booking flow) |
| GET/POST/PUT/DELETE | `/api/packages` | vendor | Manage own packages + add-ons |
| GET | `/api/vendor` / PUT | vendor | Own profile (allowlisted fields) |
| GET | `/api/vendor/dashboard` | vendor | Real revenue/booking stats |
| GET | `/api/bookings` | ✓ | Own bookings, paginated |
| POST | `/api/bookings` | customer | Request a booking (conflict-checked) |
| PUT | `/api/bookings/:id/status` | vendor | Accept / decline / complete |
| POST | `/api/bookings/:id/cancel` | customer | Cancel own booking |

## Security notes

- zod validation with **explicit field allowlists** on every mutating
  endpoint — platform-owned fields (`is_verified`, `rating`, `total_reviews`)
  are structurally unsettable by clients.
- JWTs: HS256 pinned, secret required at startup (≥ 32 chars, no fallback),
  role re-read from the DB on every request.
- Timing-equalized login (no user enumeration); generic 401s; ownership
  failures return 404 so ids can't be probed.
- Rate limits: 300 req/15 min globally, 10 failed auth attempts/15 min;
  2 MB JSON body cap; helmet headers.
- Demo tradeoff: the client keeps its JWT in `localStorage` (simple, survives
  refresh). A production deployment should move to httpOnly cookies + CSRF
  protection.
- **If you previously cloned this repo with Supabase keys in `.env` files:**
  those keys are burned — rotate them in the Supabase dashboard. The app no
  longer uses Supabase at all, and all `.env*` files are now gitignored.

## Scripts

| Command (repo root) | What it does |
|---|---|
| `npm run install:all` | Install root, server, and client dependencies |
| `npm run dev` | Run API + client together (concurrently) |
| `npm run seed` | Reset and repopulate the SQLite database |
| `npm run build` | Build server (tsc) and client (vite) |
| `npm run typecheck` | Typecheck both sides |
| `npm run start:server` | Run the built server (`server/dist`) |

## Spec-driven development

The [`openspec/`](openspec/) directory follows the OpenSpec convention:

- `specs/` — current capability specs (auth, vendors, packages, bookings,
  **booking-conflicts**, vendor-dashboard) as requirements with WHEN/THEN
  scenarios.
- `changes/archive/` — completed change proposals with design docs, including
  `add-booking-conflict-resolution`, whose `design.md` covers the slot-enum
  vs. time-range tradeoff and why `BEGIN IMMEDIATE` suffices in SQLite's
  single-writer model.
