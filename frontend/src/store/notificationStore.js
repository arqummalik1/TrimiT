import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      soundEnabled: true,

      addNotification: (notification) => {
        const newNotification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          isRead: false,
          ...notification,
        };

        console.log('[NotificationStore] Adding notification:', newNotification);
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));

        return newNotification;
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          );
          const unreadCount = notifications.filter((n) => !n.isRead).length;
          return { notifications, unreadCount };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      clearNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter((n) => n.id !== id);
          const unreadCount = notifications.filter((n) => !n.isRead).length;
          return { notifications, unreadCount };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
