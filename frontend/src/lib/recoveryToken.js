/**
 * Supabase password-recovery links redirect with tokens in the URL hash:
 *   /reset-password#access_token=...&refresh_token=...&type=recovery&...
 * Legacy/manual links may use ?token=...
 */

export function extractRecoverySession() {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null };
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  const hashParams = new URLSearchParams(hash);
  const hashToken = hashParams.get('access_token');
  const hashType = hashParams.get('type');
  const hashRefresh = hashParams.get('refresh_token');

  if (hashToken && (!hashType || hashType === 'recovery')) {
    return {
      accessToken: hashToken,
      refreshToken: hashRefresh,
    };
  }

  const queryParams = new URLSearchParams(window.location.search);
  const queryToken = queryParams.get('token') || queryParams.get('access_token');
  return {
    accessToken: queryToken,
    refreshToken: queryParams.get('refresh_token'),
  };
}

/** @deprecated Prefer extractRecoverySession — kept for older imports/tests. */
export function extractRecoveryToken() {
  return extractRecoverySession().accessToken;
}
