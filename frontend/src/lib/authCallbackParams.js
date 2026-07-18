/**
 * Parse Supabase auth redirect parameters from email confirmation / recovery links.
 * Tokens may appear in the URL hash (#access_token=...) or query (?token_hash=...).
 *
 * Important: Supabase Site URL often redirects recovery to `/#...&type=recovery`
 * even when redirectTo was `/reset-password`. The SPA must detect that and route
 * to the create-new-password screen (see resolveAuthCallbackRedirect).
 */

export const AUTH_CALLBACK_PATHS = [
  '/auth/email-confirmed',
  '/reset-password',
  '/auth/callback',
];

export function parseAuthCallbackFromUrl(locationLike = typeof window !== 'undefined' ? window.location : null) {
  if (!locationLike) {
    return {
      error: null,
      errorDescription: null,
      type: null,
      accessToken: null,
      tokenHash: null,
      isEmailConfirmation: false,
      isPasswordRecovery: false,
      hasHash: false,
    };
  }

  const rawHash = locationLike.hash || '';
  const hash = rawHash.startsWith('#') ? rawHash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(locationLike.search || '');

  const pick = (key) => hashParams.get(key) || queryParams.get(key);

  const type = pick('type');
  const accessToken = pick('access_token');
  const tokenHash = pick('token_hash');
  const error = pick('error');
  const errorDescription = pick('error_description');

  const isPasswordRecovery = type === 'recovery';
  const isEmailConfirmation =
    type === 'signup' ||
    type === 'email' ||
    type === 'email_change' ||
    Boolean(tokenHash && type !== 'recovery');

  return {
    error,
    errorDescription,
    type,
    accessToken,
    tokenHash,
    isEmailConfirmation,
    isPasswordRecovery,
    hasHash: Boolean(hash),
  };
}

/**
 * When Supabase dumps auth tokens on Site URL (/) or another non-callback path,
 * return the in-app path to navigate to (caller preserves search+hash).
 * @returns {'/reset-password' | '/auth/email-confirmed' | null}
 */
export function resolveAuthCallbackRedirect(pathname, parsed) {
  if (AUTH_CALLBACK_PATHS.includes(pathname)) return null;

  if (parsed.isPasswordRecovery && (parsed.accessToken || parsed.tokenHash)) {
    return '/reset-password';
  }

  const hasCallback =
    Boolean(parsed.error && parsed.hasHash) ||
    (Boolean(parsed.accessToken || parsed.tokenHash) && parsed.isEmailConfirmation);

  if (!hasCallback) return null;
  return '/auth/email-confirmed';
}
