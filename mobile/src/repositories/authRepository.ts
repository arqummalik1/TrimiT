import { authService } from '../services/authService';
import { setAuthToken } from '../services/apiClient';
import { SUPPORT_EMAIL } from '../lib/contactInfo';
import { isAppError } from '../types/error';
import { User } from '../types';
import { normalizeAuthUser } from '../lib/authUser';
import { getAuthRateLimitMessage, isAuthEmailRateLimited } from '../lib/authRateLimitMessages';

type ProfileLike = Parameters<typeof normalizeAuthUser>[0];
import axios from 'axios';

// Structured error codes the store and UI can respond to specifically
export type AuthErrorCode =
  | 'EMAIL_CONFIRMATION_REQUIRED'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ALREADY_REGISTERED'
  | 'EMAIL_RATE_LIMIT'
  | 'AUTH_PROVIDER_EMAIL_QUOTA'
  | 'SIGNUP_READY_SIGN_IN'
  | 'RATE_LIMITED'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'PROFILE_CREATION_FAILED'
  | 'LOGIN_FAILED'
  | 'SIGNUP_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export function parseAuthFailure(err: unknown): { message: string; code: AuthErrorCode } {
  if (isAppError(err)) {
    const nested = err.details as { code?: string; message?: string } | undefined;
    const code = (nested?.code || err.code || 'UNKNOWN') as AuthErrorCode;
    return {
      message: err.message || nested?.message || 'Something went wrong. Please try again.',
      code,
    };
  }
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    const nested = err.response?.data?.error?.details;
    const code =
      (typeof nested === 'object' && nested?.code) ||
      (typeof detail === 'object' && detail?.code) ||
      'UNKNOWN';
    const message =
      (typeof nested === 'object' && nested?.message) ||
      (typeof detail === 'object' && detail?.message) ||
      (typeof detail === 'string' && detail) ||
      'Something went wrong. Please try again.';
    return { message, code: code as AuthErrorCode };
  }
  return { message: 'Network error. Please check your connection and try again.', code: 'NETWORK_ERROR' };
}

export interface AuthResult {
  user: User | null;
  token: string | null;
  /** Supabase refresh token — required for `supabase.auth.setSession` / Realtime RLS. */
  refreshToken?: string | null;
  /** Set when signup succeeds but email confirmation is needed before login. */
  requiresEmailConfirmation?: boolean;
  /** Account activated server-side; user should sign in (no email link). */
  accountReadyForLogin?: boolean;
  /** Friendly error message for display */
  error?: string;
  /** Machine-readable error code */
  errorCode?: AuthErrorCode | string;
}

/**
 * Repository layer for Authentication.
 * Handles domain logic, response normalization, and session side-effects.
 */
