import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api, { setAuthToken } from '../lib/api';
import { User } from '../types';
import { secureStorage } from '../lib/secureStorage';
import { supabase } from '../lib/supabase';
import { QueryClient } from '@tanstack/react-query';

import { handleApiError } from '../lib/errorHandler';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  queryClient: QueryClient | null;

  setUser: (user: User | null, token: string | null) => void;
  setHydrated: (val: boolean) => void;
  setQueryClient: (qc: QueryClient) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, phone: string, role: 'customer' | 'owner') => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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
      isHydrated: false,
      error: null,
      queryClient: null,

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: !!user, error: null });
        setAuthToken(token);
      },

      setHydrated: (val) => set({ isHydrated: val }),

      setQueryClient: (qc) => set({ queryClient: qc }),

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
        } catch (error) {
          const appError = handleApiError(error);
          set({ isLoading: false, error: appError.message });
          return { success: false, error: appError.message };
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
              user: { id: user.id, email, name, phone, role, created_at: new Date().toISOString() } as User,
              token: session.access_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({ isLoading: false });
          }
          
          return { success: true };
        } catch (error) {
          const appError = handleApiError(error);
          set({ isLoading: false, error: appError.message });
          return { success: false, error: appError.message };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/auth/forgot-password', { email });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: true }; // Always succeed to prevent email enumeration
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await api.patch('/api/auth/profile', data);
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, ...data },
              isLoading: false,
            });
          }
          return { success: true };
        } catch (error) {
          const appError = handleApiError(error);
          set({ isLoading: false, error: appError.message });
          return { success: false, error: appError.message };
        }
      },

      logout: async () => {
        const { queryClient } = get();
        
        try {
          // 1. Sign out from Supabase (removes session from server/cookies)
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('[AuthStore] Supabase signOut failed:', err);
        }
        
        // 2. Clear API token from axios interceptors
        setAuthToken(null);
        
        // 3. Clear QueryClient cache (critical: prevents data bleed between users)
        if (queryClient) {
          queryClient.clear();
        }
        
        // 4. Reset local Zustand state to defaults
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
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
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: (state) => {
        return () => {
          state?.setHydrated(true);
          state?.initializeAuth();
        };
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
