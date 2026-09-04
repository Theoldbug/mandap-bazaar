export type UserRole = 'customer' | 'vendor';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  category: EventCategory[];
  logo_url?: string;
  cover_image_url?: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  response_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export type EventCategory =
  | 'marriage_decor'
  | 'haldi_decor'
  | 'mehendi_sangeet'
  | 'ring_ceremony'
  | 'birthday_decor'
  | 'food_stalls'
  | 'dj_lighting';

export const EVENT_CATEGORIES: { value: EventCategory; label: string; icon: string }[] = [
  { value: 'marriage_decor', label: 'Marriage Decor', icon: '💒' },
  { value: 'haldi_decor', label: 'Haldi Decor', icon: '🌼' },
  { value: 'mehendi_sangeet', label: 'Mehendi & Sangeet', icon: '🎵' },
  { value: 'ring_ceremony', label: 'Ring Ceremony', icon: '💍' },
  { value: 'birthday_decor', label: 'Birthday Decor', icon: '🎂' },
  { value: 'food_stalls', label: 'Food Stalls', icon: '🍛' },
  { value: 'dj_lighting', label: 'DJ & Lighting', icon: '🎧' },
];

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'full_day';

export const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: 'Morning (8 AM – 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM – 5 PM)' },
  { value: 'evening', label: 'Evening (5 PM – 11 PM)' },
  { value: 'full_day', label: 'Full Day' },
];

export interface Package {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  category: EventCategory[];
  starting_price: number;
  images: string[];
  inclusions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Addon {
  id: string;
  package_id: string;
  name: string;
  description: string;
  price: number;
  is_default: boolean;
}

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

// Single source of truth for the booking lifecycle. Terminal states have no exits.
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['accepted', 'declined', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  declined: [],
  completed: [],
  cancelled: [],
};

// Price snapshot taken at booking time — later addon price edits never change a booking.
export interface BookingAddon {
  addon_id: string;
  name: string;
  price: number;
}

export interface Booking {
  id: string;
  customer_id: string;
  vendor_id: string;
  package_id: string;
  event_type: EventCategory;
  event_date: string; // YYYY-MM-DD
  event_time: TimeSlot;
  venue_address: string;
  venue_city: string;
  addons: BookingAddon[];
  special_instructions: string;
  total_amount: number;
  amount_paid: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDetails extends Booking {
  vendor?: Pick<VendorProfile, 'id' | 'business_name' | 'city' | 'phone' | 'logo_url'>;
  package?: Pick<Package, 'id' | 'name' | 'starting_price' | 'images'>;
  customer?: Pick<User, 'id' | 'full_name' | 'email'>;
}

export interface Review {
  id: string;
  vendor_id: string;
  customer_id: string;
  booking_id?: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_name?: string;
}

export interface VendorWithPackages extends VendorProfile {
  packages: (Package & { addons: Addon[] })[];
}

export interface DashboardStats {
  total_revenue: number;
  active_bookings: number;
  pending_requests: number;
  average_rating: number;
  revenue_trend: { month: string; revenue: number }[];
}

// ---- API request/response contracts ----

export interface AuthResponse {
  user: User;
  vendorProfile: VendorProfile | null;
  token: string;
}

export interface CreateBookingRequest {
  package_id: string;
  event_type: EventCategory;
  event_date: string; // YYYY-MM-DD
  event_time: TimeSlot;
  venue_address: string;
  venue_city: string;
  selected_addon_ids: string[];
  special_instructions?: string;
}

export interface ApiErrorBody {
  error: string;
  code?: 'SLOT_CONFLICT' | 'INVALID_TRANSITION' | 'INVALID_ADDONS' | 'VALIDATION_ERROR';
  conflicting_booking_id?: string;
  details?: unknown;
}

export interface TransitionResult {
  booking: Booking;
  auto_declined_count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}
