import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
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
          const response = await api.post('/api/auth/login', { email, password });
          const { user, access_token, profile } = response.data;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          set({ 
            user, 
            profile: profile || null,
            token: access_token, 
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          return { success: true, profile };
        } catch (error) {
          const message = error.response?.data?.detail || 'Login failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      signup: async (email, password, name, phone, role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/auth/signup', { 
            email, 
            password, 
            name, 
            phone, 
            role 
          });
          
          const { user, session } = response.data;
          
          if (session?.access_token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
            
            set({ 
              user, 
              profile: { name, phone, role, email },
              token: session.access_token, 
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            set({ isLoading: false });
          }
          
          return { success: true, user };
        } catch (error) {
          const message = error.response?.data?.detail || 'Signup failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ 
          user: null, 
          profile: null,
          token: null, 
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => set({ error: null }),

      initializeAuth: () => {
        const state = get();
        if (state.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }),
    {
      name: 'trimit-auth',
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
