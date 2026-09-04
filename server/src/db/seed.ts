import bcrypt from 'bcryptjs';
import { db, nowISO, uuid } from './index';
import type { EventCategory, TimeSlot } from '../../../shared/types';

// Demo seed data: run with `npm run seed` (from server/) or `npm run seed` at the root.
// Wipes all rows and repopulates. Every account's password is `password123`.

const PASSWORD_HASH = bcrypt.hashSync('password123', 12);

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

const now = nowISO();

db.exec('PRAGMA foreign_keys = OFF');
for (const table of ['booking_addons', 'reviews', 'bookings', 'addons', 'packages', 'vendor_profiles', 'users']) {
  db.exec(`DELETE FROM ${table}`);
}
db.exec('PRAGMA foreign_keys = ON');

// ---- Users ----
interface SeedUser { id: string; email: string; name: string; role: 'customer' | 'vendor' }
const customers: SeedUser[] = [
  { id: uuid(), email: 'priya@example.com', name: 'Priya Sharma', role: 'customer' },
  { id: uuid(), email: 'rahul@example.com', name: 'Rahul Verma', role: 'customer' },
];
const vendorUsers: SeedUser[] = [
  { id: uuid(), email: 'royaldecor@example.com', name: 'Arjun Mehta', role: 'vendor' },
  { id: uuid(), email: 'blossomevents@example.com', name: 'Kavita Iyer', role: 'vendor' },
  { id: uuid(), email: 'spicecaterers@example.com', name: 'Imran Khan', role: 'vendor' },
  { id: uuid(), email: 'djbeats@example.com', name: 'Rohan Kapoor', role: 'vendor' },
  { id: uuid(), email: 'jaipurmandap@example.com', name: 'Suresh Rathore', role: 'vendor' },
];

const insertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
for (const u of [...customers, ...vendorUsers]) {
  insertUser.run(u.id, u.email, PASSWORD_HASH, u.name, u.role, now, now);
}

// ---- Vendor profiles ----
interface SeedVendor {
  id: string;
  user: SeedUser;
  business: string;
  description: string;
  categories: EventCategory[];
  city: string;
  state: string;
  verified: boolean;
  rating: number;
  reviews: number;
}
const vendors: SeedVendor[] = [
  {
    id: uuid(), user: vendorUsers[0], business: 'Royal Decor House',
    description: 'Premium wedding and mandap decor with 12 years of experience across Mumbai. Fresh flowers, stage design and full venue transformation.',
    categories: ['marriage_decor', 'ring_ceremony'], city: 'Mumbai', state: 'Maharashtra',
    verified: true, rating: 4.8, reviews: 5,
  },
  {
    id: uuid(), user: vendorUsers[1], business: 'Blossom Events',
    description: 'Boutique decor studio for haldi, mehendi and sangeet functions. Marigold specialities and pastel themes.',
    categories: ['haldi_decor', 'mehendi_sangeet', 'birthday_decor'], city: 'Delhi', state: 'Delhi',
    verified: true, rating: 4.6, reviews: 4,
  },
  {
    id: uuid(), user: vendorUsers[2], business: 'Spice Route Caterers',
    description: 'Live food stalls and full-course catering — chaat counters, South Indian, Mughlai and dessert bars.',
    categories: ['food_stalls'], city: 'Mumbai', state: 'Maharashtra',
    verified: true, rating: 4.5, reviews: 3,
  },
  {
    id: uuid(), user: vendorUsers[3], business: 'DJ Beats & Lights',
    description: 'High-energy DJ setups, dance floors, truss lighting and sound systems for sangeets and receptions.',
    categories: ['dj_lighting', 'mehendi_sangeet'], city: 'Bengaluru', state: 'Karnataka',
    verified: true, rating: 4.3, reviews: 3,
  },
  {
    id: uuid(), user: vendorUsers[4], business: 'Jaipur Mandap Works',
    description: 'Traditional Rajasthani mandap structures, royal entrances and heritage-style wedding decor.',
    categories: ['marriage_decor', 'haldi_decor'], city: 'Jaipur', state: 'Rajasthan',
    verified: true, rating: 4.7, reviews: 0,
  },
];

