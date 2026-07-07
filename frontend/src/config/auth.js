/**
 * Auth feature flags (web).
 *
 * Google OAuth uses Supabase's redirect flow — no extra env vars here.
 * One email = one account: enable Supabase Dashboard → Auth → "Link identities"
 * so OTP and Google sign-in for the same verified email share one user id.
 */
export const GOOGLE_LOGIN_ENABLED = true;

/** Client resend cooldown — keep in sync with backend OTP_EMAIL_THROTTLE_SECONDS (30). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;
