/** User-facing copy for Supabase / Google native sign-in failures. */
export function translateGoogleAuthError(raw: string | undefined): string {
  const msg = (raw || '').toLowerCase();
  if (
    msg.includes('already registered') ||
    msg.includes('already exists') ||
    msg.includes('user already')
  ) {
    return (
      'An account with this email already exists. Sign in with email OTP once, ' +
      'then try Google again — or use the same Google account for that email. ' +
      'TrimiT keeps one account per verified email.'
    );
  }
  if (msg.includes('identity') && msg.includes('link')) {
    return (
      'Could not link Google to your existing account. Sign in with email OTP ' +
      'using the same address, then try Google again.'
    );
  }
  if (msg.includes('nonce') && msg.includes('id_token')) {
    return (
      'Google sign-in needs a Supabase setting for iPhone. In Supabase Dashboard → ' +
      'Authentication → Providers → Google, turn on **Skip nonce checks**, save, ' +
      'then try again (no app reinstall needed). Android is unaffected.'
    );
  }
  if (msg.includes('idp') || msg.includes('provider')) {
    return (
      'Google sign-in is not fully configured yet. Please try email OTP, or try again after a rebuild.'
    );
  }
  return raw || 'Google sign-in failed. Please try again.';
}
