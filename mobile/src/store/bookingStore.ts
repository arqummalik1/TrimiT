import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { subscribeToBookings, unsubscribeFromBookings } from '../lib/supabase';
import type { TimeSlot } from '../types';

interface BookingState {
  // Real-time subscription
  activeChannel: RealtimeChannel | null;
  
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
  markSlotJustBooked: (time: string) => void;
  clearJustBookedSlot: (time: string) => void;
  setRealtimeStatus: (connected: boolean) => void;
  refreshSlots: () => void;
  needsRefresh: boolean;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  activeChannel: null,
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
    });

    // Subscribe to Supabase real-time
    const channel = subscribeToBookings(
      salonId,
      date,
      (payload) => {
        const { slots, allowMultipleBookings } = get();
        
        // Handle different event types
        if (payload.eventType === 'INSERT') {
          const newBooking = payload.new;
          if (!newBooking) return;
          
          // Find the slot that was booked
          const bookedTime = newBooking.time_slot;
          
          if (!allowMultipleBookings) {
            // Mark slot as unavailable
            const updatedSlots = slots.map(slot =>
              slot.time === bookedTime
                ? { ...slot, available: false, has_bookings: true, booking_count: (slot.booking_count || 0) + 1 }
                : slot
            );
            
            set({
              slots: updatedSlots,
              justBookedSlots: new Set([...get().justBookedSlots, bookedTime]),
            });
            
            // Auto-clear the "just booked" indicator after 3 seconds
            setTimeout(() => {
              get().clearJustBookedSlot(bookedTime);
            }, 3000);
          } else {
            // Multiple bookings allowed - just increment count
            const updatedSlots = slots.map(slot =>
              slot.time === bookedTime
                ? { ...slot, has_bookings: true, booking_count: (slot.booking_count || 0) + 1 }
                : slot
            );
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
  markSlotJustBooked: (time: string) => {
    set({ justBookedSlots: new Set([...get().justBookedSlots, time]) });
  },

  // Clear the "just booked" indicator
  clearJustBookedSlot: (time: string) => {
    const newSet = new Set(get().justBookedSlots);
    newSet.delete(time);
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
