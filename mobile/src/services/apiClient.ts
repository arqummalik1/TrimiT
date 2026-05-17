import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { handleApiError } from '../lib/errorHandler';
import { buildConfig } from '../lib/buildConfig';
import { createIdempotencyKey, pathRequiresIdempotencyKey } from '../lib/idempotency';
import { showToast } from '../store/toastStore';

let lastOfflineToastAt = 0;

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
  const releaseHost = stripApiVersionSuffix(buildConfig.apiUrl);

  if (!__DEV__) {
    host = releaseHost;
  } else {
    if (buildConfig.apiUrl) {
      host = releaseHost;
    } else {
      const hostUri = Constants.expoConfig?.hostUri;
      const hostIP = hostUri?.split(':')[0];
      if (hostIP && !hostIP.includes('127.0.0.1')) {
        host = `http://${hostIP}:${LOCAL_PORT}`;
      } else if (Platform.OS === 'android') {
        host = `http://10.0.2.2:${LOCAL_PORT}`;
      } else {
        host = releaseHost;
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
    const net = await NetInfo.fetch();
    const offline = !(net.isConnected && net.isInternetReachable !== false);
    if (offline) {
      const now = Date.now();
      if (now - lastOfflineToastAt > 4000) {
        lastOfflineToastAt = now;
        showToast('No internet connection. Please check your network and try again.', 'warning');
      }
      return Promise.reject({
        kind: 'network' as const,
        message: 'No internet connection. Please check your network and try again.',
        code: 'OFFLINE',
      });
    }

    const method = (config.method || 'get').toLowerCase();
    if (method === 'post' && pathRequiresIdempotencyKey(config.url)) {
      const headers = config.headers ?? {};
      const existing =
        (headers['Idempotency-Key'] as string | undefined) ??
        (headers['idempotency-key'] as string | undefined);
      if (!existing) {
        headers['Idempotency-Key'] = await createIdempotencyKey();
        config.headers = headers;
      }
    }

    if (__DEV__) {
      console.log('🚀 [API][REQ]', {
        method: (config.method || 'GET').toUpperCase(),
        url: getRequestUrl(config),
        params: config.params,
        hasAuth: !!config.headers?.Authorization || !!apiClient.defaults.headers.common['Authorization'],
        idempotencyKey: config.headers?.['Idempotency-Key'] as string | undefined,
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
      const log =
        normalizedError.kind === 'server' ? console.error : console.warn;
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
