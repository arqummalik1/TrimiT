import * as SecureStore from 'expo-secure-store';
import { StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

/**
 * A storage wrapper that uses expo-secure-store for sensitive data on native platforms,
 * and falls back to localStorage on web.
 * 
 * NOTE: expo-secure-store is not supported on web in the same way.
 * We use a strict check to prevent calling native methods on web.
 */
const isWeb = Platform.OS === 'web';

export const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (isWeb) {
        return typeof window !== 'undefined' ? localStorage.getItem(name) : null;
      }
      // On native, use SecureStore
      return await SecureStore.getItemAsync(name);
    } catch (error) {
      console.error(`[SecureStorage] Error reading ${name}:`, error);
      // Fallback to localStorage even on native if SecureStore fails (e.g. during dev/debugging)
      if (!isWeb && typeof window !== 'undefined') {
        try {
          return localStorage.getItem(name);
        } catch (e) {
          return null;
        }
      }
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(name, value);
        }
        return;
      }
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error(`[SecureStorage] Error writing ${name}:`, error);
      // Fallback for native
      if (!isWeb && typeof window !== 'undefined') {
        try {
          localStorage.setItem(name, value);
        } catch (e) {}
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(name);
        }
        return;
      }
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error(`[SecureStorage] Error deleting ${name}:`, error);
      if (!isWeb && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(name);
        } catch (e) {}
      }
    }
  },
};
