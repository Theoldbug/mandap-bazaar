# Harden API security

## Why

A security review found: mass-assignment on vendor/package updates (a vendor
could set `is_verified: true` and `rating: 5` on themselves), an IDOR letting
vendors without a profile row read all bookings, a login user-enumeration
timing oracle, a hard-coded JWT secret fallback, no input validation on any
endpoint, no body size limit, and no brute-force protection on auth routes.

## What Changes

- zod validation with explicit field allowlists on every mutating endpoint;
  platform-owned fields (`is_verified`, `rating`, `total_reviews`) removed
  from the vendor-update schema entirely.
- Vendor profile id resolved once in auth middleware; vendor-role users
  without a profile are rejected with 403 before any handler runs.
- Timing-safe login (dummy bcrypt compare for unknown emails) with a single
  generic 401 message.
- Fail-fast config: server refuses to start without a ≥ 32-char `JWT_SECRET`;
  `jwt.verify` pins `algorithms: ['HS256']`.
- Request body limit; strict auth rate limit (10 failures / 15 min) on top of
  the global limit.
- Ownership failures return 404 (not 403) so resource ids cannot be probed.
- Secrets hygiene: `.gitignore` coverage for all `.env*` and `*.db` files;
  stray duplicate env file removed; leaked Supabase keys flagged for rotation.

## Impact

- Affected specs: auth, vendors, bookings, packages
- Affected code: `server/src/middleware/*`, `server/src/routes/*`,
  `server/src/config.ts`, `.gitignore`
