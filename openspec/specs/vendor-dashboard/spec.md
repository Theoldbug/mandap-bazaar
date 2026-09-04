# vendor-dashboard Specification

## Purpose

Give vendors a truthful business overview computed from their real bookings.

## Requirements

### Requirement: Real aggregates only

`GET /api/vendor/dashboard` SHALL compute all statistics from the database:
total revenue (sum of accepted + completed booking totals), active bookings
(accepted count), pending requests (pending count), average rating (from the
profile), and a 6-month revenue trend grouped by `event_date` month. No
statistic is hard-coded.

#### Scenario: Trend reflects bookings

- **WHEN** a vendor's accepted or completed bookings fall in a month within
  the last six months
- **THEN** that month's trend bar equals the sum of those bookings' totals

#### Scenario: Empty months are zero

- **WHEN** a month in the window has no accepted/completed bookings
- **THEN** the trend still includes that month with revenue 0
