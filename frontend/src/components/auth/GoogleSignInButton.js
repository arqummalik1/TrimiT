import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

/**
 * "Continue with Google" button (web).
 *
 * Kicks off Supabase's Google OAuth redirect flow. On return, the browser
 * lands on /auth/callback which exchanges the code for a Supabase session and
 * then reuses the SAME downstream logic as OTP login:
 *   - existing user  → routed by role
 *   - new user       → /complete-profile (pick role), no duplicate account
 *
 * Account de-duplication (one email = one account, whether they first used OTP
 * or Google) is handled by Supabase's "link identities" setting, enabled in the
 * Supabase Dashboard → Auth → Providers.
 */
const GoogleSignInButton = ({ label = 'Continue with Google' }) => {
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await googleSignIn();
    // On success the browser redirects to Google, so we never reach here.
    if (!result?.success) {
      setLoading(false);
      useToastStore
        .getState()
        .error(result?.error || 'Could not start Google sign-in. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      data-testid="google-signin"
      className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-stone-300 rounded-xl bg-white text-stone-700 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
      )}
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
};

export default GoogleSignInButton;
