/**
 * appleAuthService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sign in with Apple on iOS → Apple identityToken (+ raw nonce).
 * Store trades that for a Supabase session via signInWithIdToken({ provider: 'apple' }).
 *
 * Nonce flow (Supabase requirement):
 *   1. Generate raw random nonce
 *   2. Send SHA-256(hashed) nonce to Apple
 *   3. Send raw nonce to Supabase (server re-hashes and compares to id_token)
 *
 * Lazy-load expo-apple-authentication so Expo Go / missing native binary fails
 * safely without crashing the JS bundle.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { logger } from '../lib/logger';

type AppleAuthModule = {
  isAvailableAsync: () => Promise<boolean>;
  signInAsync: (options: {
    requestedScopes: number[];
    nonce?: string;
  }) => Promise<{
    identityToken: string | null;
    email?: string | null;
    fullName?: {
      givenName?: string | null;
      familyName?: string | null;
    } | null;
  }>;
  AppleAuthenticationScope: {
    FULL_NAME: number;
    EMAIL: number;
  };
  AppleAuthenticationError?: {
    CANCELED?: string;
  };
};

let cachedModule: AppleAuthModule | null | undefined;
let lastLoadError: string | null = null;

function loadAppleAuth(): AppleAuthModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  if (Platform.OS !== 'ios') {
    cachedModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-apple-authentication') as AppleAuthModule;
    lastLoadError = null;
    return cachedModule;
  } catch (err) {
    lastLoadError = err instanceof Error ? err.message : String(err);
    logger.warn('[AppleAuth] native module unavailable', {
      platform: Platform.OS,
      appOwnership: Constants.appOwnership ?? null,
      executionEnvironment: Constants.executionEnvironment ?? null,
      err: lastLoadError,
    });
    cachedModule = null;
    return null;
  }
}

/** True when the native module can load on this binary (iOS only). */
export function isAppleSignInNativeAvailable(): boolean {
  return Platform.OS === 'ios' && loadAppleAuth() != null;
}

/** Device supports Sign in with Apple (iOS 13+, not restricted). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  const mod = loadAppleAuth();
  if (!mod) return false;
  try {
    return await mod.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Test helper — clear cache between cases. */
export function __resetAppleSignInCacheForTests(): void {
  cachedModule = undefined;
  lastLoadError = null;
}

async function randomNonce(length = 32): Promise<string> {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  const bytes = await Crypto.getRandomBytesAsync(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export type AppleSignInOutcome =
  | { ok: true; idToken: string; rawNonce: string; fullName?: string | null }
  | { ok: false; cancelled?: boolean; error: string };

/**
 * Launch the native Apple sheet and return identityToken + raw nonce.
 * Only call on iOS after isAppleSignInAvailable().
 */
export async function signInWithApple(): Promise<AppleSignInOutcome> {
  if (Platform.OS !== 'ios') {
    return {
      ok: false,
      error: 'Sign in with Apple is only available on iPhone and iPad.',
    };
  }

  const mod = loadAppleAuth();
  if (!mod) {
    const detail = lastLoadError ? ` (${lastLoadError.slice(0, 120)})` : '';
    return {
      ok: false,
      error:
        `Sign in with Apple is missing from this build${detail}. ` +
        'Install a fresh native iOS build from Xcode (Metro reload is not enough).',
    };
  }

  try {
    const available = await mod.isAvailableAsync();
    if (!available) {
      return {
        ok: false,
        error:
          'Sign in with Apple is not available on this device. Please use email OTP or Google.',
      };
    }

    const rawNonce = await randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await mod.signInAsync({
      requestedScopes: [
        mod.AppleAuthenticationScope.FULL_NAME,
        mod.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return {
        ok: false,
        error: 'Apple did not return an identity token. Please try again.',
      };
    }

    const given = credential.fullName?.givenName?.trim() || '';
    const family = credential.fullName?.familyName?.trim() || '';
    const fullName = [given, family].filter(Boolean).join(' ') || null;

    return {
      ok: true,
      idToken: credential.identityToken,
      rawNonce,
      fullName,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // expo-apple-authentication uses ERR_REQUEST_CANCELED
    if (
      code === 'ERR_REQUEST_CANCELED' ||
      code === 'ERR_CANCELED' ||
      code === mod.AppleAuthenticationError?.CANCELED
    ) {
      return { ok: false, cancelled: true, error: 'Sign-in cancelled.' };
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[AppleAuth] signIn failed', err instanceof Error ? err : new Error(message), {
      platform: Platform.OS,
      code: code ?? null,
    });
    return { ok: false, error: 'Could not sign in with Apple. Please try again.' };
  }
}
