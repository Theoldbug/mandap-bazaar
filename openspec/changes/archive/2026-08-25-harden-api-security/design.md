# Design: API security hardening

## Context

The API trusted client input everywhere: updates spread `req.body` into SQL,
authorization depended on per-route filters that could silently no-op, and
auth had a known-default secret fallback.

## Decisions

### Allowlists over blocklists

The old code deleted a few known-bad fields (`delete updates.id`) and passed
the rest through — new columns became writable by default. The new schemas
enumerate exactly what a client may set; platform-owned fields are not merely
rejected, they don't exist in the schema, so they can never be forwarded to
SQL.

### Authorization resolved once, in middleware

The vendor→profile lookup previously happened per-route with an `if (vendor)`
guard; when the lookup failed the filter was skipped and the query ran
unscoped (the all-bookings IDOR). Resolving `vendorProfileId` in
`authenticate` and rejecting profile-less vendors makes the scoped id a
precondition every handler can rely on.

### 404 for not-owned resources

Responding 403 confirms the resource exists. Ownership failures are
indistinguishable from missing rows.

### Timing-equalized login

`bcrypt.compare` runs against a module-level dummy hash when the email is
unknown, so the unknown-email path costs the same as the wrong-password path.
