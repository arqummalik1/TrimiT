import axios from 'axios';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://trimit-api.onrender.com';
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

let API_BASE_URL = PRODUCTION_API_URL; // Default to production

if (__DEV__) {
  // Smart Discovery: Auto-detect host IP from Expo Metro Bundler
  const hostUri = Constants.expoConfig?.hostUri; 
  const hostIP = hostUri?.split(':')[0];

  if (hostIP && !hostIP.includes('127.0.0.1')) {
    API_BASE_URL = `http://${hostIP}:8001`;
    console.log('[API] Smart Discovery: Using host IP', hostIP);
  } else if (Platform.OS === 'android') {
    API_BASE_URL = 'http://10.0.2.2:8001';
  } else {
    API_BASE_URL = ENV_API_URL || 'http://localhost:8001';
  }
}


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
