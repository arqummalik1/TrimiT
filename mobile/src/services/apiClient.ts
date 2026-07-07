import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { handleApiError } from '../lib/errorHandler';
import { buildConfig } from '../lib/buildConfig';
import { createIdempotencyKey, pathRequiresIdempotencyKey } from '../lib/idempotency';
import { showToast } from '../store/toastStore';
import { supabase } from '../lib/supabase';

let lastOfflineToastAt = 0;

const LOCAL_PORT = '8001';

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

// 30s (was 15s). The backend runs on Render, which cold-starts after idle: the
// first request can take 30-50s to wake the dyno. A 15s timeout aborted that
// wake-up and surfaced as a false "No internet"/"timed out" error, so the very
// first create/upload failed and only a manual retry (server now warm) worked.
// 30s covers the common cold start; slow uploads set their own longer timeout.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getRequestUrl(config: InternalAxiosRequestConfig): string {
  const base = (config.baseURL || API_BASE_URL).replace(/\/$/, '');
  const path = (config.url || '').startsWith('/') ? (config.url || '') : `/${config.url || ''}`;
  return `${base}${path}`;
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retryAfterRefresh?: boolean;
  _networkRetryCount?: number;
};

// A single mobile request can hit a transient fetch failure (Wi‑Fi/cellular
// handoff, DNS blip, TLS reset) even when the connection is otherwise healthy —
// RN surfaces this as "Network request failed" with no HTTP response. Zomato /
// Swiggy-class apps silently retry these instead of hard-failing the first
// attempt. We retry only requests that are SAFE to replay: idempotent methods
// (GET/HEAD/OPTIONS) or any mutating request that carries an Idempotency-Key
// (all our POST/PUT/PATCH mutations do), so a retry can never double-charge or
// double-create.
const MAX_NETWORK_RETRIES = 2;
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);

function isTransientNetworkError(error: unknown): boolean {
  const err = error as {
    response?: unknown;
    code?: string;
    message?: string;
    kind?: string;
  };
  // Our own offline pre-check reject: no point retrying while truly offline.
  if (err?.kind === 'network' && err?.code === 'OFFLINE') return false;
  if (!axios.isAxiosError(error)) return false;
  // No HTTP response => network layer failed. Also treat timeouts as retriable.
  return !error.response || error.code === 'ECONNABORTED';
}

function isReplayableRequest(config?: RetriableRequestConfig): boolean {
  if (!config) return false;
  const method = (config.method || 'get').toLowerCase();
  if (IDEMPOTENT_METHODS.has(method)) return true;
  const headers = config.headers as { get?: (k: string) => unknown } | undefined;
  const hasIdempotencyKey =
    !!headers?.get?.('Idempotency-Key') || !!headers?.get?.('idempotency-key');
  return hasIdempotencyKey;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function isProtectedAuthFailure(status: number | undefined, reqUrl: string): boolean {
  return (
    status === 401 &&
    !!reqUrl &&
    !reqUrl.includes('/auth/login') &&
    !reqUrl.includes('/auth/signup') &&
    !reqUrl.includes('/auth/forgot-password') &&
    !reqUrl.includes('/auth/reset-password') &&
    !reqUrl.includes('/auth/send-otp') &&
    !reqUrl.includes('/auth/verify-otp')
  );
}

apiClient.interceptors.request.use(
  async (config) => {
    const net = await NetInfo.fetch();
    // Only block when the OS reports disconnected. isInternetReachable flickers on
    // cellular/Wi‑Fi handoff and caused false "no internet" errors during booking.
    const offline = net.isConnected === false;
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
      if (!config.headers) {
        config.headers = new axios.AxiosHeaders();
      }
      const existing = config.headers.get('Idempotency-Key') || config.headers.get('idempotency-key');
      if (!existing) {
        config.headers.set('Idempotency-Key', await createIdempotencyKey());
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
    const config = (error as { config?: RetriableRequestConfig })?.config;
    const reqUrl = config
      ? getRequestUrl(config)
      : '';

    // Transparent retry for transient network blips on safe-to-replay requests.
    // This is what makes the first salon-create / booking attempt survive a
    // flaky connection instead of surfacing a false "No internet" error.
    if (isTransientNetworkError(error) && isReplayableRequest(config) && config) {
      const attempts = config._networkRetryCount ?? 0;
      if (attempts < MAX_NETWORK_RETRIES) {
        config._networkRetryCount = attempts + 1;
        await delay(400 * (attempts + 1));
        if (__DEV__) {
          console.warn('🔁 [API][RETRY]', {
            attempt: config._networkRetryCount,
            method: (config.method || 'GET').toUpperCase(),
            url: reqUrl,
          });
        }
        return apiClient.request(config);
      }
    }

    if (isProtectedAuthFailure(status, reqUrl) && config && !config._retryAfterRefresh) {
      try {
        const { useAuthStore } = await import('../store/authStore');
        const authState = useAuthStore.getState();
        if (authState.refreshToken) {
          const { data, error: refreshError } = await supabase.auth.setSession({
            access_token: authState.token ?? '',
            refresh_token: authState.refreshToken,
          });

          const nextAccessToken = data.session?.access_token ?? null;
          const nextRefreshToken = data.session?.refresh_token ?? authState.refreshToken;

          if (!refreshError && nextAccessToken) {
            useAuthStore.setState({
              token: nextAccessToken,
              refreshToken: nextRefreshToken,
              isAuthenticated: true,
              sessionExpired: false,
              error: null,
            });
            setAuthToken(nextAccessToken);
            config._retryAfterRefresh = true;
            if (!config.headers) {
              config.headers = new axios.AxiosHeaders();
            }
            config.headers.set('Authorization', `Bearer ${nextAccessToken}`);
            return apiClient.request(config);
          }
        }
      } catch {
        // fall through to session clear below
      }
    }

    if (isProtectedAuthFailure(status, reqUrl)) {
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

    // Owner subscription lapsed: the backend gates owner endpoints with HTTP 402
    // SUBSCRIPTION_REQUIRED. Instead of surfacing a raw error, drive the freeze
    // gate by seeding the subscription-status query (has_access=false) and
    // refetching the real status. The SubscriptionGate overlay then blocks the
    // owner app and routes them to checkout.
    if (status === 402 || normalizedError.code === 'SUBSCRIPTION_REQUIRED') {
      try {
        const { useAuthStore } = await import('../store/authStore');
        const { queryKeys } = await import('../lib/queryKeys');
        const qc = useAuthStore.getState().queryClient;
        if (qc) {
          qc.setQueryData(queryKeys.subscriptionStatus, {
            status: 'expired',
            has_access: false,
            is_trial: false,
            trial_days_remaining: 0,
            next_renewal_at: null,
            enforcement_enabled: true,
          });
          qc.invalidateQueries({ queryKey: queryKeys.subscriptionStatus });
        }
      } catch {
        // best-effort; backend still enforces server-side
      }
    }

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
