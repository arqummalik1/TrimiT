import apiClient, { API_V1_PREFIX } from './apiClient';
import { User } from '../types';

/**
 * Service layer for Authentication API calls.
 */
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    return apiClient.post(`${API_V1_PREFIX}/auth/login`, credentials);
  },

  signup: async (data: any) => {
    return apiClient.post(`${API_V1_PREFIX}/auth/signup`, data);
  },

  forgotPassword: async (email: string) => {
    return apiClient.post(`${API_V1_PREFIX}/auth/forgot-password`, { email });
  },

  updateProfile: async (data: Partial<User>) => {
    return apiClient.patch(`${API_V1_PREFIX}/auth/profile`, data);
  },

  registerPushToken: async (pushToken: string) => {
    return apiClient.post(`${API_V1_PREFIX}/auth/push-token`, { push_token: pushToken });
  }
};
