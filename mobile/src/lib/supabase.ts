import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Booking } from '../types';
import { buildConfig } from './buildConfig';

const SUPABASE_URL = buildConfig.supabaseUrl || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = buildConfig.supabaseAnonKey || 'placeholder';

if (__DEV__ && (!buildConfig.supabaseUrl || !buildConfig.supabaseAnonKey)) {
  console.warn(
    '⚠️ [Supabase] Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env'
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
    // Keep access tokens fresh so Realtime postgres_changes websockets stay authorized.
    autoRefreshToken: true,
  },
});

// Type for booking payload
type BookingPayload = RealtimePostgresChangesPayload<Booking>;

/** Normalize Postgres `date` / timestamptz string to YYYY-MM-DD for comparisons */
export function bookingDateMatchesFilter(pgValue: unknown, filterYyyyMmDd: string): boolean {
  if (pgValue == null) return false;
  const raw = String(pgValue);
  const norm = raw.length >= 10 ? raw.slice(0, 10) : raw;
  return norm === filterYyyyMmDd;
}

/**
 * Mirror the Supabase session used for REST/JWT into the JS client so Realtime
 * `postgres_changes` respects RLS (authenticated policies on `bookings`).
 * Call after login / token restore; call signOut on logout.
 */
export async function syncSupabaseAuthSession(
  accessToken: string | null,
  refreshToken: string | null
): Promise<void> {
  try {
    if (!accessToken) {
      await supabase.auth.signOut();
      await supabase.realtime.setAuth();
      return;
    }
    if (refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.warn('[Supabase Auth] setSession failed:', error.message);
        await supabase.realtime.setAuth(accessToken);
        return;
      }
      if (__DEV__) {
        console.log('[Supabase Auth] Session synced for Realtime', {
          userId: data.session?.user?.id,
          expiresAt: data.session?.expires_at,
        });
      }
      return;
    }
    // Access token only: still attach user JWT to Realtime so `postgres_changes` passes RLS.
    // (Missing refresh_token is common for older persisted sessions; push-only setSession used to bail here.)
    await supabase.realtime.setAuth(accessToken);
    if (__DEV__) {
      console.warn(
        '[Supabase Auth] No refresh_token — Realtime JWT set manually. Sign out and log in again for token refresh.'
      );
    }
  } catch (e) {
    console.warn('[Supabase Auth] syncSupabaseAuthSession error', e);
  }
}

// Helper to subscribe to booking changes for a specific salon and date
export const subscribeToBookings = (
  salonId: string,
  bookingDate: string,
  onChange: (payload: BookingPayload) => void
): RealtimeChannel => {
  if (__DEV__) {
    console.log('[Supabase] Subscribing to bookings:', { salonId, bookingDate });
  }
  
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
        if (__DEV__) {
          console.log('[Supabase] Booking change received:', payload.eventType, payload);
        }
        const newRecord = payload.new as Record<string, unknown> | undefined;
        const oldRecord = payload.old as Record<string, unknown> | undefined;
        const newDate = newRecord?.booking_date;
        const oldDate = oldRecord?.booking_date;
        if (bookingDateMatchesFilter(newDate, bookingDate) || bookingDateMatchesFilter(oldDate, bookingDate)) {
          onChange(payload);
        }
      }
    )
    .subscribe((status, err) => {
      if (__DEV__) {
        console.log('[Supabase] bookings channel status:', { salonId, bookingDate, status, err: err?.message });
      }
    });

  return channel;
};

// ── Realtime auto re-join ────────────────────────────────────────────────────
// A channel that hits CHANNEL_ERROR / TIMED_OUT stays dead: Supabase never
// re-joins it, so the list silently stops updating until the screen remounts.
// We re-join with exponential backoff instead.
const REALTIME_RETRY_BASE_MS = 1000;
const REALTIME_RETRY_MAX_MS = 30000;
const REALTIME_RETRY_JITTER_RATIO = 0.2;

type RealtimeSubscribeStatus = Parameters<NonNullable<Parameters<RealtimeChannel['subscribe']>[0]>>[0];

/**
 * Backoff for realtime re-join attempts: 1s, 2s, 4s, 8s … capped at 30s, plus
 * up to 20% jitter so every device on a flaky network doesn't retry in lockstep.
 * `attempt` is 0-based.
 */
