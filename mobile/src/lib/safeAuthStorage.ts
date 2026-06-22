import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { secureStorage } from './secureStorage';
import { logger } from './logger';

const AUTH_PERSIST_KEY = 'trimit-auth-storage';
const AUTH_TOKENS_KEY = 'trimit-auth-tokens';
const AUTH_METADATA_KEY = 'trimit-auth-metadata';

/**
 * Zustand persist storage for auth.
 *
 * Implements a split-storage strategy:
 * - Security-sensitive auth credentials (token, refreshToken) are stored in SecureStore
 *   to ensure encryption at rest.
 * - Non-sensitive metadata (user profile, auth status flags) is stored in AsyncStorage
 *   to prevent overflowing the ~2KB SecureStore limits.
 *
 * This prevents plain-text fallback leakage of access/refresh tokens.
 */
export const safeAuthStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name !== AUTH_PERSIST_KEY || Platform.OS === 'web') {
      try {
        return await secureStorage.getItem(name);
      } catch {
        return null;
      }
    }

    // 1. Try to read split storage
    let tokenRaw: string | null = null;
    try {
      tokenRaw = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
    } catch (err) {
      logger.warn('[AuthStorage] Failed to read tokens from SecureStore', { err });
    }

    if (!tokenRaw) {
      // Tokens must only be loaded from SecureStore.
      logger.warn('[AuthStorage] No tokens found in SecureStore or read failed.');
    }

    let bulkRaw: string | null = null;
    try {
      bulkRaw = await AsyncStorage.getItem(AUTH_METADATA_KEY);
    } catch {
      bulkRaw = null;
    }

    if (tokenRaw && bulkRaw) {
      try {
        const tokenData = JSON.parse(tokenRaw);
        const bulkData = JSON.parse(bulkRaw);

        const mergedState = {
          ...bulkData.state,
          token: tokenData.state?.token || null,
          refreshToken: tokenData.state?.refreshToken || null,
        };

        return JSON.stringify({
          version: bulkData.version ?? 0,
          state: mergedState,
        });
      } catch (err) {
        logger.error('[AuthStorage] Failed to parse/merge split auth data', err);
      }
    }

    // 2. Migration path for legacy installs (old unified key)
    let legacyRaw: string | null = null;
    try {
      legacyRaw = await secureStorage.getItem(AUTH_PERSIST_KEY);
    } catch {
      legacyRaw = null;
    }

    if (!legacyRaw) {
      try {
        legacyRaw = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
      } catch {
        legacyRaw = null;
      }
    }

    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        if (parsed && parsed.state) {
          const { token, refreshToken, ...restState } = parsed.state;
          const tokenState = { token, refreshToken };

          // Migrate to split storage
          try {
            await SecureStore.setItemAsync(
              AUTH_TOKENS_KEY,
              JSON.stringify({
                version: parsed.version || 0,
                state: tokenState,
              })
            );
          } catch (err) {
            logger.warn('[AuthStorage] Migration: SecureStore write failed. Cannot persist tokens securely.', { err });
          }

          await AsyncStorage.setItem(
            AUTH_METADATA_KEY,
            JSON.stringify({
              version: parsed.version || 0,
              state: restState,
            })
          );

          // Clear legacy unified keys
          try {
            await secureStorage.removeItem(AUTH_PERSIST_KEY);
          } catch {}
          try {
            await AsyncStorage.removeItem(AUTH_PERSIST_KEY);
          } catch {}

          return legacyRaw;
        }
      } catch (err) {
        logger.error('[AuthStorage] Legacy migration parsing failed', err);
        // Wipe corrupt legacy data
        try {
          await secureStorage.removeItem(AUTH_PERSIST_KEY);
          await AsyncStorage.removeItem(AUTH_PERSIST_KEY);
        } catch {}
      }
    }

    return null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (name !== AUTH_PERSIST_KEY || Platform.OS === 'web') {
      await secureStorage.setItem(name, value);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.state) {
        const { token, refreshToken, ...restState } = parsed.state;
        const tokenState = { token, refreshToken };

        // Save sensitive tokens in SecureStore
        try {
          await SecureStore.setItemAsync(
            AUTH_TOKENS_KEY,
            JSON.stringify({
              version: parsed.version || 0,
              state: tokenState,
            })
          );
        } catch (err) {
          logger.error('[AuthStorage] SecureStore setItem failed. Tokens are not persisted.', { err });
        }

        // Save bulk metadata in AsyncStorage
        await AsyncStorage.setItem(
          AUTH_METADATA_KEY,
          JSON.stringify({
            version: parsed.version || 0,
            state: restState,
          })
        );
      }
    } catch (err) {
      logger.error('[AuthStorage] setItem parsing/writing failed', err);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (name !== AUTH_PERSIST_KEY || Platform.OS === 'web') {
      await secureStorage.removeItem(name);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
    } catch (err) {
      logger.warn('[AuthStorage] SecureStore deleteItem failed', { err });
    }

    try {
      await AsyncStorage.removeItem(AUTH_METADATA_KEY);
    } catch {}

    // Nuke any legacy unified key
    try {
      await secureStorage.removeItem(name);
    } catch {}
    try {
      await AsyncStorage.removeItem(name);
    } catch {}
  },
};
