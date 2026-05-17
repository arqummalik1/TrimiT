import { supabase } from './supabase';
import api from './api';

function decodeAuthMessage(value) {
  if (!value) return value;
  try {
    return decodeURIComponent(String(value).replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function mapVerifyError(message) {
  const lower = (message || '').toLowerCase();
  if (lower.includes('expired') || lower.includes('invalid')) {
    return 'This link has expired or was already used. Open the TrimiT app and tap Resend confirmation email, then use the newest link.';
  }
  if (lower.includes('redirect') || lower.includes('url')) {
    return 'Email link configuration issue. Contact support if this continues after requesting a new confirmation email.';
  }
  return message || 'We could not verify your email. Request a new confirmation email from the app.';
}

/**
 * Complete Supabase email confirmation / recovery redirect (PKCE code, OTP hash, or implicit tokens).
 */
export async function completeAuthEmailCallback() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Browser only' };
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);
  const pick = (key) => hashParams.get(key) || queryParams.get(key);

  const error = pick('error');
  const errorDescription = pick('error_description');
  if (error) {
    return {
      success: false,
      error: mapVerifyError(decodeAuthMessage(errorDescription) || error),
    };
  }

  const code = pick('code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return { success: false, error: mapVerifyError(exchangeError.message) };
    }
    return { success: true, via: 'pkce' };
  }

  const tokenHash = pick('token_hash');
  const token = pick('token');
  const type = pick('type') || 'signup';

  if (tokenHash || token) {
    const otpType =
      type === 'signup' ? 'signup' : type === 'recovery' ? 'recovery' : type === 'email_change' ? 'email_change' : 'email';

    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash || undefined,
      token: token || undefined,
    });

    if (verifyError) {
      try {
        const { data } = await api.post('/auth/confirm-email-callback', {
          token_hash: tokenHash,
          token,
          type: otpType,
        });
        if (data?.success) {
          return { success: true, via: 'backend' };
        }
      } catch {
        // fall through
      }
      return { success: false, error: mapVerifyError(verifyError.message) };
    }
    return { success: true, via: 'otp' };
  }

  const accessToken = pick('access_token');
  const refreshToken = pick('refresh_token');
  if (accessToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
    if (sessionError) {
      return { success: false, error: mapVerifyError(sessionError.message) };
    }
    return { success: true, via: 'implicit' };
  }

  return { success: false, error: null, idle: true };
}
