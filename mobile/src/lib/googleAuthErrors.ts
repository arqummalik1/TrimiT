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
    // Do not instruct end users / operators to disable nonce checks in-app —
    // that weakens replay protection. Classic GoogleSignin has no nonce param;
    // ops may still enable Skip nonce in Supabase for iOS, but that is not
    // user-facing guidance.
    return (
      'Google sign-in could not be verified on this device. ' +
      'Please try again, or sign in with email OTP.'
    );
  }
  if (isGoogleSafariUnavailableMessage(msg)) {
    return (
      'Google sign-in could not open Safari on this iPhone. ' +
      'Check Screen Time / Content Restrictions aren’t blocking Safari, ' +
      'then try again — or sign in with email OTP.'
    );
  }
  if (msg.includes('idp') || msg.includes('provider')) {
    return (
      'Google sign-in is not fully configured yet. Please try email OTP, or try again after a rebuild.'
    );
  }
  return raw || 'Google sign-in failed. Please try again.';
}

/** GIDSignIn Code=-1 "Unable to open Safari" — device restriction / presentation, not a crash. */
export function isGoogleSafariUnavailableMessage(raw: string | undefined): boolean {
  const msg = (raw || '').toLowerCase();
  return (
    msg.includes('unable to open safari') ||
    (msg.includes('safari') && msg.includes('unable to open')) ||
    (msg.includes('gidsignin') && msg.includes('safari'))
  );
}
