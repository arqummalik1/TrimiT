/**
 * Client-side notification UX preferences (sound / vibration).
 * Persisted locally; push category toggles live on the user row in Supabase.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAndroidNotificationChannels } from '../lib/notifications';

interface NotificationPrefsState {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      vibrationEnabled: true,
      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
        void ensureAndroidNotificationChannels();
      },
      setVibrationEnabled: (enabled) => {
        set({ vibrationEnabled: enabled });
        void ensureAndroidNotificationChannels();
      },
    }),
    {
      name: 'trimit-notification-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
