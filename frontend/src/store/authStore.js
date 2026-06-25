import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";
import { clearPersistedAuth, AUTH_STORAGE_KEY } from "../lib/session";
import { mapAuthApiError } from "../lib/authRateLimitMessages";
import { SUPPORT_EMAIL } from "../config/contact";
import { supabase } from "../lib/supabase";

const translateAuthError = (error, context = "generic") => {
  const detail = error.response?.data?.detail;
  const rawMessage =
    (typeof detail === "object" && detail?.message) ||
    (typeof detail === "string" && detail) ||
    error.message ||
    "";

  const lowerMessage = rawMessage.toLowerCase();

  if (
    lowerMessage.includes("too many") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("exceeded")
  ) {
    return "You have made too many requests in a short time. Please wait a moment before trying again.";
  }

  if (
    lowerMessage.includes("invalid or expired otp") ||
    lowerMessage.includes("invalid otp") ||
    lowerMessage.includes("expired otp") ||
    (lowerMessage.includes("token") && lowerMessage.includes("invalid"))
  ) {
    return "The verification code you entered is invalid or has expired. Please check the code or request a new one.";
  }

  if (
    lowerMessage.includes("invalid login credentials") ||
    (lowerMessage.includes("credentials") &&
      lowerMessage.includes("invalid")) ||
    lowerMessage.includes("incorrect") ||
    lowerMessage.includes("not found")
  ) {
    return "The email address or password you entered is incorrect. Please verify and try again.";
  }

  if (
    lowerMessage.includes("network error") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("connecting") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "We are having trouble connecting to our servers. Please check your internet connection and try again.";
  }

  if (context === "login") {
    return "We could not sign you in. Please check your credentials and try again.";
  }
  if (context === "signup") {
    return "We could not create your account. Please check the details you entered and try again.";
  }
  if (context === "send-otp") {
    return "We failed to send the verification code to your email. Please verify your email address and try again.";
  }
  if (context === "verify-otp") {
    return "The verification code check failed. Please request a new code and try again.";
  }

  return rawMessage || "Something went wrong. Please try again.";
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      hasSalon: false,
      // Mirrors mobile: false → new/broken account that must finish
      // CompleteProfile (pick role + name) before accessing the app.
      profileComplete: false,
      error: null,

      setUser: (user, profile, token, refreshToken = null) => {
        set({
          user,
          profile,
          token,
          refreshToken,
          isAuthenticated: !!user,
          error: null,
        });
        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post("/auth/login", { email, password });
          const { user, access_token, refresh_token, profile } = response.data;

          api.defaults.headers.common["Authorization"] =
            `Bearer ${access_token}`;
          if (refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
          }

          // Check if owner has a salon
          let hasSalon = false;
          if (profile?.role === "owner") {
            try {
              const salonRes = await api.get("/owner/salon");
              hasSalon = !!salonRes.data;
            } catch (e) {
              hasSalon = false;
            }
          }

          set({
            user,
            profile: profile || null,
            token: access_token,
            refreshToken: refresh_token ?? null,
            isAuthenticated: true,
            isLoading: false,
            hasSalon,
            profileComplete: true,
            error: null,
          });

          return { success: true, profile, hasSalon };
        } catch (error) {
          const message = translateAuthError(error, "login");
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      logout: () => {
        delete api.defaults.headers.common.Authorization;
        clearPersistedAuth();
        void supabase.auth.signOut();
        set({
          user: null,
          profile: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitializing: false,
          hasSalon: false,
          profileComplete: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      setHasSalon: (hasSalon) => set({ hasSalon }),

      initializeAuth: async () => {
        const state = get();

        if (!state.token) {
          set({ isInitializing: false, isAuthenticated: false });
          return;
        }

        // Production rule: trust persisted auth immediately on cold start. A
        // Render cold start, 5xx, DNS issue, or flaky mobile network must never
        // log out a real user. Only a confirmed 401 below clears the session.
        api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
        set({ isInitializing: false, isAuthenticated: true, error: null });

        try {
          if (state.refreshToken) {
            const { data, error: sessionError } =
              await supabase.auth.setSession({
                access_token: state.token,
                refresh_token: state.refreshToken,
              });
            if (!sessionError && data.session?.access_token) {
              const nextAccessToken = data.session.access_token;
              const nextRefreshToken =
                data.session.refresh_token || state.refreshToken;
              api.defaults.headers.common["Authorization"] =
                `Bearer ${nextAccessToken}`;
              set({ token: nextAccessToken, refreshToken: nextRefreshToken });
            }
          }

          const response = await api.get("/auth/me");
          const userData = response.data;
          const resolvedProfile = userData.profile || state.profile || null;

          let hasSalon = state.hasSalon || false;
          if (resolvedProfile?.role === "owner") {
            try {
              const salonRes = await api.get("/owner/salon");
              hasSalon = !!salonRes.data;
            } catch (e) {
              // Do not mark the owner as salon-less because of a transient fetch
              // failure. Preserve the last known value until a later refresh.
              hasSalon = state.hasSalon || false;
            }
          } else {
            hasSalon = false;
          }

          set({
            user: userData,
            profile: resolvedProfile,
            isAuthenticated: true,
            isInitializing: false,
            hasSalon,
            profileComplete:
              userData.profile_complete ?? !!resolvedProfile?.role,
            error: null,
          });
        } catch (error) {
          if (error.response?.status === 401) {
            clearPersistedAuth();
            delete api.defaults.headers.common.Authorization;
            void supabase.auth.signOut();
            set({
              user: null,
              profile: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isInitializing: false,
              hasSalon: false,
            });
            return;
          }

          set({ isInitializing: false, isAuthenticated: true });
        }
      },

      // Forgot Password - Request reset link
      forgotPassword: async (email) => {
        try {
          const response = await api.post("/auth/forgot-password", { email });
          return { success: true, data: response.data };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const mapped = mapAuthApiError(detail, "forgot");
          const message =
            mapped.message ||
            (typeof detail === "object" && detail?.message) ||
            (typeof detail === "string" && detail) ||
            "Failed to send reset email";
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
          const response = await api.post("/auth/validate-reset-token", {
            token,
          });
          return { valid: true, data: response.data };
        } catch (error) {
          const message =
            error.response?.data?.detail || "Invalid or expired token";
          return { valid: false, error: message };
        }
      },

      // Reset Password with token
      resetPassword: async (token, newPassword) => {
        try {
          const response = await api.post("/auth/reset-password", {
            token,
            password: newPassword,
          });
          return { success: true, data: response.data };
        } catch (error) {
          const message =
            error.response?.data?.detail || "Failed to reset password";
          return { success: false, error: message };
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.delete("/auth/account");
          get().logout();
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const message =
            (typeof detail === "object" && detail?.message) ||
            (typeof detail === "string" && detail) ||
            `Could not delete your account. Please try again or contact ${SUPPORT_EMAIL}.`;
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      sendOtp: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await api.post("/auth/send-otp", { email });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = translateAuthError(error, "send-otp");
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      verifyOtp: async (email, token, type) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post("/auth/verify-otp", {
            email,
            token,
            type,
          });
          const {
            user,
            access_token,
            refresh_token,
            profile,
            profile_complete,
          } = response.data;

          api.defaults.headers.common["Authorization"] =
            `Bearer ${access_token}`;
          if (refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
          }

          // New / broken account (no public.users row yet). Mirror mobile:
          // authenticate the session but gate the user into CompleteProfile
          // where they pick role (customer/owner) + name. The backend creates
          // the profile via /auth/complete-profile — role is decided AFTER OTP.
          if (!profile_complete) {
            set({
              user: user || null,
              profile: null,
              token: access_token,
              refreshToken: refresh_token ?? null,
              isAuthenticated: true,
              isLoading: false,
              hasSalon: false,
              profileComplete: false,
              error: null,
            });
            return {
              success: true,
              profileComplete: false,
              session: response.data,
            };
          }

          // Existing user — profile already resolved.
          let hasSalon = false;
          if (profile?.role === "owner") {
            try {
              const salonRes = await api.get("/owner/salon");
              hasSalon = !!salonRes.data;
            } catch (e) {
              hasSalon = false;
            }
          }

          set({
            user,
            profile: profile || null,
            token: access_token,
            refreshToken: refresh_token ?? null,
            isAuthenticated: true,
            isLoading: false,
            hasSalon,
            profileComplete: true,
            error: null,
          });

          return {
            success: true,
            profileComplete: true,
            profile,
            hasSalon,
            session: response.data,
          };
        } catch (error) {
          const message = translateAuthError(error, "verify-otp");
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Mandatory second step after OTP for new users. Creates the
      // public.users row with the chosen role. Idempotent server-side —
      // role cannot be escalated once the row exists.
      completeProfile: async ({ role, name, phone }) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post("/auth/complete-profile", {
            role,
            name,
            phone,
          });
          const profile = response.data?.profile || null;

          let hasSalon = false;
          if (profile?.role === "owner") {
            try {
              const salonRes = await api.get("/owner/salon");
              hasSalon = !!salonRes.data;
            } catch (e) {
              hasSalon = false;
            }
          }

          set({
            profile,
            isAuthenticated: true,
            isLoading: false,
            hasSalon,
            profileComplete: true,
            error: null,
          });
          return { success: true, profile, hasSalon };
        } catch (error) {
          const detail = error.response?.data?.detail;
          const message =
            (typeof detail === "object" && detail?.message) ||
            (typeof detail === "string" && detail) ||
            translateAuthError(error, "generic");
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        hasSalon: state.hasSalon,
        profileComplete: state.profileComplete,
      }),
    },
  ),
);
