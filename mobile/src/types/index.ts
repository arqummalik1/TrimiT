export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'owner';
  push_token?: string;
  push_enabled?: boolean;
  notify_bookings?: boolean;
  notify_booking_updates?: boolean;
  notify_promotional?: boolean;
  notify_reminders?: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  notify_bookings: boolean;
  notify_booking_updates: boolean;
  notify_promotional: boolean;
  notify_reminders: boolean;
}

export interface Salon {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  opening_time: string;
  closing_time: string;
  /** Primary thumbnail (synced with images[0] on save). */
  image_url?: string | null;
  images: string[];
  allow_multiple_bookings_per_slot?: boolean;
  max_bookings_per_slot?: number;
  auto_accept?: boolean;
  show_offers?: boolean;
  subscription_active?: boolean;
  /** Owner kill-switch: false = not taking NEW bookings right now. */
  accepting_bookings?: boolean;
  /** ISO time the salon auto-reopens; null/absent = indefinite (manual reopen). */
  closed_until?: string | null;
  /** When the salon was closed (for the >24h reminder). */
  closed_at?: string | null;
  /** Optional owner reason shown to customers (e.g. "On holiday"). */
  closed_reason?: string | null;
  /** Salon's UPI ID (VPA, e.g. "salon@bank"). Required to accept UPI payments. */
  upi_id?: string | null;
  /** Optional uploaded UPI QR code image URL. */
  upi_qr_code?: string | null;
  /** Optional payout metadata (owner-entered, shown for reference only). */
  bank_name?: string | null;
  account_holder_name?: string | null;
  created_at: string;
  services?: Service[];
  reviews?: Review[];
  avg_rating?: number;
  review_count?: number;
  distance?: number;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  // ─── Extended fields (backward-compatible, all optional) ─────────────────
  image_url?: string | null;
  original_price?: number | null;     // price before discount
  discount_percentage?: number | null; // 0–100
  is_on_offer?: boolean | null;
  offer_tagline?: string | null;
  offer_start_date?: string | null;   // YYYY-MM-DD
  offer_end_date?: string | null;     // YYYY-MM-DD
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  salon_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: 'salon_cash' | 'upi';
  /** UPI verification lifecycle (only meaningful for UPI bookings). */
  payment_verification_status?:
    | 'not_required'
    | 'initiated'
    | 'waiting_verification'
    | 'verified'
    | 'rejected'
    | 'timeout';
  /** Human-friendly booking reference (e.g. shown to the customer/owner). */
  booking_reference?: string;
  amount: number;
  created_at: string;
  salons?: Salon;
  services?: Service;
  users?: User;
}

export interface Review {
  id: string;
  user_id: string;
  salon_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  users?: User;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booking_count?: number;
  max_bookings?: number;
  allow_multiple?: boolean;
}

export interface SlotsResponse {
  slots: TimeSlot[];
  allow_multiple_bookings_per_slot: boolean;
  max_bookings_per_slot: number;
}

export interface SalonSettings {
  allow_multiple_bookings_per_slot: boolean;
  max_bookings_per_slot: number;
}

export interface TrendData {
  date: string;
  count: number;
}

export interface PeakHourData {
  hour: number;
  bookings: number;
}

export interface PopularServiceData {
  name: string;
  bookings: number;
  revenue: number;
}

export interface StatusDistributionData {
  status: string;
  count: number;
  color: string;
}

export interface WeeklyTrendData {
  week: string;
  bookings: number;
}

export interface Analytics {
  period: string;
  total_bookings: number;
  total_earnings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  today_bookings: number;
  bookings_trend: TrendData[];
  peak_hours: PeakHourData[];
  popular_services: PopularServiceData[];
  status_distribution: StatusDistributionData[];
  customer_trends: WeeklyTrendData[];
}

export interface Promotion {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

// ── Serviceability (city coverage) ──────────────────────────────────────────
export interface ServiceAreaRef {
  name: string;
  slug: string;
  launching_soon: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  reason: string;
  matched_area: ServiceAreaRef | null;
  nearest_area: ServiceAreaRef | null;
  nearest_distance_km: number | null;
  active_areas: string[];
}

export interface WaitlistJoinPayload {
  email: string;
  name?: string;
  lat?: number;
  lng?: number;
  area_label?: string;
  source?: string;
}
