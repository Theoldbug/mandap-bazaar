// Full SQLite schema. Every statement is idempotent (IF NOT EXISTS) so the
// schema is applied on every server start.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer','vendor')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  business_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '[]',
  logo_url TEXT,
  cover_image_url TEXT,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  response_time_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendor_profiles(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '[]',
  starting_price INTEGER NOT NULL CHECK (starting_price >= 0),
  images TEXT NOT NULL DEFAULT '[]',
  inclusions TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS addons (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  vendor_id TEXT NOT NULL REFERENCES vendor_profiles(id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL CHECK (event_time IN ('morning','afternoon','evening','full_day')),
  venue_address TEXT NOT NULL,
  venue_city TEXT NOT NULL,
  special_instructions TEXT NOT NULL DEFAULT '',
  total_amount INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','completed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_addons (
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  PRIMARY KEY (booking_id, addon_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendor_profiles(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  booking_id TEXT REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_vendor_date ON bookings(vendor_id, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_packages_vendor ON packages(vendor_id);
CREATE INDEX IF NOT EXISTS idx_addons_package ON addons(package_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON reviews(vendor_id);

-- DB-level backstop against double-accepting the exact same slot. The
-- full_day-vs-slot overlap case cannot be expressed in a unique index and is
-- enforced by the booking service's BEGIN IMMEDIATE transaction instead.
CREATE UNIQUE INDEX IF NOT EXISTS uq_accepted_slot
  ON bookings(vendor_id, event_date, event_time) WHERE status = 'accepted';
`;
