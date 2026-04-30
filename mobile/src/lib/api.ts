/**
 * api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Axios client with structured error interception.
 *
 * Interceptors handle:
 *  - Auth token injection (request)
 *  - 401 auto-logout
 *  - Network/timeout errors → showToast + structured AppError passthrough
 *  - All errors normalized via handleApiError before rejection
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { handleApiError } from './errorHandler';

// ─── Base URL Resolution ───────────────────────────────────────────────────────

const PRODUCTION_API_URL = 'https://trimit-api.onrender.com';
const LOCAL_PORT = '8001';

/**
 * Programmatically determines the best API URL.
 * Priority: 1. Explicit env var → 2. Auto-detected host IP → 3. Production fallback
 */
const getBaseURL = (): string => {
  if (!__DEV__) return PRODUCTION_API_URL;

  const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
  if (ENV_URL && ENV_URL.startsWith('https://')) {
    console.log('[API] Using production URL from .env:', ENV_URL);
    return ENV_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const hostIP = hostUri?.split(':')[0];

  if (hostIP && !hostIP.includes('127.0.0.1')) {
    const detected = `http://${hostIP}:${LOCAL_PORT}`;
    console.log('[API] Auto-detected host:', detected);
    return detected;
  }

  if (Platform.OS === 'android') return `http://10.0.2.2:${LOCAL_PORT}`;
  return PRODUCTION_API_URL;
};

const API_BASE_URL = getBaseURL();
console.log(`[API] Client initialized → ${API_BASE_URL}`);

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000, // 15 seconds
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const appError = handleApiError(error);

    // 401 → auto-logout (lazy require prevents circular dependency)
    if (appError.type === 'auth') {
      try {
        const { useAuthStore } = require('../store/authStore');
        const state = useAuthStore.getState();
        if (state.isAuthenticated) {
          state.logout();
        }
      } catch {
        // Store may not be initialized yet — safe to swallow
      }
    }

    // Network / timeout errors → show toast immediately
    if (appError.type === 'network' || appError.type === 'timeout') {
      try {
        const { showToast } = require('../store/toastStore');
        showToast(appError.message, 'error');
      } catch {
        // Toast store may not be ready — safe to swallow
      }
    }

    // Reject with the structured AppError so catch blocks get typed errors
    return Promise.reject(appError);
  }
);

// ─── Auth Token Helper ────────────────────────────────────────────────────────

export const setAuthToken = (token: string | null): void => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;
