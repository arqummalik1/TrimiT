/**
 * Real-Time Notification Store
 * ────────────────────────────────────────────────────────────────────────────
 * Professional notification management for real-time booking updates.
 * Handles in-app notifications, sound playback, and notification state.
 */

import { create } from 'zustand';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import type { Booking } from '../types';

export interface BookingNotification {
  id: string;
  booking: Booking;
  type: 'new_booking' | 'status_change' | 'cancellation';
  timestamp: number;
  read: boolean;
  actionRequired: boolean; // For pending bookings that need owner action
}

interface NotificationState {
  // Notifications
  notifications: BookingNotification[];
  unreadCount: number;
  activeNotification: BookingNotification | null;
  
  // Sound
  soundEnabled: boolean;
  sound: Audio.Sound | null;
  
  // Actions
  addNotification: (booking: Booking, type: BookingNotification['type']) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setActiveNotification: (notification: BookingNotification | null) => void;
  playNotificationSound: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => void;
  initializeSound: () => Promise<void>;
  cleanupSound: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  activeNotification: null,
  soundEnabled: true,
  sound: null,

  // Add a new notification
  addNotification: (booking, type) => {
    const notification: BookingNotification = {
      id: `${booking.id}-${Date.now()}`,
      booking,
      type,
      timestamp: Date.now(),
      read: false,
      actionRequired: type === 'new_booking' && booking.status === 'pending',
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // Keep last 50
      unreadCount: state.unreadCount + 1,
      activeNotification: notification, // Show immediately
    }));

    // Play sound
    get().playNotificationSound();

    // Schedule local notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: getNotificationTitle(type, booking),
        body: getNotificationBody(type, booking),
        sound: true,
        data: { bookingId: booking.id, type },
      },
      trigger: null, // Immediate
    });
  },

  // Mark notification as read
  markAsRead: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.read) return state;

      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });
  },

  // Mark all as read
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Clear a notification
  clearNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.read;

      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        activeNotification: state.activeNotification?.id === id ? null : state.activeNotification,
      };
    });
  },

  // Clear all notifications
  clearAllNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      activeNotification: null,
    });
  },

  // Set active notification (for modal display)
  setActiveNotification: (notification) => {
    set({ activeNotification: notification });
    if (notification) {
      get().markAsRead(notification.id);
    }
  },

  // Play notification sound
  playNotificationSound: async () => {
    const { soundEnabled, sound } = get();
    if (!soundEnabled || !sound) return;

    try {
      await sound.replayAsync();
    } catch (error) {
      console.warn('[NotificationStore] Failed to play sound:', error);
    }
  },

  // Toggle sound
  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
  },

  // Initialize sound
  initializeSound: async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.mp3'),
        { shouldPlay: false }
      );
      set({ sound });
    } catch (error) {
      console.warn('[NotificationStore] Failed to load sound:', error);
    }
  },

  // Cleanup sound
  cleanupSound: async () => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.warn('[NotificationStore] Failed to unload sound:', error);
      }
      set({ sound: null });
    }
  },
}));

// Helper functions
function getNotificationTitle(type: BookingNotification['type'], booking: Booking): string {
  switch (type) {
    case 'new_booking':
      return '🔔 New Booking Received!';
    case 'status_change':
      return `📋 Booking ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`;
    case 'cancellation':
      return '❌ Booking Cancelled';
    default:
      return 'Booking Update';
  }
}

function getNotificationBody(type: BookingNotification['type'], booking: Booking): string {
  const serviceName = booking.services?.name || 'Service';
  const date = booking.booking_date;
  const time = booking.time_slot;
  const customerName = booking.users?.name || 'Customer';

  switch (type) {
    case 'new_booking':
      return `${customerName} booked ${serviceName} on ${date} at ${time}`;
    case 'status_change':
      return `${serviceName} booking on ${date} at ${time} is now ${booking.status}`;
    case 'cancellation':
      return `${serviceName} booking on ${date} at ${time} was cancelled`;
    default:
      return `Booking update for ${serviceName}`;
  }
}
