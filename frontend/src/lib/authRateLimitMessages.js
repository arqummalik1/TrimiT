/** Friendly copy when auth emails are rate-limited (~1 hour). */

export const AUTH_EMAIL_COOLDOWN_TITLE = 'Please wait about an hour';

export const AUTH_EMAIL_COOLDOWN_MESSAGE =
  "You've made several email requests in a short time, so we've paused sending new messages for about an hour. This keeps your inbox safe and avoids duplicate links.\n\n" +
  'What to do:\n' +
  '• Check spam/junk for an earlier confirmation or reset email\n' +
  '• Use the most recent link you already received, if you have one\n' +
  '• Try again in about 1 hour — one request is enough\n' +
  '• Please avoid clicking Sign up, Forgot password, or Resend repeatedly';

export const AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE =
  "You've requested several password-reset emails. For security, we pause new reset messages for about an hour.\n\n" +
  '• Check spam/junk for an email you may have received earlier\n' +
  '• Try again in about 1 hour with a single request\n' +
  '• Repeated clicks will not send more emails until the pause ends';

const RATE_LIMIT_CODES = new Set([
  'AUTH_PROVIDER_EMAIL_QUOTA',
  'EMAIL_RATE_LIMIT',
  'RATE_LIMIT_EXCEEDED',
  'RATE_LIMITED',
]);

export function isAuthEmailRateLimited(code) {
  return code ? RATE_LIMIT_CODES.has(code) : false;
}

export function getAuthRateLimitMessage(code, context = 'generic') {
  if (code === 'RATE_LIMIT_EXCEEDED' && context === 'forgot') {
    return AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE;
  }
  if (isAuthEmailRateLimited(code)) {
    return AUTH_EMAIL_COOLDOWN_MESSAGE;
  }
  if (context === 'forgot') {
    return AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE;
  }
  return AUTH_EMAIL_COOLDOWN_MESSAGE;
}

export function mapAuthApiError(detail, context = 'generic') {
  if (!detail) return { code: null, message: null, title: null };
  const code = typeof detail === 'object' ? detail.code : null;
  const rawMessage =
    (typeof detail === 'object' && detail.message) ||
    (typeof detail === 'string' && detail) ||
    null;
  if (isAuthEmailRateLimited(code) || (rawMessage && rawMessage.toLowerCase().includes('too many'))) {
    return {
      code: code || 'RATE_LIMIT_EXCEEDED',
      message: getAuthRateLimitMessage(code, context),
      title: AUTH_EMAIL_COOLDOWN_TITLE,
    };
  }
  return { code, message: rawMessage, title: null };
}
