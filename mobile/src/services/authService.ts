import apiClient from './apiClient';
import type { AxiosResponse } from 'axios';

/** Typed payload for POST /auth/signup (legacy password-based path). */
interface SignupPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'customer' | 'owner' | 'employee';
}

/** Typed payload for POST /auth/complete-profile (new OTP post-auth path). */
interface CompleteProfilePayload {
  role: 'customer' | 'owner' | 'employee';
  name: string;
  phone?: string;
  /** Owner UPI ID (VPA, e.g. "glowsalon@okaxis"). Required for owners. */
  upi_id?: string;
  gender?: 'male' | 'female';
}

export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<AxiosResponse> => {
    return apiClient.post('/auth/login', credentials);
  },

  /** @deprecated Legacy password-based signup. Use OTP flow + completeProfile instead. */
  signup: async (data: SignupPayload): Promise<AxiosResponse> => {
    return apiClient.post('/auth/signup', data);
  },

  forgotPassword: async (email: string): Promise<AxiosResponse> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resendConfirmation: async (email: string): Promise<AxiosResponse> => {
    return apiClient.post('/auth/resend-confirmation', { email });
  },

  updateProfile: async (data: Partial<{
    name: string;
    phone: string;
    gender: 'male' | 'female';
    discovery_audience: 'auto' | 'men' | 'women' | 'all';
  }>): Promise<AxiosResponse> => {
    return apiClient.patch('/auth/profile', data);
  },

  registerPushToken: async (pushToken: string): Promise<AxiosResponse> => {
    return apiClient.post('/auth/push-token', { push_token: pushToken });
  },

  updateNotificationPreferences: async (prefs: {
    push_enabled?: boolean;
    notify_bookings?: boolean;
    notify_booking_updates?: boolean;
    notify_promotional?: boolean;
    notify_reminders?: boolean;
  }): Promise<AxiosResponse> => {
    return apiClient.patch('/auth/notification-preferences', prefs);
  },

  getMe: async (): Promise<AxiosResponse> => {
    return apiClient.get('/auth/me');
  },

  deleteAccount: async (): Promise<AxiosResponse> => {
    return apiClient.delete('/auth/account');
  },

  sendOtp: async (email: string): Promise<AxiosResponse> => {
    return apiClient.post('/auth/send-otp', { email });
  },

  /**
   * Verify an OTP token.
   *
   * Note: role/name/phone extras have been removed. Profile creation now
   * happens via a separate completeProfile() call after verification.
   * The response includes `profile_complete: boolean` to indicate whether
   * the user already has a profile (returning user) or still needs to
   * complete setup (new user).
   */
  verifyOtp: async (
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'magiclink',
  ): Promise<AxiosResponse> => {
    return apiClient.post('/auth/verify-otp', { email, token, type });
  },

  /**
   * Create the user's profile after OTP verification.
   *
   * Called when verify-otp returns `profile_complete: false`. Idempotent —
   * safe to retry. The backend enforces role assignment server-side.
   */
  completeProfile: async (data: CompleteProfilePayload): Promise<AxiosResponse> => {
    return apiClient.post('/auth/complete-profile', data);
  },
};

