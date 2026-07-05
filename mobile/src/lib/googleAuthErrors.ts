/** User-facing copy for Supabase / Google native sign-in failures. */
export function translateGoogleAuthError(raw: string | undefined): string {
  const msg = (raw || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already exists')) {
    return (
      'An account with this email already exists. Sign in with email OTP or password using the same address.'
    );
  }
  if (msg.includes('identity') && msg.includes('link')) {
    return 'This Google account could not be linked. Try the sign-in method you used originally.';
  }
  return raw || 'Google sign-in failed. Please try again.';
}
