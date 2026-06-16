/**
 * useRealtimeBookings Hook
 * Real-time subscription for booking rows (owner dashboard + notifications).
 */

import { useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribeToSalonBookings, syncSupabaseAuthSession, unsubscribeFromBookings } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { logger } from '../lib/logger';
import { useNotificationStore } from '../store/notificationStore';
import type { Booking } from '../types';
import { bookingService } from '../services/bookingService';
import { setOwnerRealtimeSubscribed } from '../lib/realtimeOwnerGuard';

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

const INVALIDATE_DEBOUNCE_MS = 400;

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
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callbacksRef = useRef({
    onNewBooking,
    onBookingUpdate,
    onBookingDelete,
  });
  callbacksRef.current = { onNewBooking, onBookingUpdate, onBookingDelete };

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimerRef.current) {
      clearTimeout(invalidateTimerRef.current);
    }
    invalidateTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
    }, INVALIDATE_DEBOUNCE_MS);
  }, [queryClient]);

  const handleBookingChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Booking>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const showInApp = AppState.currentState === 'active';

      logger.debug('[RealtimeBookings] postgres_changes', {
        eventType,
        salonId,
        bookingId: (newRecord as Booking | null)?.id ?? (oldRecord as Booking | null)?.id,
      });

      scheduleInvalidate();

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
          }
          break;
        }

        default:
          break;
      }
    },
    [addNotification, salonId, scheduleInvalidate]
  );

  const handleBookingChangeRef = useRef(handleBookingChange);
  handleBookingChangeRef.current = handleBookingChange;

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !salonId) {
        setOwnerRealtimeSubscribed(false);
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

        logger.debug('[RealtimeBookings] Subscribing', { salonId, enabled });

        const channel = subscribeToSalonBookings(salonId, (payload) => {
          handleBookingChangeRef.current(payload);
        });
        if (cancelled) {
          unsubscribeFromBookings(channel);
          return;
        }
        channelRef.current = channel;
        setOwnerRealtimeSubscribed(true);
      })();

      return () => {
        cancelled = true;
        setOwnerRealtimeSubscribed(false);
        if (invalidateTimerRef.current) {
          clearTimeout(invalidateTimerRef.current);
          invalidateTimerRef.current = null;
        }
        if (channelRef.current) {
          unsubscribeFromBookings(channelRef.current);
          channelRef.current = null;
        }
      };
    }, [salonId, enabled])
  );

  return {
    isSubscribed: !!channelRef.current,
  };
}
