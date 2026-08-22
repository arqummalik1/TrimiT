/**
 * Auth feature flags (web).
 *
 * Google + Apple OAuth use Supabase's redirect flow — no extra env vars here.
 * One email = one account: enable Supabase Dashboard → Auth → "Link identities"
 * so OTP, Google, and Apple for the same verified email share one user id.
 */
export const GOOGLE_LOGIN_ENABLED = true;

/** Sign in with Apple (web OAuth). Enable with Apple provider in Supabase. */
export const APPLE_LOGIN_ENABLED = true;

/** Client resend cooldown — keep in sync with backend OTP_EMAIL_THROTTLE_SECONDS (30). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;
