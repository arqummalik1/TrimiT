import { authService } from '../services/authService';
import { setAuthToken } from '../services/apiClient';
import { User } from '../types';
import axios from 'axios';

// Structured error codes the store and UI can respond to specifically
export type AuthErrorCode =
  | 'EMAIL_CONFIRMATION_REQUIRED'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ALREADY_REGISTERED'
  | 'PROFILE_CREATION_FAILED'
  | 'LOGIN_FAILED'
  | 'SIGNUP_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface AuthResult {
  user: User | null;
  token: string | null;
  /** Supabase refresh token — required for `supabase.auth.setSession` / Realtime RLS. */
  refreshToken?: string | null;
  /** Set when signup succeeds but email confirmation is needed before login. */
  requiresEmailConfirmation?: boolean;
  /** Friendly error message for display */
  error?: string;
  /** Machine-readable error code */
  errorCode?: AuthErrorCode;
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
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        const code: AuthErrorCode =
          (typeof detail === 'object' && detail?.code) || 'LOGIN_FAILED';
        const message =
          (typeof detail === 'object' && detail?.message) ||
          (typeof detail === 'string' && detail) ||
          'Login failed. Please check your credentials.';

        if (code === 'EMAIL_NOT_CONFIRMED') {
          return {
            user: null,
            token: null,
            requiresEmailConfirmation: true,
            error: message,
            errorCode: code,
          };
        }
        return { user: null, token: null, error: message, errorCode: code };
      }
      return {
        user: null,
        token: null,
        error: 'Network error. Please try again.',
        errorCode: 'NETWORK_ERROR',
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

    // The `profile` key from our backend is the public.users row with `role`.
    // If for any reason it's missing, fall back to the raw Supabase user object.
    const resolvedUser = (profile || user || {}) as User;

    // Guarantee role is present: fetch /auth/me as the definitive source of truth.
    // This also validates the session is accepted by the backend.
    try {
      const meResponse = await authService.getMe();
      const meData = meResponse.data as { profile?: User; id?: string; email?: string };
      const meProfile = meData?.profile || meData;
      if (meProfile && (meProfile as User).id) {
        return { user: meProfile as User, token: access_token, refreshToken: refresh_token ?? null };
      }
    } catch {
      // /auth/me failure is non-fatal — use what we have from the login response
    }

    return { user: resolvedUser, token: access_token, refreshToken: refresh_token ?? null };
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
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        const code: AuthErrorCode =
          (typeof detail === 'object' && detail?.code) || 'SIGNUP_FAILED';
        const message =
          (typeof detail === 'object' && detail?.message) ||
          (typeof detail === 'string' && detail) ||
          'Signup failed. Please try again.';
        return { user: null, token: null, error: message, errorCode: code };
      }
      return {
        user: null,
        token: null,
        error: 'Network error. Please try again.',
        errorCode: 'NETWORK_ERROR',
      };
    }

    const responseData = response.data as {
      code?: string;
      message?: string;
      user?: Record<string, unknown>;
      session?: { access_token: string } | null;
    };

    // HTTP 202: email confirmation required — not an error, but not logged in yet
    if (response.status === 202 || responseData.code === 'EMAIL_CONFIRMATION_REQUIRED') {
      return {
        user: null,
        token: null,
        requiresEmailConfirmation: true,
        error: responseData.message || 'Please check your email to confirm your account.',
        errorCode: 'EMAIL_CONFIRMATION_REQUIRED',
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
      const meData = meResponse.data as { profile?: User; id?: string };
      const meProfile = meData?.profile || meData;
      if (meProfile && (meProfile as User).id) {
        return {
          user: meProfile as User,
          token: session.access_token,
          refreshToken: session.refresh_token ?? null,
        };
      }
    } catch {
      // Fall back to raw signup user if /auth/me fails
    }

    return {
      user: { ...responseData.user, ...data } as unknown as User,
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
};

