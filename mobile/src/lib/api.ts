import axios from 'axios';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://trimit-api.onrender.com';
const LOCAL_PORT = '8001';

/**
 * Senior Architect Logic: 
 * Programmatically determines the best API URL.
 * Priority: 1. Manual Env Var -> 2. Auto-detected Host IP -> 3. Production Fallback
 */
const getBaseURL = () => {
  // 1. If we are NOT in dev mode, always use production
  if (!__DEV__) return PRODUCTION_API_URL;

  // 2. Check for explicit Override in .env
  const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
  if (ENV_URL && ENV_URL.startsWith('https://')) {
    console.log('🚀 [API] Senior Decision: Using Production URL from .env', ENV_URL);
    return ENV_URL;
  }

  // 3. Auto-detect Host IP (Your Laptop)
  const hostUri = Constants.expoConfig?.hostUri; 
  const hostIP = hostUri?.split(':')[0];

  if (hostIP && !hostIP.includes('127.0.0.1')) {
    const detectedUrl = `http://${hostIP}:${LOCAL_PORT}`;
    console.log('💻 [API] Senior Discovery: Using detected laptop host', detectedUrl);
    return detectedUrl;
  }

  // 4. Final fallbacks
  if (Platform.OS === 'android') return `http://10.0.2.2:${LOCAL_PORT}`;
  return PRODUCTION_API_URL;
};


const API_BASE_URL = getBaseURL();
console.log(`[API] Initialized with: ${API_BASE_URL}`);


const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 — auto-logout
    if (error.response?.status === 401) {
      const { useAuthStore } = require('../store/authStore');
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        state.logout();
      }
    }

    // Handle network errors — show toast
    if (!error.response && error.message) {
      const { showToast } = require('../store/toastStore');
      if (error.code === 'ECONNABORTED') {
        showToast('Request timed out. Please try again.', 'error');
      } else if (error.message === 'Network Error') {
        const msg = __DEV__ 
          ? 'Cannot reach local server. Check your .env and Wi-Fi.'
          : 'Server is waking up or unreachable. Please try again in a few seconds.';
        showToast(msg, 'error');
      }
    }

    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;
