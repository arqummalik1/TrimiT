/** User-facing copy for Supabase / Apple native sign-in failures. */
export function translateAppleAuthError(raw: string | undefined): string {
  const msg = (raw || '').toLowerCase();
  if (
    msg.includes('already registered') ||
    msg.includes('already exists') ||
    msg.includes('user already')
  ) {
    return (
      'An account with this email already exists. Sign in with email OTP once, ' +
      'then try Apple again — or use the same Apple ID for that email. ' +
      'TrimiT keeps one account per verified email.'
    );
  }
  if (msg.includes('identity') && msg.includes('link')) {
    return (
      'Could not link Apple to your existing account. Sign in with email OTP ' +
      'using the same address, then try Apple again.'
    );
  }
  if (msg.includes('nonce')) {
    return (
      'Apple sign-in could not be verified on this device. ' +
      'Please try again, or sign in with email OTP.'
    );
  }
  if (msg.includes('idp') || msg.includes('provider') || msg.includes('unsupported')) {
    return (
      'Sign in with Apple is not fully configured yet. Please try email OTP, or try again after an update.'
    );
  }
  return raw || 'Apple sign-in failed. Please try again.';
}
