import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import GoogleGLogo from './GoogleGLogo';

/**
 * "Sign in with Google" button (web) — follows Google identity branding.
 *
 * Starts Supabase Google OAuth. On return, /auth/callback exchanges the code,
 * hydrates the session, and routes like OTP: existing user by role, new user
 * → /complete-profile. Same email via OTP + Google stays one account when
 * Supabase "Link identities" is enabled (Dashboard → Auth).
 */
const GoogleSignInButton = ({ label = 'Sign in with Google' }) => {
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await googleSignIn();
    // On success the browser redirects to Google; we rarely reach here.
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
      aria-label={label}
      className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-lg border border-[#747775] bg-white text-[#1f1f1f] text-sm font-medium shadow-[0_1px_2px_rgba(60,64,67,0.08)] hover:bg-[#f8f9fa] hover:border-[#747775] active:bg-[#f1f3f4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "'Roboto', system-ui, -apple-system, sans-serif" }}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-[#dadce0] border-t-[#4285F4] rounded-full animate-spin" />
      ) : (
        <GoogleGLogo size={20} />
      )}
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
};

export default GoogleSignInButton;
