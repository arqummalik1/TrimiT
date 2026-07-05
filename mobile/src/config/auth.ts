import { isGoogleSignInNativeAvailable } from '../services/googleAuthService';

/**
 * Auth feature flags (mobile).
 *
 * Google Sign-In uses native picker + Supabase signInWithIdToken.
 * One email = one account: enable Supabase Dashboard → Auth → Link identities.
 *
 * `GOOGLE_LOGIN_ENABLED` is the product flag; `isGoogleLoginVisible()` also
 * requires the native module (hidden in Expo Go to avoid RNGoogleSignin crash).
 */
export const GOOGLE_LOGIN_ENABLED = true;

export function isGoogleLoginVisible(): boolean {
  return GOOGLE_LOGIN_ENABLED && isGoogleSignInNativeAvailable();
}
