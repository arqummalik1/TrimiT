/**
 * Auth feature flags (mobile).
 *
 * Google Sign-In uses native picker + Supabase signInWithIdToken.
 * Sign in with Apple uses expo-apple-authentication + the same id-token path.
 * Same verified email (OTP/password + Google + Apple) → one auth user via
 * Supabase automatic identity linking.
 *
 * Always show the Google button on Login (iOS + Android). Never hide by
 * platform. Expo Go / missing native module still fails safely on press.
 *
 * Apple is iOS-only (App Store Guideline 4.8 when offering social login).
 */
import { Platform } from 'react-native';

export const GOOGLE_LOGIN_ENABLED = true;

/** Sign in with Apple — required on iOS when Google social login is offered. */
export const APPLE_LOGIN_ENABLED = true;

/** Client resend cooldown — keep in sync with backend OTP_EMAIL_THROTTLE_SECONDS (30). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** Always true while GOOGLE_LOGIN_ENABLED — do not gate Android/iOS or native module. */
export function isGoogleLoginVisible(): boolean {
  return GOOGLE_LOGIN_ENABLED;
}

/** Apple only on iOS. Component also checks device availability. */
export function isAppleLoginVisible(): boolean {
  return APPLE_LOGIN_ENABLED && Platform.OS === 'ios';
}
