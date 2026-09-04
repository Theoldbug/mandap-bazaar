# Design: Booking conflict resolution

## Context

"Conflict" was previously undefined: `event_date` was a timestamp and
`event_time` a free-form string ("6:00 PM"), so overlap detection would have
required parsing arbitrary strings into intervals. And with the old Supabase
REST client, a check-then-insert could not be made atomic at all — two
concurrent requests could both pass the check.

## Goals / Non-Goals

- **Goals:** impossible double-accepts; conflicts surfaced at the earliest
  moment (request time); accepted bookings automatically clear competing
  requests; every decision atomic.
- **Non-Goals:** arbitrary time ranges, multi-day events, vendor-defined
  capacity (> 1 simultaneous event), waitlists.

## Decisions

### Slot enum over time ranges

A fixed enum (`morning | afternoon | evening | full_day`) makes the conflict
predicate exact and expressible in SQL:

```sql
event_time = :slot OR event_time = 'full_day' OR :slot = 'full_day'
```

Interval math (starts_at/ends_at + overlap comparisons) was considered and
rejected: it complicates the form UX, invites timezone bugs, and models
precision the domain doesn't have — decor vendors book by day-part.
The enum reuses the existing `event_time` column name, minimizing churn.

### Why BEGIN IMMEDIATE suffices

SQLite allows exactly one writer at a time. `BEGIN IMMEDIATE` acquires the
write lock at transaction start rather than at first write, so the conflict
SELECT inside the transaction is already serialized against every other
writer: no other transaction can insert or accept a conflicting booking
between our check and our write. This gives the same guarantee that Postgres
would need `SELECT ... FOR UPDATE` or a serializable isolation level to
provide — with no lock-ordering deadlock risk, because there is only one lock.
`busy_timeout = 5000` makes concurrent writers queue instead of erroring.

### Why the unique index can't do all the work

`uq_accepted_slot (vendor_id, event_date, event_time) WHERE status='accepted'`
catches double-accepts of the *same* slot even if a future code path bypasses
the service layer. But a UNIQUE index cannot express "full_day conflicts with
morning" — those rows have different key values. So the index is a backstop,
not the mechanism; the transaction predicate is authoritative. A UNIQUE
violation is still mapped to 409 `SLOT_CONFLICT` for defense in depth.

### Accept-time auto-decline

Declining competing pendings inside the same transaction as the accept means
the marketplace is never in a state where an accepted booking coexists with
acceptable-looking pending conflicts. The count is returned so the vendor UI
can say "1 conflicting request was automatically declined" — the vendor never
has to clean up manually.

### One entry point for status changes

All transitions flow through `transitionBooking` (ownership → state machine →
actor rules → side effects). Routes cannot express an invalid transition
because they don't touch the `status` column directly.
