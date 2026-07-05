/**
 * googleAuthService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper around @react-native-google-signin/google-signin that returns a
 * Google `idToken`. The store then trades that idToken for a Supabase session
 * via supabase.auth.signInWithIdToken.
 *
 * IMPORTANT: the native module (`RNGoogleSignin`) only exists in a real
 * dev/release build — it is NOT present in Expo Go. We therefore load it
 * LAZILY inside a try/catch so that merely importing this file (e.g. from
 * clearSession → signOutGoogle) never throws an Invariant Violation in Expo Go.
 * When the module is unavailable, every function degrades to a safe no-op /
 * clear error instead of crashing.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';
import { buildConfig } from '../lib/buildConfig';
import { logger } from '../lib/logger';

/**
 * True only in dev/release binaries that embed RNGoogleSignin.
 * Expo Go never ships this native module — loading the JS package there
 * triggers TurboModuleRegistry.getEnforcing(...) and crashes the app.
 */
export function isGoogleSignInNativeAvailable(): boolean {
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  return Boolean(NativeModules.RNGoogleSignin);
}

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

/** Lazily require the native module; returns null if it isn't in this binary. */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (!isGoogleSignInNativeAvailable()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch (err) {
    logger.warn('[GoogleAuth] native module unavailable', { err: String(err) });
    return null;
  }
}

let configured = false;

/** Configure the native SDK once. Safe to call repeatedly; no-op if unavailable. */
export function configureGoogleSignIn(): void {
  if (configured) return;
  const mod = loadGoogleSignin();
  if (!mod) return;
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
 * Degrades gracefully when the native module isn't in the binary.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  const mod = loadGoogleSignin();
  if (!mod) {
    return {
      ok: false,
      error: 'Google sign-in is not available in this build. Please use email OTP.',
    };
  }
  if (!buildConfig.googleWebClientId) {
    return {
      ok: false,
      error: 'Google sign-in is not configured for this build. Please try email OTP.',
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
    logger.warn('[GoogleAuth] signIn failed', { err });
    return { ok: false, error: 'Could not sign in with Google. Please try again.' };
  }
}

/** Best-effort native Google sign-out. Safe no-op when module/config absent. */
export async function signOutGoogle(): Promise<void> {
  if (!configured || !isGoogleSignInNativeAvailable()) return;
  const mod = loadGoogleSignin();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch (err) {
    logger.warn('[GoogleAuth] signOut failed', { err: String(err) });
  }
}
