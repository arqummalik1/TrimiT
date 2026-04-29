export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'owner';
  push_token?: string;
  created_at: string;
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
  images: string[];
  allow_multiple_bookings_per_slot?: boolean;
  max_bookings_per_slot?: number;
  auto_accept?: boolean;
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
  payment_method?: 'salon_cash' | 'online';
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
