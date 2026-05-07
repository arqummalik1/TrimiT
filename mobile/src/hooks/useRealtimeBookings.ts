/**
 * useRealtimeBookings Hook
 * ────────────────────────────────────────────────────────────────────────────
 * Optimized real-time subscription hook for booking updates.
 * Handles subscription lifecycle, prevents memory leaks, and manages state efficiently.
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
  const isSubscribedRef = useRef(false);

  // Memoized callback to handle booking changes
  const handleBookingChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Booking>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      console.log('[RealtimeBookings] Event:', eventType, {
        new: newRecord,
        old: oldRecord,
      });

      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });

      // Handle different event types
      switch (eventType) {
        case 'INSERT': {
          if (newRecord) {
            const booking = newRecord as Booking;
            
            // Add notification
            addNotification(booking, 'new_booking');
            
            // Call custom callback
            onNewBooking?.(booking);
            
            console.log('[RealtimeBookings] New booking received:', booking.id);
          }
          break;
        }

        case 'UPDATE': {
          if (newRecord && oldRecord) {
            const booking = newRecord as Booking;
            const oldBooking = oldRecord as Booking;
            
            // Only notify if status changed
            if (booking.status !== oldBooking.status) {
              addNotification(booking, 'status_change');
            }
            
            // Call custom callback
            onBookingUpdate?.(booking);
            
            console.log('[RealtimeBookings] Booking updated:', booking.id);
          }
          break;
        }

        case 'DELETE': {
          if (oldRecord) {
            const booking = oldRecord as Booking;
            
            // Add cancellation notification
            addNotification(booking, 'cancellation');
            
            // Call custom callback
            onBookingDelete?.(booking.id);
            
            console.log('[RealtimeBookings] Booking deleted:', booking.id);
          }
          break;
        }
      }
    },
    [queryClient, addNotification, onNewBooking, onBookingUpdate, onBookingDelete]
  );

  useEffect(() => {
    // Don't subscribe if disabled or no salon ID
    if (!enabled || !salonId || isSubscribedRef.current) {
      return;
    }

    console.log('[RealtimeBookings] Subscribing to salon:', salonId);

    // Subscribe to real-time updates
    const channel = subscribeToSalonBookings(salonId, handleBookingChange);
    channelRef.current = channel;
    isSubscribedRef.current = true;

    // Cleanup function
    return () => {
      console.log('[RealtimeBookings] Unsubscribing from salon:', salonId);
      
      if (channelRef.current) {
        unsubscribeFromBookings(channelRef.current);
        channelRef.current = null;
      }
      
      isSubscribedRef.current = false;
    };
  }, [salonId, enabled, handleBookingChange]);

  return {
    isSubscribed: isSubscribedRef.current,
  };
}
