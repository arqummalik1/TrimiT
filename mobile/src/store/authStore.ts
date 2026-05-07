import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authRepository } from '../repositories/authRepository';
import { setAuthToken } from '../services/apiClient';
import { User } from '../types';
import { secureStorage } from '../lib/secureStorage';
import { supabase } from '../lib/supabase';
import { QueryClient } from '@tanstack/react-query';

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
          const { user, token } = await authRepository.login(email, password);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      signup: async (email, password, name, phone, role) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authRepository.signup({
            email,
            password,
            name,
            phone,
            role,
          });
          
          if (token) {
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({ isLoading: false });
          }
          
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const { authService } = require('../services/authService');
          await authService.forgotPassword(email);
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
          await authRepository.updateProfile(data);
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, ...data },
              isLoading: false,
            });
          }
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        const { queryClient } = get();
        
        console.log('[AuthStore] Logout initiated');
        
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('[AuthStore] Supabase signOut failed:', err);
        }
        
        // Clear auth token from API client
        setAuthToken(null);
        
        // Clear React Query cache
        if (queryClient) {
          queryClient.clear();
        }
        
        // Clear auth state - this will trigger navigation change
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
        
        console.log('[AuthStore] Logout complete - state cleared');
      },

      clearError: () => set({ error: null }),

      initializeAuth: async () => {
        const state = get();
        console.log('[AuthStore] Initializing auth...');
        
        if (state.token) {
          console.log('[AuthStore] Token found in storage, setting in API client');
          setAuthToken(state.token);
          try {
            const { authService } = require('../services/authService');
            await authService.getMe();
            console.log('[AuthStore] Auth initialized');
          } catch (err) {
            console.warn('[AuthStore] Stored token is invalid/expired, clearing session');
            setAuthToken(null);
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              error: null,
            });
          }
        } else {
          console.log('[AuthStore] No token found in storage');
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
