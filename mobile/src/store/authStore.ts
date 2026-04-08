import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../lib/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  setUser: (user: User | null, token: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, phone: string, role: 'customer' | 'owner') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: !!user, error: null });
        setAuthToken(token);
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/auth/login', { email, password });
          const { user, access_token, profile } = response.data;
          
          setAuthToken(access_token);
          
          set({
            user: profile || user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error: any) {
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
            role,
          });
          
          const { user, session } = response.data;
          
          if (session?.access_token) {
            setAuthToken(session.access_token);
            
            set({
              user: { id: user.id, email, name, phone, role, created_at: new Date().toISOString() },
              token: session.access_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({ isLoading: false });
          }
          
          return { success: true };
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Signup failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      logout: () => {
        setAuthToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      initializeAuth: () => {
        const state = get();
        if (state.token) {
          setAuthToken(state.token);
        }
      },
    }),
    {
      name: 'trimit-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
