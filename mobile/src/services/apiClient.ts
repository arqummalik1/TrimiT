import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { handleApiError } from '../lib/errorHandler';
import { generateRequestSignature } from '../lib/security';

const PRODUCTION_API_URL = 'https://trimit-az5h.onrender.com';
const LOCAL_PORT = '8000';

const getBaseURL = (): string => {
  if (!__DEV__) return PRODUCTION_API_URL;

  const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
  if (ENV_URL) {
    // Ensure we don't have a trailing slash or /api/v1 here
    return ENV_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const hostIP = hostUri?.split(':')[0];

  if (hostIP && !hostIP.includes('127.0.0.1')) {
    return `http://${hostIP}:${LOCAL_PORT}`;
  }

  if (Platform.OS === 'android') return `http://10.0.2.2:${LOCAL_PORT}`;
  return PRODUCTION_API_URL;
};

const API_BASE_URL = getBaseURL();
export const API_V1_PREFIX = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Auth & Security
apiClient.interceptors.request.use(
  async (config) => {
    // Debug logging for URL issues
    if (__DEV__) {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    }

    // 1. Signature generation for mutating requests
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '');
    if (isMutating && config.url) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        // Extract the path that the backend middleware will see
        // Backend routes are prefixed with /api/v1 in the router definition
        // So the middleware sees the full path including /api/v1
        let path = config.url;
        
        if (!path.startsWith('http')) {
          // Ensure path starts with /
          path = path.startsWith('/') ? path : `/${path}`;
          
          // Log for debugging
          if (__DEV__) {
            console.log(`[API] Generating signature for: ${config.method} ${path}`);
          }
        } else {
          // Extract path from absolute URL
          try {
            path = new URL(path).pathname;
          } catch (e) {
            console.warn('[API] Failed to parse URL for signature:', path);
          }
        }
        
        const signature = await generateRequestSignature(
          config.method || 'POST',
          path,
          config.data,
          timestamp
        );

        if (signature) {
          config.headers['X-Trimit-Timestamp'] = timestamp;
          config.headers['X-Trimit-Signature'] = signature;
          
          if (__DEV__) {
            console.log(`[API] Signature generated: ${signature.substring(0, 16)}...`);
          }
        } else {
          if (__DEV__) {
            console.log('[API] Signature generation skipped (no secret configured)');
          }
        }
      } catch (err) {
        console.warn('[API] Signature failed:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Error Normalization
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalizedError = handleApiError(error);
    
    // Log network errors to console in dev
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
