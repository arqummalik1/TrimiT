import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrimitLogo from '../components/brand/TrimitLogo';
import { getSupabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * OAuth callback landing page (Google).
 *
 * Supabase redirects here after Google auth. We resolve the session (PKCE
 * `?code=...` exchange, or an implicit-flow token hash that supabase-js parses
 * automatically), hand it to the auth store, then route exactly like the OTP
 * flow: new users → /complete-profile (pick role), existing users → home.
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const hydrateFromSupabaseSession = useAuthStore((s) => s.hydrateFromSupabaseSession);
  const [error, setError] = useState(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const supabase = getSupabase();

      // Surface an OAuth-level error returned in the URL (e.g. user cancelled).
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, '')
      );
      const oauthError =
        params.get('error_description') ||
        params.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');
      if (oauthError) {
        setError(oauthError);
        return;
      }

      try {
        // PKCE flow: exchange the ?code=... for a session.
        const code = params.get('code');
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        }

        // Works for both PKCE (post-exchange) and implicit (auto-parsed hash).
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data?.session) {
          setError(
            sessionError?.message ||
              'We could not complete Google sign-in. Please try again.'
          );
          return;
        }

        const result = await hydrateFromSupabaseSession(data.session);
        if (!result?.success) {
          setError(result?.error || 'Sign-in failed. Please try again.');
          return;
        }

        // Clean the OAuth params out of the URL before routing.
        if (result.profileComplete === false) {
          navigate('/complete-profile', { replace: true });
        } else if (result.profile?.role === 'owner') {
          navigate(result.hasSalon ? '/owner/dashboard' : '/owner/salon', {
            replace: true,
          });
        } else {
          navigate('/explore', { replace: true });
        }
      } catch (e) {
        setError(e?.message || 'Sign-in failed. Please try again.');
      }
    })();
  }, [hydrateFromSupabaseSession, navigate]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center">
        <TrimitLogo
          variant="icon"
          asLink={false}
          iconClassName="h-16 w-16 mx-auto mb-4 animate-pulse"
          showWordmark={false}
          className="justify-center"
        />
        {error ? (
          <>
            <p className="text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="text-orange-800 font-semibold hover:underline"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="text-stone-500 mt-2">Signing you in…</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
