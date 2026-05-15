/**
 * Supabase password-recovery links redirect with tokens in the URL hash:
 *   /reset-password#access_token=...&type=recovery&...
 * Legacy/manual links may use ?token=...
 */
export function extractRecoveryToken() {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  const hashParams = new URLSearchParams(hash);
  const hashToken = hashParams.get('access_token');
  const hashType = hashParams.get('type');

  if (hashToken && (!hashType || hashType === 'recovery')) {
    return hashToken;
  }

  const queryParams = new URLSearchParams(window.location.search);
  return queryParams.get('token') || queryParams.get('access_token');
}
