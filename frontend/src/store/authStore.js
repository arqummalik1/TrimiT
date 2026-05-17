import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { mapAuthApiError } from '../lib/authRateLimitMessages';
import { SUPPORT_EMAIL } from '../config/contact';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: true,
      hasSalon: false,
      error: null,

      setUser: (user, profile, token) => {
        set({ 
          user, 
          profile, 
          token, 
          isAuthenticated: !!user,
          error: null 
        });
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, access_token, profile } = response.data;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          // Check if owner has a salon
          let hasSalon = false;
          if (profile?.role === 'owner') {
            try {
              const salonRes = await api.get('/owner/salon');
              hasSalon = !!salonRes.data;
            } catch (e) {
              hasSalon = false;
            }
          }
          
          set({ 
            user, 
            profile: profile || null,
            token: access_token, 
            isAuthenticated: true,
            isLoading: false,
            hasSalon,
            error: null
          });
          
          return { success: true, profile, hasSalon };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const message =
            (typeof detail === 'object' && detail?.message) ||
            (typeof detail === 'string' && detail) ||
            'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      signup: async (email, password, name, phone, role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/signup', {
            email,
            password,
            name,
            phone,
            role,
          });

          if (
            response.status === 202 ||
            response.data?.code === 'EMAIL_CONFIRMATION_REQUIRED'
          ) {
            set({ isLoading: false, error: null });
            return {
              success: true,
              requiresEmailConfirmation: true,
              message: response.data?.message,
            };
          }

          const { user, session } = response.data;

          if (session?.access_token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;

            set({
              user,
              profile: { name, phone, role, email },
              token: session.access_token,
              isAuthenticated: true,
              isLoading: false,
              hasSalon: false,
              error: null,
            });
            return { success: true, user, hasSalon: false };
          }

          set({ isLoading: false });
          return {
            success: false,
            error: 'Account created but could not log you in. Please sign in.',
          };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const mapped = mapAuthApiError(detail, 'signup');
          const message =
            mapped.message ||
            (typeof detail === 'object' && detail?.message) ||
            (typeof detail === 'string' && detail) ||
            'Signup failed';
          set({ isLoading: false, error: message });
          return {
            success: false,
            error: message,
            errorCode: mapped.code,
            rateLimitTitle: mapped.title,
          };
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('trimit-auth');
        set({ 
          user: null, 
          profile: null,
          token: null, 
          isAuthenticated: false,
          isInitializing: false,
          hasSalon: false,
          error: null
        });
      },

      clearError: () => set({ error: null }),

      setHasSalon: (hasSalon) => set({ hasSalon }),

      initializeAuth: async () => {
        const state = get();
        
        if (!state.token) {
          set({ isInitializing: false });
          return;
        }

        // Set auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;

        try {
          // Validate token by fetching current user
          const response = await api.get('/auth/me');
          const userData = response.data;

          // Check if owner has a salon
          let hasSalon = false;
          if (userData.profile?.role === 'owner') {
            try {
              const salonRes = await api.get('/owner/salon');
              hasSalon = !!salonRes.data;
            } catch (e) {
              hasSalon = false;
            }
          }

          set({ 
            user: userData,
            profile: userData.profile,
            isAuthenticated: true,
            isInitializing: false,
            hasSalon
          });
        } catch (error) {
          // Token invalid or expired - clear auth
          localStorage.removeItem('trimit-auth');
          delete api.defaults.headers.common['Authorization'];
          set({ 
            user: null, 
            profile: null, 
            token: null, 
            isAuthenticated: false,
            isInitializing: false,
            hasSalon: false
          });
        }
      },

      // Forgot Password - Request reset link
      forgotPassword: async (email) => {
        try {
          const response = await api.post('/auth/forgot-password', { email });
          return { success: true, data: response.data };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const mapped = mapAuthApiError(detail, 'forgot');
          const message =
            mapped.message ||
            (typeof detail === 'object' && detail?.message) ||
            (typeof detail === 'string' && detail) ||
            'Failed to send reset email';
          return {
            success: false,
            error: message,
            errorCode: mapped.code,
            rateLimitTitle: mapped.title,
          };
        }
      },

      // Validate Reset Token
      validateResetToken: async (token) => {
        try {
          const response = await api.post('/auth/validate-reset-token', { token });
          return { valid: true, data: response.data };
        } catch (error) {
          const message = error.response?.data?.detail || 'Invalid or expired token';
          return { valid: false, error: message };
        }
      },

      // Reset Password with token
      resetPassword: async (token, newPassword) => {
        try {
          const response = await api.post('/auth/reset-password', {
            token,
            password: newPassword,
          });
          return { success: true, data: response.data };
        } catch (error) {
          const message = error.response?.data?.detail || 'Failed to reset password';
          return { success: false, error: message };
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.delete('/auth/account');
          get().logout();
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const message =
            (typeof detail === 'object' && detail?.message) ||
            (typeof detail === 'string' && detail) ||
            `Could not delete your account. Please try again or contact ${SUPPORT_EMAIL}.`;
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },
    }),
    {
      name: 'trimit-auth',
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        hasSalon: state.hasSalon
      }),
    }
  )
);
