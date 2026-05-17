/**
 * Parse Supabase auth redirect parameters from email confirmation / recovery links.
 * Tokens may appear in the URL hash (#access_token=...) or query (?token_hash=...).
 */
export function parseAuthCallbackFromUrl() {
  if (typeof window === 'undefined') {
    return {
      error: null,
      errorDescription: null,
      type: null,
      accessToken: null,
      tokenHash: null,
      isEmailConfirmation: false,
    };
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  const pick = (key) => hashParams.get(key) || queryParams.get(key);

  const type = pick('type');
  const accessToken = pick('access_token');
  const tokenHash = pick('token_hash');
  const error = pick('error');
  const errorDescription = pick('error_description');

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
  };
}
