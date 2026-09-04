# Tasks

## 1. Validation layer

- [x] 1.1 Add `validate(schema)` middleware returning 400 with field details
- [x] 1.2 Write zod schemas for signup, login, booking creation, status
      change, package create/update, vendor profile update
- [x] 1.3 Convert update endpoints to explicit allowlists (no `req.body`
      passthrough anywhere)

## 2. Auth hardening

- [x] 2.1 Fail-fast `JWT_SECRET` validation at startup (no default)
- [x] 2.2 Pin `algorithms: ['HS256']` in `jwt.verify`
- [x] 2.3 Timing-safe login with dummy bcrypt compare
- [x] 2.4 Strict rate limit on `/api/auth/login` and `/api/auth/signup`

## 3. Authorization fixes

- [x] 3.1 Resolve `vendorProfileId` in middleware; 403 vendors with no profile
- [x] 3.2 Scope every booking/package/vendor query by the resolved id
- [x] 3.3 Return 404 for not-owned resources

## 4. Transport & hygiene

- [x] 4.1 JSON body size limit
- [x] 4.2 Root `.gitignore` covering `.env*`, `dist/`, `*.db*`
- [x] 4.3 Remove stray `server/env`; document Supabase key rotation

## 5. Verification

- [x] 5.1 Curl suite: mass-assignment stripped, oversized body 413,
      11th failed login 429, tampered JWT 401, foreign resource 404
