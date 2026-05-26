import apiClient from './apiClient';

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    return apiClient.post('/auth/login', credentials);
  },

  signup: async (data: any) => {
    return apiClient.post('/auth/signup', data);
  },

  forgotPassword: async (email: string) => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resendConfirmation: async (email: string) => {
    return apiClient.post('/auth/resend-confirmation', { email });
  },

  updateProfile: async (data: Partial<{ name: string; phone: string }>) => {
    return apiClient.patch('/auth/profile', data);
  },

  registerPushToken: async (pushToken: string) => {
    return apiClient.post('/auth/push-token', { push_token: pushToken });
  },

  updateNotificationPreferences: async (prefs: {
    push_enabled?: boolean;
    notify_bookings?: boolean;
    notify_booking_updates?: boolean;
    notify_promotional?: boolean;
    notify_reminders?: boolean;
  }) => {
    return apiClient.patch('/auth/notification-preferences', prefs);
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },

  deleteAccount: async () => {
    return apiClient.delete('/auth/account');
  },

  sendOtp: async (email: string) => {
    return apiClient.post('/auth/send-otp', { email });
  },

  verifyOtp: async (
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'magiclink',
    extras?: {
      role?: 'customer' | 'owner';
      name?: string;
      phone?: string;
    }
  ) => {
    return apiClient.post('/auth/verify-otp', { email, token, type, ...(extras || {}) });
  },
};
