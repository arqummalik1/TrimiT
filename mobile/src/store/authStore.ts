import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authRepository, parseAuthFailure } from '../repositories/authRepository';
import { setAuthToken } from '../services/apiClient';
import { User } from '../types';
import { normalizeAuthUser } from '../lib/authUser';
import { safeAuthStorage } from '../lib/safeAuthStorage';
import { supabase, syncSupabaseAuthSession } from '../lib/supabase';
import { QueryClient } from '@tanstack/react-query';
import { isAppError } from '../types/error';
import { logger } from '../lib/logger';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  /** True after initializeAuth finishes (success or clear). */
  authBootstrapComplete: boolean;
  sessionExpired: boolean;
  error: string | null;
  requiresEmailConfirmation: boolean;
  queryClient: QueryClient | null;

  setUser: (user: User | null, token: string | null) => void;
  setHydrated: (val: boolean) => void;
  setQueryClient: (qc: QueryClient) => void;
  clearSession: (options?: { sessionExpired?: boolean; errorMessage?: string }) => Promise<void>;
  dismissSessionExpired: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  signup: (email: string, password: string, name: string, phone: string, role: 'customer' | 'owner') => Promise<{ success: boolean; error?: string; errorCode?: string; requiresEmailConfirmation?: boolean; accountReadyForLogin?: boolean }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string; accountReadyForLogin?: boolean }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      authBootstrapComplete: false,
      sessionExpired: false,
      error: null,
      requiresEmailConfirmation: false,
      queryClient: null,

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: !!user, error: null, sessionExpired: false });
        setAuthToken(token);
        void syncSupabaseAuthSession(token, get().refreshToken);
      },

      setHydrated: (val) => set({ isHydrated: val }),

      setQueryClient: (qc) => set({ queryClient: qc }),

      clearSession: async (options) => {
        const { queryClient } = get();
        logger.info('[Auth] clearSession', { sessionExpired: options?.sessionExpired ?? false });

        try {
          await supabase.auth.signOut();
        } catch (err) {
          logger.warn('[Auth] Supabase signOut failed', { err });
        }
        try {
          await supabase.realtime.setAuth();
        } catch (err) {
          logger.warn('[Auth] Realtime clear auth failed', { err });
        }

        setAuthToken(null);
        if (queryClient) {
          queryClient.clear();
        }

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpired: options?.sessionExpired === true,
          error: options?.errorMessage ?? null,
        });
      },

      dismissSessionExpired: () => {
        set({ sessionExpired: false, error: null });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null, requiresEmailConfirmation: false, sessionExpired: false });
        const result = await authRepository.login(email, password);

        if (result.requiresEmailConfirmation) {
          set({
            isLoading: false,
            error: result.error ?? 'Please confirm your email before logging in.',
            requiresEmailConfirmation: true,
          });
          return { success: false, error: result.error, requiresEmailConfirmation: true };
        }

        if (!result.token || !result.user) {
          const errorMsg = result.error ?? 'Login failed. Please try again.';
          set({ isLoading: false, error: errorMsg });
          return { success: false, error: errorMsg };
        }

        set({
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken ?? null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          requiresEmailConfirmation: false,
          authBootstrapComplete: true,
        });
        setAuthToken(result.token);
        void syncSupabaseAuthSession(result.token, result.refreshToken ?? null);
        return { success: true };
      },

      signup: async (email, password, name, phone, role) => {
        set({ isLoading: true, error: null, requiresEmailConfirmation: false, sessionExpired: false });
        const result = await authRepository.signup({ email, password, name, phone, role });

        if (result.requiresEmailConfirmation) {
          set({
            isLoading: false,
            requiresEmailConfirmation: true,
            error: null,
          });
          return {
            success: true,
            requiresEmailConfirmation: true,
            accountReadyForLogin: result.accountReadyForLogin,
          };
        }

        if (!result.token || !result.user) {
          const errorMsg = result.error ?? 'Signup failed. Please try again.';
          set({ isLoading: false, error: errorMsg });
          return { success: false, error: errorMsg, errorCode: result.errorCode };
        }

        set({
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken ?? null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          requiresEmailConfirmation: false,
          authBootstrapComplete: true,
        });
        setAuthToken(result.token);
        void syncSupabaseAuthSession(result.token, result.refreshToken ?? null);
        return { success: true };
      },

      resendConfirmation: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authRepository.resendConfirmation(email);
          if (!result.success) {
            set({ error: result.error ?? 'Could not resend confirmation' });
          }
          return result;
        } finally {
          set({ isLoading: false });
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const { authService } = require('../services/authService');
          await authService.forgotPassword(email);
          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          const message = err instanceof Error ? err.message : 'Could not send reset email';
          return { success: false, error: message };
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
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Update failed';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        const result = await authRepository.deleteAccount();
        if (!result.success) {
          set({ isLoading: false, error: result.error ?? 'Account deletion failed' });
          return result;
        }
        await get().logout();
        set({ isLoading: false });
        return { success: true };
      },

      logout: async () => {
        try {
          const { teardownPushNotifications } = await import('../lib/notifications');
          await teardownPushNotifications();
        } catch {
          // continue logout
        }
        await get().clearSession({ sessionExpired: false });
      },

      clearError: () => set({ error: null }),

      initializeAuth: async () => {
        const state = get();
        logger.info('[Auth] initializeAuth start', { hasToken: !!state.token });

        if (!state.token) {
          set({ authBootstrapComplete: true, isAuthenticated: false });
          return;
        }

        setAuthToken(state.token);
        try {
          const { authService } = require('../services/authService');
          const meResponse = await authService.getMe();
          const user: User | null =
            normalizeAuthUser(meResponse.data as { profile?: User }) ?? state.user;

          set({
            user,
            isAuthenticated: true,
            token: state.token,
            refreshToken: state.refreshToken,
            error: null,
            sessionExpired: false,
            authBootstrapComplete: true,
          });
          await syncSupabaseAuthSession(state.token, state.refreshToken);
          logger.info('[Auth] initializeAuth ok', { role: user?.role });
        } catch (err) {
          logger.warn('[Auth] initializeAuth failed — clearing session', { err });
          await get().clearSession({
            sessionExpired: isAppError(err) && err.kind === 'unauthorized',
            errorMessage:
              isAppError(err) && err.kind === 'unauthorized'
                ? 'Session expired. Please sign in again.'
                : undefined,
          });
          set({ authBootstrapComplete: true });
        }
      },
    }),
    {
      name: 'trimit-auth-storage',
      storage: createJSONStorage(() => safeAuthStorage),
      onRehydrateStorage: () => {
        return (state, err) => {
          if (err) {
            logger.error('[Auth] rehydrate failed — clearing corrupt persist', err);
            void safeAuthStorage.removeItem('trimit-auth-storage');
          }

          const store = state ?? useAuthStore.getState();
          store.setHydrated(true);

          if (!state) {
            useAuthStore.setState({ authBootstrapComplete: true, isAuthenticated: false });
            return;
          }

          void state.initializeAuth();
        };
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