export const authRepository = {
  /**
   * Performs login and prepares the session.
   * Calls /auth/me after token is set to guarantee the user object always has `role`.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    let response;
    try {
      response = await authService.login({ email, password });
    } catch (err: unknown) {
      const { message, code } = parseAuthFailure(err);
      if (code === 'EMAIL_NOT_CONFIRMED') {
        return {
          user: null,
          token: null,
          requiresEmailConfirmation: true,
          error: message,
          errorCode: code,
        };
      }
      return {
        user: null,
        token: null,
        error: message || 'Login failed. Please check your credentials.',
        errorCode: code === 'NETWORK_ERROR' ? 'LOGIN_FAILED' : code,
      };
    }

    const { access_token, refresh_token, profile, user } = response.data as {
      access_token: string;
      token_type: string;
      expires_in?: number;
      refresh_token?: string;
      user?: Record<string, unknown>;
      profile?: User | null;
    };

    if (!access_token) {
      return {
        user: null,
        token: null,
        error: 'Authentication failed: No token received',
        errorCode: 'LOGIN_FAILED',
      };
    }

    // Set token so subsequent requests are authenticated
    setAuthToken(access_token);

    // Guarantee role from public.users via /auth/me (never trust raw Supabase auth user).
    try {
      const meResponse = await authService.getMe();
      const normalized = normalizeAuthUser(
        meResponse.data as { profile?: User; id?: string; email?: string }
      );
      if (normalized) {
        return { user: normalized, token: access_token, refreshToken: refresh_token ?? null };
      }
    } catch {
      // fall through to login response profile
    }

    const fromLogin =
      normalizeAuthUser(profile as unknown as ProfileLike) ??
      normalizeAuthUser(user as unknown as ProfileLike);
    if (fromLogin) {
      return { user: fromLogin, token: access_token, refreshToken: refresh_token ?? null };
    }

    return {
      user: null,
      token: access_token,
      refreshToken: refresh_token ?? null,
      error: 'Could not load your profile. Please try again.',
      errorCode: 'LOGIN_FAILED',
    };
  },

  /**
   * Performs signup.
   * Returns requiresEmailConfirmation=true when backend responds with HTTP 202.
   */
  async signup(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'customer' | 'owner';
  }): Promise<AuthResult> {
    let response;
    try {
      response = await authService.signup(data);
    } catch (err: unknown) {
      const { message, code } = parseAuthFailure(err);
      const friendly = isAuthEmailRateLimited(code)
        ? getAuthRateLimitMessage(code, 'signup')
        : message;
      return { user: null, token: null, error: friendly, errorCode: code as AuthErrorCode };
    }

    const responseData = response.data as {
      code?: string;
      message?: string;
      user?: Record<string, unknown>;
      session?: { access_token: string } | null;
    };

    // HTTP 202: email confirmation or server-activated account
    if (
      response.status === 202 ||
      responseData.code === 'EMAIL_CONFIRMATION_REQUIRED' ||
      responseData.code === 'SIGNUP_READY_SIGN_IN'
    ) {
      const ready = responseData.code === 'SIGNUP_READY_SIGN_IN';
      return {
        user: null,
        token: null,
        requiresEmailConfirmation: true,
        accountReadyForLogin: ready,
        error: responseData.message || 'Please check your email to confirm your account.',
        errorCode: responseData.code || 'EMAIL_CONFIRMATION_REQUIRED',
      };
    }

    const session = responseData.session as { access_token?: string; refresh_token?: string } | null;
    if (!session?.access_token) {
      // Unexpected: 200 but no session — surface it clearly
      return {
        user: null,
        token: null,
        error: 'Account created but could not log you in. Please log in manually.',
        errorCode: 'SIGNUP_FAILED',
      };
    }

    setAuthToken(session.access_token);

    // Fetch full profile (with role) immediately after signup
    try {
      const meResponse = await authService.getMe();
      const normalized = normalizeAuthUser(meResponse.data as { profile?: User });
      if (normalized) {
        return {
          user: normalized,
          token: session.access_token,
          refreshToken: session.refresh_token ?? null,
        };
      }
    } catch {
      // Fall back below
    }

    const fallback = normalizeAuthUser({
      ...(responseData.user as object),
      role: data.role,
      name: data.name,
      email: data.email,
      phone: data.phone,
    } as User);

    return {
      user: fallback,
      token: session.access_token,
      refreshToken: session.refresh_token ?? null,
    };
  },

  /**
   * Updates user profile.
   */
  async updateProfile(data: Partial<User>): Promise<Partial<User>> {
    await authService.updateProfile(data);
    return data;
  },

  async resendConfirmation(email: string): Promise<{
    success: boolean;
    error?: string;
    errorCode?: AuthErrorCode | string;
    accountReadyForLogin?: boolean;
  }> {
    try {
      const response = await authService.resendConfirmation(email.trim());
      const data = response.data as { code?: string; message?: string };
      const ready = data.code === 'SIGNUP_READY_SIGN_IN';
      return {
        success: true,
        accountReadyForLogin: ready,
        error: data.message,
      };
    } catch (err: unknown) {
      const { message, code } = parseAuthFailure(err);
      const friendly = isAuthEmailRateLimited(code)
        ? getAuthRateLimitMessage(code, 'resend')
        : message;
      return {
        success: false,
        error: friendly,
        errorCode: code,
        accountReadyForLogin: code === 'SIGNUP_READY_SIGN_IN',
      };
    }
  },

  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      await authService.deleteAccount();
      return { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        const message =
          (typeof detail === 'object' && detail?.message) ||
          (typeof detail === 'string' && detail) ||
          `Could not delete your account. Please try again or contact ${SUPPORT_EMAIL}.`;
        return { success: false, error: message };
      }
      return {
        success: false,
        error: `Network error. Please try again or contact ${SUPPORT_EMAIL}.`,
      };
    }
  },
};

