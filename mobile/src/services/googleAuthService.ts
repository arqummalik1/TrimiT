/**
 * googleAuthService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper around @react-native-google-signin/google-signin → Google idToken.
 * Store trades that for a Supabase session via signInWithIdToken.
 *
 * SAME code path for iOS and Android — never branch on Platform.OS for loading.
 *
 * Load the native package LAZILY in try/catch. Do NOT gate on Expo Go /
 * NativeModules / TurboModuleRegistry probes — those false-negative on real
 * device builds and show "Google sign-in is not available".
 * ─────────────────────────────────────────────────────────────────────────────
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { buildConfig } from '../lib/buildConfig';
import { logger } from '../lib/logger';

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (opts: Record<string, unknown>) => void;
    hasPlayServices: (opts?: Record<string, unknown>) => Promise<boolean>;
    signIn: () => Promise<unknown>;
    signOut: () => Promise<unknown>;
  };
  statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
};

let cachedModule: GoogleSigninModule | null | undefined;
let lastLoadError: string | null = null;

/**
 * Lazily require the native Google Sign-In package (iOS + Android).
 * Returns null only when require throws (Expo Go or binary missing the module).
 */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    lastLoadError = null;
    return cachedModule;
  } catch (err) {
    lastLoadError = err instanceof Error ? err.message : String(err);
    logger.warn('[GoogleAuth] native module unavailable', {
      platform: Platform.OS,
      appOwnership: Constants.appOwnership ?? null,
      executionEnvironment: Constants.executionEnvironment ?? null,
      err: lastLoadError,
    });
    cachedModule = null;
    return null;
  }
}

/** True when the native Google Sign-In module can be loaded (both platforms). */
export function isGoogleSignInNativeAvailable(): boolean {
  return loadGoogleSignin() != null;
}

/** Test helper — clear cache between cases. */
export function __resetGoogleSignInCacheForTests(): void {
  cachedModule = undefined;
  lastLoadError = null;
}

let configured = false;

/** Configure the native SDK once. Safe to call repeatedly; no-op if unavailable. */
export function configureGoogleSignIn(): void {
  if (configured) return;
  const mod = loadGoogleSignin();
  if (!mod) return;
  // webClientId required on Android for idToken; iosClientId used on iOS.
  mod.GoogleSignin.configure({
    webClientId: buildConfig.googleWebClientId || undefined,
    iosClientId: buildConfig.googleIosClientId || undefined,
    offlineAccess: false,
  });
  configured = true;
}

export type GoogleSignInOutcome =
  | { ok: true; idToken: string }
  | { ok: false; cancelled?: boolean; error: string };

/**
 * Launch the native Google account picker and return an idToken.
 * Identical flow on iOS and Android.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  const mod = loadGoogleSignin();
  if (!mod) {
    const detail = lastLoadError ? ` (${lastLoadError.slice(0, 120)})` : '';
    return {
      ok: false,
      error:
        `Google Sign-In native module is missing on ${Platform.OS}${detail}. ` +
        'Uninstall the app, then install a fresh native build from Xcode (iOS) or a new APK (Android). Metro reload is not enough.',
    };
  }
  if (!buildConfig.googleWebClientId) {
    return {
      ok: false,
      error:
        'Google sign-in is missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in this build. Rebuild with .env loaded.',
    };
  }

  const { GoogleSignin, statusCodes } = mod;
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = (await GoogleSignin.signIn()) as {
      type?: string;
      data?: { idToken?: string | null };
      idToken?: string | null;
    };

    if (response?.type === 'cancelled') {
      return { ok: false, cancelled: true, error: 'Sign-in cancelled.' };
    }

    const idToken = response?.data?.idToken ?? response?.idToken ?? null;
    if (!idToken) {
      return { ok: false, error: 'Google did not return an ID token. Please try again.' };
    }
    return { ok: true, idToken };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { ok: false, cancelled: true, error: 'Sign-in cancelled.' };
    }
    if (code === statusCodes.IN_PROGRESS) {
      return { ok: false, error: 'Sign-in already in progress.' };
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { ok: false, error: 'Google Play Services is not available or out of date.' };
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('[GoogleAuth] signIn failed', { platform: Platform.OS, err: message, code });
    if (/DEVELOPER_ERROR|10:|ApiException:\s*10/i.test(message)) {
      return {
        ok: false,
        error:
          'Google rejected this Android app signing key. Add the debug/upload SHA-1 in Google Cloud Console (Android OAuth client for com.trimit.app).',
      };
    }
    return { ok: false, error: 'Could not sign in with Google. Please try again.' };
  }
}

/** Best-effort native Google sign-out. Safe no-op when module/config absent. */
export async function signOutGoogle(): Promise<void> {
  if (!configured) return;
  const mod = loadGoogleSignin();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch (err) {
    logger.warn('[GoogleAuth] signOut failed', { err: String(err) });
  }
}
