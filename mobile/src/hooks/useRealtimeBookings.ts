/**
 * useRealtimeBookings Hook
 * ────────────────────────────────────────────────────────────────────────────
 * Real-time subscription for booking rows (owner dashboard + notifications).
 * Uses Supabase JS client — requires syncSupabaseAuthSession() so RLS allows events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribeToSalonBookings, unsubscribeFromBookings } from '../lib/supabase';
import { useNotificationStore } from '../store/notificationStore';
import type { Booking } from '../types';

interface UseRealtimeBookingsOptions {
  salonId: string | undefined;
  enabled?: boolean;
  onNewBooking?: (booking: Booking) => void;
  onBookingUpdate?: (booking: Booking) => void;
  onBookingDelete?: (bookingId: string) => void;
}

/**
 * Hook to subscribe to real-time booking updates for a salon.
 * Automatically invalidates React Query cache and triggers notifications.
 */
export function useRealtimeBookings({
  salonId,
  enabled = true,
  onNewBooking,
  onBookingUpdate,
  onBookingDelete,
}: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const callbacksRef = useRef({
    onNewBooking,
    onBookingUpdate,
    onBookingDelete,
  });
  callbacksRef.current = { onNewBooking, onBookingUpdate, onBookingDelete };

  const handleBookingChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Booking>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      console.log('[RealtimeBookings] postgres_changes', {
        eventType,
        salonId,
        bookingId: (newRecord as Booking | null)?.id ?? (oldRecord as Booking | null)?.id,
      });

      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });

      switch (eventType) {
        case 'INSERT': {
          if (newRecord) {
            const booking = newRecord as Booking;
            addNotification(booking, 'new_booking');
            callbacksRef.current.onNewBooking?.(booking);
            console.log('[RealtimeBookings] INSERT handled', booking.id);
          }
          break;
        }

        case 'UPDATE': {
          if (newRecord && oldRecord) {
            const booking = newRecord as Booking;
            const oldBooking = oldRecord as Booking;
            if (booking.status !== oldBooking.status) {
              addNotification(booking, 'status_change');
            }
            callbacksRef.current.onBookingUpdate?.(booking);
            console.log('[RealtimeBookings] UPDATE handled', booking.id);
          }
          break;
        }

        case 'DELETE': {
          if (oldRecord) {
            const booking = oldRecord as Booking;
            addNotification(booking, 'cancellation');
            callbacksRef.current.onBookingDelete?.(booking.id);
            console.log('[RealtimeBookings] DELETE handled', booking.id);
          }
          break;
        }

        default:
          break;
      }
    },
    [queryClient, addNotification, salonId]
  );

  useEffect(() => {
    if (!enabled || !salonId) {
      return;
    }

    console.log('[RealtimeBookings] Subscribing', { salonId, enabled });

    const channel = subscribeToSalonBookings(salonId, handleBookingChange);
    channelRef.current = channel;

    return () => {
      console.log('[RealtimeBookings] Cleanup unsubscribe', { salonId });
      if (channelRef.current) {
        unsubscribeFromBookings(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [salonId, enabled, handleBookingChange]);

  return {
    isSubscribed: !!channelRef.current,
  };
}
