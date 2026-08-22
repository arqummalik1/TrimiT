import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import AppleLogo from './AppleLogo';

/**
 * Sign in with Apple (web) — Apple HIG black button.
 *
 * Starts Supabase Apple OAuth. On return, /auth/callback exchanges the code
 * and hydrates the session (same path as Google).
 */
const AppleSignInButton = ({ label = 'Sign in with Apple' }) => {
  const appleSignIn = useAuthStore((s) => s.appleSignIn);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await appleSignIn();
    if (!result?.success) {
      setLoading(false);
      useToastStore
        .getState()
        .error(result?.error || 'Could not start Apple sign-in. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      data-testid="apple-signin"
      aria-label={label}
      className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-lg border border-black bg-black text-white text-sm font-medium hover:bg-stone-900 active:bg-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <AppleLogo size={18} className="text-white" />
      )}
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
};

export default AppleSignInButton;
