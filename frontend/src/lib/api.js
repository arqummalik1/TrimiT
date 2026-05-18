import axios from 'axios';
import { getEnv } from '../config/env';
import { clearPersistedAuth } from './session';
import { createIdempotencyKey, pathRequiresIdempotencyKey } from './idempotency';

/**
 * Single API surface: all requests go to …/api/v1 (same contract as mobile).
 * REACT_APP_BACKEND_URL / VITE_BACKEND_URL = origin only.
 */
function resolveApiBaseUrl() {
  const raw = getEnv('BACKEND_URL').trim().replace(/\/$/, '');
  if (!raw) {
    return 'https://trimit-az5h.onrender.com/api/v1';
  }
  if (raw.endsWith('/api/v1')) {
    return raw;
  }
  if (raw.endsWith('/api')) {
    return `${raw}/v1`;
  }
  return `${raw}/api/v1`;
}

/** Public salon discovery — must work without login (no stale Bearer token). */
export function isPublicSalonRead(config) {
  const method = (config?.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  const path = (config?.url || '').split('?')[0].replace(/\/$/, '') || '/';
  return path === '/salons' || path.startsWith('/salons/');
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    if (isPublicSalonRead(config)) {
      const headers = { ...config.headers };
      delete headers.Authorization;
      delete headers.authorization;
      config.headers = headers;
    }

    const method = (config.method || 'get').toLowerCase();
    if (method === 'post' && pathRequiresIdempotencyKey(config.url)) {
      const headers = { ...config.headers };
      const existing =
        headers['Idempotency-Key'] ?? headers['idempotency-key'];
      if (!existing) {
        headers['Idempotency-Key'] = createIdempotencyKey();
      }
      config.headers = headers;
    }
    if (import.meta.env.DEV) {
      console.log('🚀 [WEB_API][REQ]', {
        method: (config.method || 'GET').toUpperCase(),
        url: `${(config.baseURL || '').replace(/\/$/, '')}${(config.url || '').startsWith('/') ? config.url : `/${config.url || ''}`}`,
        params: config.params,
        public: isPublicSalonRead(config),
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ [WEB_API][RES]', {
        status: response.status,
        method: (response.config.method || 'GET').toUpperCase(),
        url: `${(response.config.baseURL || '').replace(/\/$/, '')}${(response.config.url || '').startsWith('/') ? response.config.url : `/${response.config.url || ''}`}`,
      });
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const config = error.config;
    console.error('❌ [WEB_API][ERR]', {
      status,
      method: config?.method?.toUpperCase(),
      url: `${(config?.baseURL || '').replace(/\/$/, '')}${(config?.url || '').startsWith('/') ? config.url : `/${config?.url || ''}`}`,
      detail: error.response?.data?.detail || error.message,
    });

    if (status === 401) {
      const hadAuth = Boolean(
        config?.headers?.Authorization ||
          config?.headers?.authorization ||
          api.defaults.headers.common?.Authorization
      );
      clearPersistedAuth();
      delete api.defaults.headers.common.Authorization;

      // Never kick guests off public browse; only redirect when a protected call fails auth.
      if (hadAuth && !isPublicSalonRead(config)) {
        const path = window.location.pathname;
        const isAuthPage =
          path.startsWith('/login') ||
          path.startsWith('/signup') ||
          path.startsWith('/forgot-password') ||
          path.startsWith('/reset-password');
        if (!isAuthPage) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
