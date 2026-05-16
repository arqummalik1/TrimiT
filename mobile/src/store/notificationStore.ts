/**
 * Real-Time Notification Store
 * In-app notifications and sound for owner booking updates.
 */

import { create } from 'zustand';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { Booking } from '../types';

const devLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

export interface BookingNotification {
  id: string;
  booking: Booking;
  type: 'new_booking' | 'status_change' | 'cancellation';
  timestamp: number;
  read: boolean;
  actionRequired: boolean;
}

interface NotificationState {
  notifications: BookingNotification[];
  unreadCount: number;
  activeNotification: BookingNotification | null;
  soundEnabled: boolean;
  sound: AudioPlayer | null;
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
  notifications: [],
  unreadCount: 0,
  activeNotification: null,
  soundEnabled: true,
  sound: null,

  addNotification: (booking, type) => {
    devLog('[NotificationStore] Adding notification:', { bookingId: booking.id, type });

    const notification: BookingNotification = {
      id: `${booking.id}-${Date.now()}`,
      booking,
      type,
      timestamp: Date.now(),
      read: false,
      actionRequired: type === 'new_booking' && booking.status === 'pending',
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: type === 'new_booking' ? state.unreadCount + 1 : state.unreadCount,
      activeNotification: type === 'new_booking' ? notification : state.activeNotification,
    }));

    if (type === 'new_booking') {
      void get().playNotificationSound();
    }
  },

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

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

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

  clearAllNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      activeNotification: null,
    });
  },

  setActiveNotification: (notification) => {
    set({ activeNotification: notification });
    if (notification) {
      get().markAsRead(notification.id);
    }
  },

  playNotificationSound: async () => {
    const { soundEnabled, sound } = get();
    if (!soundEnabled || !sound) return;

    try {
      sound.seekTo(0);
      sound.play();
    } catch (error) {
      console.warn('[NotificationStore] Failed to play sound:', error);
    }
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
  },

  initializeSound: async () => {
    try {
      const player = createAudioPlayer(require('../../assets/sounds/notification.mp3'));
      set({ sound: player });
      devLog('[NotificationStore] Sound initialized');
    } catch (error) {
      console.warn('[NotificationStore] Failed to load sound:', error);
    }
  },

  cleanupSound: async () => {
    const { sound } = get();
    if (sound) {
      try {
        sound.remove();
      } catch (error) {
        console.warn('[NotificationStore] Failed to unload sound:', error);
      }
      set({ sound: null });
    }
  },
}));
