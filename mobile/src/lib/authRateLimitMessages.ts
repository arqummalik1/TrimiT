/**
 * Friendly copy when Supabase / API rate-limits auth emails (≈1 hour cooldown).
 */

export const AUTH_EMAIL_COOLDOWN_TITLE = 'Please wait about an hour';

const BODY =
  "You've made several email requests in a short time, so we've paused sending new messages for about an hour. This keeps your inbox safe and avoids duplicate links.\n\n" +
  'What to do:\n' +
  '• Check spam/junk for an earlier confirmation or reset email\n' +
  '• Use the most recent link you already received, if you have one\n' +
  '• Try again in about 1 hour — one tap is enough\n' +
  '• Please avoid tapping Sign up, Forgot password, or Resend over and over';

export const AUTH_EMAIL_COOLDOWN_MESSAGE = BODY;

export const AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE =
  "You've requested several password-reset emails. For security, we pause new reset messages for about an hour.\n\n" +
  '• Check spam/junk for an email you may have received earlier\n' +
  '• Try again in about 1 hour with a single request\n' +
  '• Repeated taps will not send more emails until the pause ends';

export const AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE =
  "You've asked for several confirmation emails. New messages are paused for about an hour.\n\n" +
  '• Check spam/junk for your original confirmation link\n' +
  '• Open the newest link in your browser, then sign in in the app\n' +
  '• Try Resend again in about 1 hour — only once';

const RATE_LIMIT_CODES = new Set([
  'AUTH_PROVIDER_EMAIL_QUOTA',
  'EMAIL_RATE_LIMIT',
  'RATE_LIMIT_EXCEEDED',
  'RATE_LIMITED',
]);

export function isAuthEmailRateLimited(code?: string | null): boolean {
  if (!code) return false;
  return RATE_LIMIT_CODES.has(code);
}

export type AuthRateLimitContext = 'signup' | 'forgot' | 'resend' | 'generic';

export function getAuthRateLimitMessage(
  code?: string | null,
  context: AuthRateLimitContext = 'generic'
): string {
  if (code === 'RATE_LIMIT_EXCEEDED' && context === 'forgot') {
    return AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE;
  }
  if (
    (code === 'EMAIL_RATE_LIMIT' || code === 'AUTH_PROVIDER_EMAIL_QUOTA' || code === 'RATE_LIMITED') &&
    context === 'resend'
  ) {
    return AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE;
  }
  if (isAuthEmailRateLimited(code)) {
    return AUTH_EMAIL_COOLDOWN_MESSAGE;
  }
  if (context === 'forgot') {
    return AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE;
  }
  if (context === 'resend') {
    return AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE;
  }
  return AUTH_EMAIL_COOLDOWN_MESSAGE;
}
