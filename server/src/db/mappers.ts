import type {
  Addon,
  Booking,
  BookingAddon,
  Package,
  Review,
  User,
  VendorProfile,
} from '../../../shared/types';

// SQLite rows come back with JSON-encoded arrays and 0/1 booleans; these
// mappers convert rows into the shared domain shapes the API returns.

type Row = Record<string, unknown>;

function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function mapUser(row: Row): User {
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: row.full_name as string,
    avatar_url: (row.avatar_url as string | null) ?? undefined,
    role: row.role as User['role'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapVendorProfile(row: Row): VendorProfile {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    business_name: row.business_name as string,
    description: row.description as string,
    category: json(row.category, []),
    logo_url: (row.logo_url as string | null) ?? undefined,
    cover_image_url: (row.cover_image_url as string | null) ?? undefined,
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    phone: row.phone as string,
    email: row.email as string,
    is_verified: !!row.is_verified,
    rating: row.rating as number,
    total_reviews: row.total_reviews as number,
    response_time_minutes: row.response_time_minutes as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapPackage(row: Row): Package {
  return {
    id: row.id as string,
    vendor_id: row.vendor_id as string,
    name: row.name as string,
    description: row.description as string,
    category: json(row.category, []),
    starting_price: row.starting_price as number,
    images: json(row.images, []),
    inclusions: json(row.inclusions, []),
    is_active: !!row.is_active,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapAddon(row: Row): Addon {
  return {
    id: row.id as string,
    package_id: row.package_id as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as number,
    is_default: !!row.is_default,
  };
}

export function mapBooking(row: Row, addons: BookingAddon[]): Booking {
  return {
    id: row.id as string,
    customer_id: row.customer_id as string,
    vendor_id: row.vendor_id as string,
    package_id: row.package_id as string,
    event_type: row.event_type as Booking['event_type'],
    event_date: row.event_date as string,
    event_time: row.event_time as Booking['event_time'],
    venue_address: row.venue_address as string,
    venue_city: row.venue_city as string,
    addons,
    special_instructions: row.special_instructions as string,
    total_amount: row.total_amount as number,
    amount_paid: row.amount_paid as number,
    status: row.status as Booking['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function mapBookingAddon(row: Row): BookingAddon {
  return {
    addon_id: row.addon_id as string,
    name: row.name as string,
    price: row.price as number,
  };
}

export function mapReview(row: Row): Review {
  return {
    id: row.id as string,
    vendor_id: row.vendor_id as string,
    customer_id: row.customer_id as string,
    booking_id: (row.booking_id as string | null) ?? undefined,
    rating: row.rating as number,
    comment: row.comment as string,
    created_at: row.created_at as string,
    customer_name: (row.customer_name as string | null) ?? undefined,
  };
}
