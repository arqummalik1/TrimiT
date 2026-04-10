import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Booking } from '../types';

// Supabase configuration — reads from environment, falls back to hardcoded for development
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://etpoecagsfhodtfuhblk.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cG9lY2Fnc2Zob2R0ZnVoYmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjYwODksImV4cCI6MjA1OTY0MjA4OX0.8mE0D6eIE4iF4u6z9n6T4h8K3q0E1m5v7j2K5p3Q8r0';

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
    .subscribe((status: string) => {
      console.log('Realtime subscription status:', status);
    });

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
    .subscribe((status: string) => {
      console.log('Salon bookings subscription status:', status);
    });

  return channel;
};
