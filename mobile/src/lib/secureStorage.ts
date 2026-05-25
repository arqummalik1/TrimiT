import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

/**
 * Storage wrapper for sensitive data.
 *
 * Strategy (production-grade, mirrors how Zomato/Blinkit/Instagram persist
 * sessions across swipe-kills):
 *   - Web: localStorage (SecureStore is not native there).
 *   - Native: try SecureStore first. SecureStore is hard-capped at ~2KB per
 *     key on iOS and most Android OEMs. JWTs + the full persisted auth state
 *     can exceed that, in which case SecureStore throws. We then fall back to
 *     AsyncStorage so the user is NOT silently signed out.
 *   - The fallback is sticky per write: once AsyncStorage has the value, we
 *     keep reading it from there even if SecureStore later returns null.
 */
const isWeb = Platform.OS === 'web';

const SIZE_LIMIT_HINTS = ['size', 'large', 'too long', 'exceeds', 'max', 'limit'];

function isLikelySizeError(error: unknown): boolean {
  if (!error) return false;
  const msg = String((error as { message?: string })?.message ?? error).toLowerCase();
  return SIZE_LIMIT_HINTS.some((hint) => msg.includes(hint));
}

export const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (isWeb) {
      return typeof window !== 'undefined' ? localStorage.getItem(name) : null;
    }
    try {
      const fromSecure = await SecureStore.getItemAsync(name);
      if (fromSecure) return fromSecure;
    } catch (error) {
      console.warn(`[SecureStorage] SecureStore read failed for ${name}:`, error);
    }
    // Fallback: AsyncStorage. We do this on every read because past writes may
    // have fallen back here. This is the path that keeps users logged in.
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(name, value);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(name, value);
      return;
    } catch (error) {
      // SecureStore size-limit (~2KB) is the most common reason this fails on
      // a real production app — the persisted Zustand state with JWT + user
      // object easily crosses that. Fall back to AsyncStorage so the next cold
      // start doesn't log the user out.
      if (isLikelySizeError(error)) {
        console.warn(`[SecureStorage] ${name} exceeds SecureStore limit; using AsyncStorage`);
      } else {
        console.warn(`[SecureStorage] SecureStore write failed for ${name}:`, error);
      }
      try {
        await AsyncStorage.setItem(name, value);
      } catch (e) {
        console.error(`[SecureStorage] Both SecureStore and AsyncStorage write failed for ${name}:`, e);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(name);
      }
      return;
    }
    // Always clear both so a stale fallback can't resurrect a logged-out session.
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.warn(`[SecureStorage] SecureStore delete failed for ${name}:`, error);
    }
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
