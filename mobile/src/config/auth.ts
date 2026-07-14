/**
 * Auth feature flags (mobile).
 *
 * Google Sign-In uses native picker + Supabase signInWithIdToken.
 * Same verified email (OTP/password + Google) → one auth user via Supabase
 * automatic identity linking.
 *
 * Always show the Google button on Login (iOS + Android). Never hide by
 * platform. Expo Go / missing native module still fails safely on press.
 */
export const GOOGLE_LOGIN_ENABLED = true;

/** Client resend cooldown — keep in sync with backend OTP_EMAIL_THROTTLE_SECONDS (30). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** Always true while GOOGLE_LOGIN_ENABLED — do not gate Android/iOS or native module. */
export function isGoogleLoginVisible(): boolean {
  return GOOGLE_LOGIN_ENABLED;
}
