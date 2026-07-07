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

/** Client resend cooldown — keep in sync with backend OTP_EMAIL_THROTTLE_SECONDS (30). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

export function isGoogleLoginVisible(): boolean {
  return GOOGLE_LOGIN_ENABLED && isGoogleSignInNativeAvailable();
}