export function computeRealtimeRetryDelayMs(attempt: number, random: () => number = Math.random): number {
  const exponent = Math.max(0, Math.floor(attempt));
  const base = Math.min(REALTIME_RETRY_BASE_MS * 2 ** exponent, REALTIME_RETRY_MAX_MS);
  return Math.round(base + base * REALTIME_RETRY_JITTER_RATIO * random());
}

/**
 * Subscribe a channel and keep it alive: retries CHANNEL_ERROR / TIMED_OUT with
 * exponential backoff, resets the backoff on SUBSCRIBED, and cancels any pending
 * retry as soon as the caller tears the channel down (`unsubscribeFromBookings`
 * / `supabase.removeChannel`, both of which go through `channel.unsubscribe()`).
 * Returns the same channel instance so callers keep their existing teardown.
 */
const subscribeWithBackoff = (
  channel: RealtimeChannel,
  label: string,
  context: Record<string, string>
): RealtimeChannel => {
  // Bound before patching so our own re-join doesn't cancel itself.
  const leaveChannel = channel.unsubscribe.bind(channel);
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const cancelRetry = (): void => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const rejoin = async (): Promise<void> => {
    if (stopped) return;
    try {
      await leaveChannel();
    } catch (e) {
      if (__DEV__) {
        console.warn(`[Supabase] ${label} leave before re-join failed`, { ...context, err: String(e) });
      }
    }
    if (stopped) return;
    if (__DEV__) {
      console.log(`[Supabase] ${label} re-subscribing`, { ...context, attempt });
    }
    channel.subscribe(onStatus);
  };

  const scheduleRetry = (): void => {
    if (stopped || retryTimer) return;
    const delay = computeRealtimeRetryDelayMs(attempt);
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void rejoin();
    }, delay);
  };

  const onStatus = (status: RealtimeSubscribeStatus, err?: Error): void => {
    if (status === 'SUBSCRIBED') {
      attempt = 0;
      cancelRetry();
      if (__DEV__) {
        console.log(`[Supabase] ${label} status`, { ...context, status });
      }
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error(`[Supabase] ❌ ${label} ${status}`, { ...context, err: err?.message });
      scheduleRetry();
      return;
    }
    if (__DEV__) {
      console.log(`[Supabase] ${label} status`, { ...context, status, err: err?.message });
    }
  };

  channel.unsubscribe = async (timeout?: number) => {
    stopped = true;
    cancelRetry();
    return leaveChannel(timeout);
  };

  channel.subscribe(onStatus);
  return channel;
};

// Helper to unsubscribe from a channel
export const unsubscribeFromBookings = (channel: RealtimeChannel): void => {
  if (__DEV__) {
    console.log('[Supabase] Unsubscribing from channel');
  }
  supabase.removeChannel(channel);
};

// Helper to subscribe to all salon bookings (for owner dashboard)
export const subscribeToSalonBookings = (
  salonId: string,
  onChange: (payload: BookingPayload) => void
): RealtimeChannel => {
  if (__DEV__) {
    console.log('[Supabase] Subscribing to salon bookings:', salonId);
  }

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
        if (__DEV__) {
          console.log('[Supabase] ✅ BOOKING EVENT RECEIVED:', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
        onChange(payload);
      }
    );

  return subscribeWithBackoff(channel, 'salon-bookings', { salonId });
};

/**
 * Subscribe to bookings owned by the current customer (used by MyBookingsScreen
 * to refresh the list automatically when status changes — owner accept/reject,
 * complete, reschedule, etc. — without a pull-to-refresh).
 */
export const subscribeToUserBookings = (
  userId: string,
  onChange: (payload: BookingPayload) => void
): RealtimeChannel => {
  if (__DEV__) {
    console.log('[Supabase] Subscribing to user bookings:', userId);
  }

  const channel = supabase
    .channel(`user-bookings:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `user_id=eq.${userId}`,
      },
      (payload: BookingPayload) => {
        if (__DEV__) {
          console.log('[Supabase] user-bookings event:', payload.eventType);
        }
        onChange(payload);
      }
    );

  return subscribeWithBackoff(channel, 'user-bookings', { userId });
};
