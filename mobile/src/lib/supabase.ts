import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Booking } from '../types';

// Supabase configuration — must be provided via EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Create Supabase client with realtime enabled
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: false, // We handle auth via our own backend
    autoRefreshToken: false,
  },
});

// Type for booking payload
type BookingPayload = RealtimePostgresChangesPayload<Booking>;

// Helper to subscribe to booking changes for a specific salon and date
export const subscribeToBookings = (
  salonId: string,
  bookingDate: string,
  onChange: (payload: BookingPayload) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`bookings:${salonId}:${bookingDate}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload: BookingPayload) => {
        // Filter by date in the callback since we can't filter by both in the subscription
        const newRecord = payload.new as Record<string, any> | undefined;
        const oldRecord = payload.old as Record<string, any> | undefined;
        if (newRecord?.booking_date === bookingDate || oldRecord?.booking_date === bookingDate) {
          onChange(payload);
        }
      }
    )
    .subscribe();

  return channel;
};

// Helper to unsubscribe from a channel
export const unsubscribeFromBookings = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel);
};

// Helper to subscribe to all salon bookings (for owner dashboard)
export const subscribeToSalonBookings = (
  salonId: string,
  onChange: (payload: BookingPayload) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`salon-bookings:${salonId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload: BookingPayload) => {
        onChange(payload);
      }
    )
    .subscribe();

  return channel;
};
