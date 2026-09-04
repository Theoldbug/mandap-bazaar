# packages Specification

## Purpose

Vendors create and manage packages with add-ons; customers browse active
packages from verified vendors.

## Requirements

### Requirement: Vendor package CRUD with field allowlists

Package create/update SHALL accept only allowlisted fields (name, description,
categories, `starting_price` ≥ 0, up to 10 images, up to 30 inclusions,
`is_active`, up to 20 add-ons). `vendor_id` and timestamps are never taken
from the request. A package and its add-ons SHALL be saved in one transaction;
add-ons use a replace strategy (removed rows deleted, kept rows upserted).

#### Scenario: Negative price rejected

- **WHEN** a vendor submits `starting_price: -1`
- **THEN** the API responds 400 `VALIDATION_ERROR`

#### Scenario: Ownership on update

- **WHEN** a vendor updates or deletes a package they do not own
- **THEN** the API responds 404

### Requirement: Soft deletion

Deleting a package SHALL set `is_active = 0` rather than removing the row, so
existing bookings keep their package reference.

#### Scenario: Delete preserves bookings

- **WHEN** a vendor deletes a package that has bookings
- **THEN** the bookings still resolve their package details

### Requirement: Public browsing filters

`GET /api/packages/public` and `GET /api/packages/:id` SHALL expose only
active packages whose vendor is verified, with optional category/city/search
filters and real pagination counts.

#### Scenario: Draft package hidden by id

- **WHEN** an inactive package is requested by id without authentication
- **THEN** the API responds 404
