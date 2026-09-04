# vendors Specification

## Purpose

Public vendor discovery for customers, and self-service profile management for
vendors — with platform-owned trust fields protected.

## Requirements

### Requirement: Public vendor browsing

`GET /api/vendors` SHALL list only verified vendors with optional
category/city/search filters, ordered by rating; `GET /api/vendors/:id` SHALL
return a verified vendor with their active packages and add-ons;
`GET /api/vendors/:id/reviews` SHALL return reviews with reviewer names.
Public responses never include private vendor fields.

#### Scenario: Unverified vendors hidden

- **WHEN** a visitor browses vendors
- **THEN** unverified vendors appear in neither the list nor detail responses

### Requirement: Profile updates cannot touch trust fields

`PUT /api/vendor` SHALL accept only business fields (name, description,
categories, contact, address, images, response time). `is_verified`,
`rating`, and `total_reviews` are absent from the schema — a request including
them has those fields stripped, making self-verification structurally
impossible.

#### Scenario: Self-verification attempt

- **WHEN** a vendor sends `{"is_verified": true, "rating": 5}`
- **THEN** the stored profile's verification and rating are unchanged
