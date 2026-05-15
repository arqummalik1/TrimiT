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

  updateProfile: async (data: Partial<{ name: string; phone: string }>) => {
    return apiClient.patch('/auth/profile', data);
  },

  registerPushToken: async (pushToken: string) => {
    return apiClient.post('/auth/push-token', { push_token: pushToken });
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },

  deleteAccount: async () => {
    return apiClient.delete('/auth/account');
  },
};
