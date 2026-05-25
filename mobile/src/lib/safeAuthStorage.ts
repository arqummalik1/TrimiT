import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

const AUTH_PERSIST_KEY = 'trimit-auth-storage';

/**
 * Zustand persist storage for auth.
 *
 * Reads route through secureStorage which now transparently falls back to
 * AsyncStorage when SecureStore is unavailable / over its size limit. We keep
 * an extra AsyncStorage read as a defense-in-depth so legacy installs that
 * never wrote through secureStorage's fallback can still rehydrate.
 *
 * Validates JSON on read so corrupt data cannot crash startup (was a real
 * APK crash source).
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
      // Corrupt blob — wipe both backends so we don't keep returning bad data.
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
    // secureStorage handles SecureStore + AsyncStorage fallback internally.
    await secureStorage.setItem(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    await secureStorage.removeItem(name);
    // Belt-and-braces: nuke any stray AsyncStorage copy under the same key.
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
