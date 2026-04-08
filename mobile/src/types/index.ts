export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'owner';
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
}

export interface Analytics {
  total_bookings: number;
  total_earnings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  today_bookings: number;
}