const insertVendor = db.prepare(
  `INSERT INTO vendor_profiles (id, user_id, business_name, description, category, address, city, state,
     phone, email, is_verified, rating, total_reviews, response_time_minutes, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
for (const v of vendors) {
  insertVendor.run(
    v.id, v.user.id, v.business, v.description, JSON.stringify(v.categories),
    `${v.city} Main Road`, v.city, v.state, '+91 98765 43210', v.user.email,
    v.verified ? 1 : 0, v.rating, v.reviews, 45, now, now
  );
}

// ---- Packages + addons ----
const insertPackage = db.prepare(
  `INSERT INTO packages (id, vendor_id, name, description, category, starting_price, images, inclusions,
     is_active, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
);
const insertAddon = db.prepare(
  `INSERT INTO addons (id, package_id, name, description, price, is_default) VALUES (?, ?, ?, ?, ?, ?)`
);

interface SeedPackage {
  id: string;
  vendor: SeedVendor;
  name: string;
  description: string;
  categories: EventCategory[];
  price: number;
  image: string;
  inclusions: string[];
  addons: { name: string; description: string; price: number; isDefault?: boolean }[];
}
const packages: SeedPackage[] = [
  {
    id: uuid(), vendor: vendors[0], name: 'Royal Wedding Mandap',
    description: 'Complete mandap setup with floral arch, stage decor, seating backdrop and aisle styling.',
    categories: ['marriage_decor'], price: 150000,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    inclusions: ['Floral mandap (4 pillars)', 'Stage backdrop', 'Aisle decor', 'Entrance arch', 'On-site team of 8'],
    addons: [
      { name: 'Fresh orchid upgrade', description: 'Imported orchids across the mandap', price: 35000 },
      { name: 'LED wall backdrop', description: '12x10 ft LED wall behind the stage', price: 25000 },
      { name: 'Cold pyros (4)', description: 'Stage-safe cold fireworks for the varmala moment', price: 8000 },
      { name: 'Photo-booth corner', description: 'Styled selfie corner with props', price: 12000, isDefault: true },
    ],
  },
  {
    id: uuid(), vendor: vendors[0], name: 'Ring Ceremony Elegance',
    description: 'Intimate engagement decor with pastel florals, couple seating and table centrepieces.',
    categories: ['ring_ceremony'], price: 60000,
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
    inclusions: ['Couple stage', 'Ring platter styling', 'Table centrepieces (10)', 'Welcome board'],
    addons: [
      { name: 'Canopy seating', description: 'Draped canopy over couple seating', price: 15000 },
      { name: 'Rose-petal shower', description: 'Petal shower at ring exchange', price: 5000 },
    ],
  },
  {
    id: uuid(), vendor: vendors[1], name: 'Marigold Haldi Morning',
    description: 'Bright marigold and banana-leaf haldi setup with seating and photo corners.',
    categories: ['haldi_decor'], price: 35000,
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
    inclusions: ['Marigold backdrop', 'Low seating for 30', 'Haldi thaal styling', 'Umbrella props'],
    addons: [
      { name: 'Flower jewellery set', description: 'For the bride and 4 bridesmaids', price: 6000, isDefault: true },
      { name: 'Dhol player (2 hrs)', description: 'Live dhol for the ceremony', price: 7000 },
    ],
  },
  {
    id: uuid(), vendor: vendors[1], name: 'Sangeet Night Glam',
    description: 'Dance-floor-ready sangeet decor with drapes, fairy lights and lounge seating.',
    categories: ['mehendi_sangeet'], price: 80000,
    image: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
    inclusions: ['Stage + backdrop', 'Fairy-light ceiling', 'Lounge seating for 50', 'Mehendi corner'],
    addons: [
      { name: 'Extra lounge cluster', description: 'Seating for 20 more guests', price: 10000 },
      { name: 'Neon name sign', description: 'Custom couple-name neon board', price: 9000 },
    ],
  },
  {
    id: uuid(), vendor: vendors[2], name: 'Chaat & Street Food Carnival',
    description: 'Six live chaat and street-food counters with servers and decor-matched stalls.',
    categories: ['food_stalls'], price: 90000,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800',
    inclusions: ['6 live counters', 'Servers & chefs', 'Disposables & napkins', '300 guest capacity'],
    addons: [
      { name: 'Dessert bar', description: 'Jalebi-rabri, kulfi and brownie counter', price: 20000 },
      { name: 'Coffee & chai station', description: 'Filter coffee and masala chai bar', price: 12000, isDefault: true },
    ],
  },
  {
    id: uuid(), vendor: vendors[2], name: 'Grand Wedding Feast',
    description: 'Full-course veg and non-veg buffet with regional specialities for up to 500 guests.',
    categories: ['food_stalls'], price: 250000,
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
    inclusions: ['5-course buffet', 'Live tandoor', 'Salad & raita bar', 'Service staff of 25'],
    addons: [
      { name: 'Seafood section', description: 'Coastal specialities counter', price: 45000 },
    ],
  },
  {
    id: uuid(), vendor: vendors[3], name: 'Sangeet DJ Blast',
    description: 'Pro DJ with dance floor, truss lighting, smoke effects and 6-hour coverage.',
    categories: ['dj_lighting', 'mehendi_sangeet'], price: 55000,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    inclusions: ['DJ + console (6 hrs)', '12x12 dance floor', 'Truss lighting', 'Smoke machine'],
    addons: [
      { name: 'LED dance floor', description: 'Upgrade to pixel LED floor', price: 18000 },
      { name: 'Follow spot + sharpy pack', description: '4 sharpies and a follow spot', price: 15000 },
    ],
  },
  {
    id: uuid(), vendor: vendors[4], name: 'Heritage Rajwada Mandap',
    description: 'Hand-carved wooden mandap with royal Rajasthani drapes, brass urlis and traditional torans.',
    categories: ['marriage_decor'], price: 200000,
    image: 'https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=800',
    inclusions: ['Carved wooden mandap', 'Royal entrance gate', 'Brass & marigold styling', 'Rajasthani folk duo (1 hr)'],
    addons: [
      { name: 'Elephant statue pair', description: 'Life-size decorative elephants at entrance', price: 22000 },
      { name: 'Vintage palki entry', description: 'Decorated palanquin for the bridal entry', price: 30000 },
    ],
  },
];

const addonIdsByPackage = new Map<string, { id: string; name: string; price: number }[]>();
for (const p of packages) {
  insertPackage.run(
    p.id, p.vendor.id, p.name, p.description, JSON.stringify(p.categories), p.price,
    JSON.stringify([p.image]), JSON.stringify(p.inclusions), now, now
  );
  const list: { id: string; name: string; price: number }[] = [];
  for (const a of p.addons) {
    const addonId = uuid();
    insertAddon.run(addonId, p.id, a.name, a.description, a.price, a.isDefault ? 1 : 0);
    list.push({ id: addonId, name: a.name, price: a.price });
  }
  addonIdsByPackage.set(p.id, list);
}

// ---- Bookings ----
const insertBooking = db.prepare(
  `INSERT INTO bookings (id, customer_id, vendor_id, package_id, event_type, event_date, event_time,
     venue_address, venue_city, special_instructions, total_amount, amount_paid, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertBookingAddon = db.prepare(
  `INSERT INTO booking_addons (booking_id, addon_id, name, price) VALUES (?, ?, ?, ?)`
);

interface SeedBooking {
  customer: SeedUser;
  pkg: SeedPackage;
  eventType: EventCategory;
  date: string;
  slot: TimeSlot;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  addonCount: number;
  createdAt?: string;
}
const conflictDate = daysFromNow(21);
const seedBookings: SeedBooking[] = [
  // Two pending requests for the SAME vendor/date/slot — accepting one
  // auto-declines the other (the conflict-resolution demo).
  { customer: customers[0], pkg: packages[0], eventType: 'marriage_decor', date: conflictDate, slot: 'full_day', status: 'pending', addonCount: 2 },
  { customer: customers[1], pkg: packages[0], eventType: 'marriage_decor', date: conflictDate, slot: 'evening', status: 'pending', addonCount: 1 },

  { customer: customers[0], pkg: packages[2], eventType: 'haldi_decor', date: daysFromNow(10), slot: 'morning', status: 'accepted', addonCount: 1 },
  { customer: customers[1], pkg: packages[6], eventType: 'mehendi_sangeet', date: daysFromNow(14), slot: 'evening', status: 'accepted', addonCount: 1 },
  { customer: customers[0], pkg: packages[4], eventType: 'food_stalls', date: daysFromNow(30), slot: 'evening', status: 'pending', addonCount: 1 },
  { customer: customers[1], pkg: packages[3], eventType: 'mehendi_sangeet', date: daysFromNow(45), slot: 'evening', status: 'pending', addonCount: 0 },

  { customer: customers[0], pkg: packages[7], eventType: 'marriage_decor', date: daysFromNow(-40), slot: 'full_day', status: 'completed', addonCount: 1, createdAt: monthsAgoISO(2) },
  { customer: customers[1], pkg: packages[5], eventType: 'food_stalls', date: daysFromNow(-70), slot: 'evening', status: 'completed', addonCount: 0, createdAt: monthsAgoISO(3) },
  { customer: customers[0], pkg: packages[1], eventType: 'ring_ceremony', date: daysFromNow(-15), slot: 'evening', status: 'declined', addonCount: 0, createdAt: monthsAgoISO(1) },
  { customer: customers[1], pkg: packages[2], eventType: 'haldi_decor', date: daysFromNow(-5), slot: 'morning', status: 'cancelled', addonCount: 0, createdAt: monthsAgoISO(1) },
];

const bookingIds: string[] = [];
for (const b of seedBookings) {
  const id = uuid();
  bookingIds.push(id);
  const chosenAddons = (addonIdsByPackage.get(b.pkg.id) ?? []).slice(0, b.addonCount);
  const total = b.pkg.price + chosenAddons.reduce((s, a) => s + a.price, 0);
  const created = b.createdAt ?? now;
  insertBooking.run(
    id, b.customer.id, b.pkg.vendor.id, b.pkg.id, b.eventType, b.date, b.slot,
    '221B Wedding Lane, Near City Mall', b.pkg.vendor.city,
    'Please coordinate timings with the venue manager.',
    total, b.status === 'completed' ? total : 0, b.status, created, created
  );
  for (const a of chosenAddons) {
    insertBookingAddon.run(id, a.id, a.name, a.price);
  }
}

// ---- Reviews (consistent with each vendor's rating/total_reviews) ----
const insertReview = db.prepare(
  `INSERT INTO reviews (id, vendor_id, customer_id, booking_id, rating, comment, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const reviewTexts: [number, string][] = [
  [5, 'Absolutely stunning decor — guests could not stop taking photos!'],
  [5, 'Professional team, on time, and the setup exceeded expectations.'],
  [4, 'Beautiful work overall. Minor delay in the morning but handled well.'],
  [5, 'Worth every rupee. The stage looked straight out of a magazine.'],
  [4, 'Great coordination and lovely floral choices.'],
];
let reviewIdx = 0;
for (const v of vendors) {
  for (let i = 0; i < v.reviews; i++) {
    const [rating, comment] = reviewTexts[(reviewIdx + i) % reviewTexts.length];
    insertReview.run(
      uuid(), v.id, customers[i % customers.length].id, null, rating, comment,
      monthsAgoISO((i % 4) + 1)
    );
  }
  reviewIdx++;
}

console.log('Seed complete.\n');
console.log('Demo accounts (password for all: password123)');
console.log('  Customers:');
for (const c of customers) console.log(`    ${c.email}  (${c.name})`);
console.log('  Vendors:');
for (const v of vendors) console.log(`    ${v.user.email}  (${v.business})`);
console.log(`\nConflict demo: two pending bookings for Royal Decor House on ${conflictDate} — accept one as royaldecor@example.com and the other is auto-declined.`);
