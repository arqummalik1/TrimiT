import * as SecureStore from 'expo-secure-store';
import { StateStorage } from 'zustand/middleware';

/**
 * A storage wrapper that uses expo-secure-store for sensitive data.
 * This can be used as a custom storage engine for Zustand persist middleware.
 */
export const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch (error) {
      console.error(`Error reading from SecureStore (${name}):`, error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error(`Error writing to SecureStore (${name}):`, error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error(`Error deleting from SecureStore (${name}):`, error);
    }
  },
};
