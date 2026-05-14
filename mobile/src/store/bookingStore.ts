import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { subscribeToBookings, unsubscribeFromBookings } from '../lib/supabase';
import type { TimeSlot } from '../types';
import { useAuthStore } from './authStore';
import { normalizeSlotTimeToHHMM } from '../lib/utils';

interface BookingState {
  // Real-time subscription
  activeChannel: RealtimeChannel | null;
  /** Booking date (YYYY-MM-DD) the live channel is applying deltas for */
  watchedBookingDate: string | null;

  // Slot state
  slots: TimeSlot[];
  allowMultipleBookings: boolean;
  isRealtimeConnected: boolean;
  
  // Conflict tracking
  justBookedSlots: Set<string>; // Slots that were just booked by others
  
  // Actions
  subscribeToSlots: (salonId: string, date: string, currentSlots: TimeSlot[], allowMultiple: boolean) => void;
  unsubscribeFromSlots: () => void;
  updateSlots: (slots: TimeSlot[], allowMultiple: boolean) => void;
  markSlotJustBooked: (date: string, time: string) => void;
  clearJustBookedSlot: (date: string, time: string) => void;
  setRealtimeStatus: (connected: boolean) => void;
  refreshSlots: () => void;
  needsRefresh: boolean;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  activeChannel: null,
  watchedBookingDate: null,
  slots: [],
  allowMultipleBookings: false,
  isRealtimeConnected: false,
  justBookedSlots: new Set(),
  needsRefresh: false,

  // Subscribe to real-time updates for a salon and date
  subscribeToSlots: (salonId: string, date: string, currentSlots: TimeSlot[], allowMultiple: boolean) => {
    // Unsubscribe from any existing channel
    get().unsubscribeFromSlots();

    // Set initial slots
    set({
      slots: currentSlots,
      allowMultipleBookings: allowMultiple,
      justBookedSlots: new Set(),
      needsRefresh: false,
      watchedBookingDate: date,
    });

    // Subscribe to Supabase real-time
    const channel = subscribeToBookings(
      salonId,
      date,
      (payload) => {
        const { slots, allowMultipleBookings, watchedBookingDate } = get();
        const scopeDate = watchedBookingDate ?? date;

        // Handle different event types
        if (payload.eventType === 'INSERT') {
          const newBooking = payload.new;
          if (!newBooking) return;

          const myUserId = useAuthStore.getState().user?.id;
          if (myUserId && newBooking.user_id === myUserId) {
            return;
          }

          const bookedTime = normalizeSlotTimeToHHMM(newBooking.time_slot);

          if (!allowMultipleBookings) {
            // Single mode: mark slot as unavailable immediately
            const updatedSlots = slots.map((slot) =>
              normalizeSlotTimeToHHMM(slot.time) === bookedTime
                ? { ...slot, available: false, booking_count: (slot.booking_count || 0) + 1 }
                : slot
            );

            const scopedKey = `${scopeDate}::${bookedTime}`;
            set({
              slots: updatedSlots,
              justBookedSlots: new Set([...get().justBookedSlots, scopedKey]),
            });

            setTimeout(() => {
              get().clearJustBookedSlot(scopeDate, bookedTime);
            }, 3000);
          } else {
            // Multi mode: increment count, mark full if at capacity
            const updatedSlots = slots.map((slot) => {
              if (normalizeSlotTimeToHHMM(slot.time) !== bookedTime) return slot;
              const newCount = (slot.booking_count || 0) + 1;
              const max = slot.max_bookings || 1;
              return { ...slot, booking_count: newCount, available: newCount < max };
            });
            set({ slots: updatedSlots });
          }
        } else if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
          // A booking was cancelled or updated - trigger a refresh
          // We don't know the exact state without re-fetching
          set({ needsRefresh: true });
        }
      }
    );

    set({ activeChannel: channel, isRealtimeConnected: true });
  },

  // Unsubscribe from real-time updates
  unsubscribeFromSlots: () => {
    const { activeChannel } = get();
    if (activeChannel) {
      unsubscribeFromBookings(activeChannel);
    }
    set({
      activeChannel: null,
      isRealtimeConnected: false,
      justBookedSlots: new Set(),
      watchedBookingDate: null,
    });
  },

  // Update slots (called when fetching slots)
  updateSlots: (slots: TimeSlot[], allowMultiple: boolean) => {
    set({
      slots,
      allowMultipleBookings: allowMultiple,
      needsRefresh: false,
    });
  },

  // Mark a slot as just booked by someone else
  markSlotJustBooked: (date: string, time: string) => {
    const scopedKey = `${date}::${time}`;
    set({ justBookedSlots: new Set([...get().justBookedSlots, scopedKey]) });
  },

  // Clear the "just booked" indicator
  clearJustBookedSlot: (date: string, time: string) => {
    const scopedKey = `${date}::${time}`;
    const newSet = new Set(get().justBookedSlots);
    newSet.delete(scopedKey);
    set({ justBookedSlots: newSet });
  },

  // Set real-time connection status
  setRealtimeStatus: (connected: boolean) => {
    set({ isRealtimeConnected: connected });
  },

  // Mark that slots need a refresh
  refreshSlots: () => {
    set({ needsRefresh: true });
  },
}));
