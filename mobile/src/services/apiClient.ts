import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { handleApiError } from '../lib/errorHandler';
import { generateRequestSignature } from '../lib/security';

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

/** Path as seen by the server (e.g. `/api/v1/salons/`) for HMAC signature middleware. */
function resolvePathForSignature(config: InternalAxiosRequestConfig): string {
  const raw = config.url || '';
  if (raw.startsWith('http')) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  }
  const base = (config.baseURL || '').replace(/\/$/, '');
  const rel = raw.startsWith('/') ? raw : `/${raw}`;
  const joined = `${base}${rel}`;
  try {
    return new URL(joined).pathname;
  } catch {
    return `/api/v1${rel.startsWith('/') ? rel : `/${rel}`}`;
  }
}

apiClient.interceptors.request.use(
  async (config) => {
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '');
    if (isMutating && config.url) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const path = resolvePathForSignature(config);
        const signature = await generateRequestSignature(
          config.method || 'POST',
          path,
          config.data,
          timestamp
        );
        if (signature) {
          config.headers['X-Trimit-Timestamp'] = timestamp;
          config.headers['X-Trimit-Signature'] = signature;
        }
      } catch (err) {
        console.warn('[API] Signature failed:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalizedError = handleApiError(error);
    if (__DEV__ && normalizedError.kind === 'network') {
      console.error('[API] Network Error:', error);
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
