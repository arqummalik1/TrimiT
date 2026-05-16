import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

const AUTH_PERSIST_KEY = 'trimit-auth-storage';

/**
 * Zustand persist storage: SecureStore for tokens, with AsyncStorage fallback.
 * Validates JSON on read so corrupt data cannot crash startup (common APK crash).
 */
export const safeAuthStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    let raw: string | null = null;
    try {
      raw = await secureStorage.getItem(name);
    } catch {
      raw = null;
    }

    if (!raw && name === AUTH_PERSIST_KEY) {
      try {
        raw = await AsyncStorage.getItem(name);
      } catch {
        raw = null;
      }
    }

    if (!raw) {
      return null;
    }

    try {
      JSON.parse(raw);
      return raw;
    } catch {
      try {
        await secureStorage.removeItem(name);
        await AsyncStorage.removeItem(name);
      } catch {
        // ignore cleanup errors
      }
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await secureStorage.setItem(name, value);
    } catch {
      // SecureStore size limits / device quirks — fallback so login still works
      await AsyncStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await secureStorage.removeItem(name);
    } catch {
      // ignore
    }
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
