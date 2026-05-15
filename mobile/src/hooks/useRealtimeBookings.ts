/**
 * useRealtimeBookings Hook
 * ────────────────────────────────────────────────────────────────────────────
 * Real-time subscription for booking rows (owner dashboard + notifications).
 * Uses Supabase JS client — requires syncSupabaseAuthSession() so RLS allows events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribeToSalonBookings, syncSupabaseAuthSession, unsubscribeFromBookings } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { logger } from '../lib/logger';
import { useNotificationStore } from '../store/notificationStore';
import type { Booking } from '../types';
import { bookingService } from '../services/bookingService';

async function enrichBookingForNotification(raw: Booking): Promise<Booking> {
  try {
    return await bookingService.getBooking(raw.id);
  } catch {
    return raw;
  }
}

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

  const shouldShowInAppNotification = useCallback(() => {
    return AppState.currentState !== 'active';
  }, []);

  const handleBookingChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Booking>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const showInApp = shouldShowInAppNotification();

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

      // Global staleTime is very high (persisted cache). Invalidation alone can leave UI stale;
      // force active owner queries to hit the network immediately.
      void Promise.all([
        queryClient.refetchQueries({ queryKey: ['ownerBookings'] }),
        queryClient.refetchQueries({ queryKey: ['recentBookings'] }),
        queryClient.refetchQueries({ queryKey: ['salonBookings'] }),
        queryClient.refetchQueries({ queryKey: ['ownerAnalytics'] }),
      ]).catch(() => {});

      switch (eventType) {
        case 'INSERT': {
          if (newRecord) {
            const booking = newRecord as Booking;
            void (async () => {
              const enriched = await enrichBookingForNotification(booking);
              if (showInApp) {
                try {
                  addNotification(enriched, 'new_booking');
                } catch (e) {
                  logger.warn('[RealtimeBookings] addNotification INSERT failed', {
                    bookingId: booking.id,
                    err: String(e),
                  });
                }
              }
              callbacksRef.current.onNewBooking?.(enriched);
              console.log('[RealtimeBookings] INSERT handled', booking.id);
            })();
          }
          break;
        }

        case 'UPDATE': {
          if (newRecord && oldRecord) {
            const booking = newRecord as Booking;
            const oldBooking = oldRecord as Booking;
            if (booking.status !== oldBooking.status && showInApp) {
              void (async () => {
                const enriched = await enrichBookingForNotification(booking);
                try {
                  addNotification(enriched, 'status_change');
                } catch (e) {
                  logger.warn('[RealtimeBookings] addNotification UPDATE failed', { err: String(e) });
                }
              })();
            }
            callbacksRef.current.onBookingUpdate?.(booking);
            console.log('[RealtimeBookings] UPDATE handled', booking.id);
          }
          break;
        }

        case 'DELETE': {
          if (oldRecord) {
            const booking = oldRecord as Booking;
            if (showInApp) {
              try {
                addNotification(booking, 'cancellation');
              } catch (e) {
                logger.warn('[RealtimeBookings] addNotification DELETE failed', { err: String(e) });
              }
            }
            callbacksRef.current.onBookingDelete?.(booking.id);
            console.log('[RealtimeBookings] DELETE handled', booking.id);
          }
          break;
        }

        default:
          break;
      }
    },
    [queryClient, addNotification, salonId, shouldShowInAppNotification]
  );

  useEffect(() => {
    if (!enabled || !salonId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { token, refreshToken } = useAuthStore.getState();
      if (token) {
        await syncSupabaseAuthSession(token, refreshToken);
      }
      if (cancelled) {
        return;
      }

      console.log('[RealtimeBookings] Subscribing', { salonId, enabled });

      const channel = subscribeToSalonBookings(salonId, handleBookingChange);
      if (cancelled) {
        unsubscribeFromBookings(channel);
        return;
      }
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
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
