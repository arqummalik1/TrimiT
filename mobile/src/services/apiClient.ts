import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { handleApiError } from '../lib/errorHandler';

/** Host only (no /api/v1). Production Render URL. */
const PRODUCTION_HOST = 'https://trimit-az5h.onrender.com';
const LOCAL_PORT = '8000';

function stripApiVersionSuffix(url: string): string {
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

/**
 * Axios baseURL always ends with `/api/v1`.
 * All request `url` values are paths under that version (e.g. `/salons`, `/auth/login`).
 * There is no separate “/api” vs “/api/v1” on the client — only this base + relative paths.
 */
const getBaseURL = (): string => {
  let host: string;
  if (!__DEV__) {
    host = PRODUCTION_HOST;
  } else {
    const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
    if (ENV_URL) {
      host = stripApiVersionSuffix(ENV_URL);
    } else {
      const hostUri = Constants.expoConfig?.hostUri;
      const hostIP = hostUri?.split(':')[0];
      if (hostIP && !hostIP.includes('127.0.0.1')) {
        host = `http://${hostIP}:${LOCAL_PORT}`;
      } else if (Platform.OS === 'android') {
        host = `http://10.0.2.2:${LOCAL_PORT}`;
      } else {
        host = PRODUCTION_HOST;
      }
    }
  }
  return `${host}/api/v1`;
};

const API_BASE_URL = getBaseURL();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getRequestUrl(config: InternalAxiosRequestConfig): string {
  const base = (config.baseURL || API_BASE_URL).replace(/\/$/, '');
  const path = (config.url || '').startsWith('/') ? (config.url || '') : `/${config.url || ''}`;
  return `${base}${path}`;
}

apiClient.interceptors.request.use(
  async (config) => {
    // Emoji-first API request log for quick scanning in Metro.
    if (__DEV__) {
      console.log('🚀 [API][REQ]', {
        method: (config.method || 'GET').toUpperCase(),
        url: getRequestUrl(config),
        params: config.params,
        hasAuth: !!config.headers?.Authorization || !!apiClient.defaults.headers.common['Authorization'],
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('✅ [API][RES]', {
        status: response.status,
        method: (response.config.method || 'GET').toUpperCase(),
        url: getRequestUrl(response.config as InternalAxiosRequestConfig),
      });
    }
    return response;
  },
  async (error) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const reqUrl = (error as { config?: InternalAxiosRequestConfig })?.config
      ? getRequestUrl((error as { config: InternalAxiosRequestConfig }).config)
      : '';
    if (
      status === 401 &&
      reqUrl &&
      !reqUrl.includes('/auth/login') &&
      !reqUrl.includes('/auth/signup') &&
      !reqUrl.includes('/auth/forgot-password') &&
      !reqUrl.includes('/auth/reset-password')
    ) {
      try {
        const { useAuthStore } = await import('../store/authStore');
        await useAuthStore.getState().clearSession({
          sessionExpired: true,
          errorMessage: 'Session expired. Please sign in again.',
        });
      } catch {
        setAuthToken(null);
      }
    }

    const normalizedError = handleApiError(error);
    if (__DEV__) {
      const log = normalizedError.kind === 'server' || normalizedError.kind === 'network' ? console.error : console.warn;
      log('❌ [API][ERR]', {
        kind: normalizedError.kind,
        message: normalizedError.message,
        code: normalizedError.code,
        requestId: normalizedError.requestId,
        status: (error as { response?: { status?: number } })?.response?.status,
        method: (error as { config?: { method?: string } })?.config?.method?.toUpperCase(),
        url: (error as { config?: InternalAxiosRequestConfig })?.config
          ? getRequestUrl((error as { config: InternalAxiosRequestConfig }).config)
          : undefined,
      });
    }
    return Promise.reject(normalizedError);
  }
);

export const setAuthToken = (token: string | null): void => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export default apiClient;
