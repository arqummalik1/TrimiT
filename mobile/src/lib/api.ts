import axios from 'axios';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

// Backend API URL — detection logic
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
let API_BASE_URL = ENV_API_URL || '';

if (__DEV__) {
  // Smart Discovery: Auto-detect host IP from Expo Metro Bundler
  // This works for physical devices on the same Wi-Fi
  const hostUri = Constants.expoConfig?.hostUri; 
  const hostIP = hostUri?.split(':')[0];

  if (hostIP && !hostIP.includes('127.0.0.1')) {
    API_BASE_URL = `http://${hostIP}:8001`;
    console.log('[API] Smart Discovery: Using host IP', hostIP);
  } else if (Platform.OS === 'android') {
    // Fallback for Android Emulator
    API_BASE_URL = 'http://10.0.2.2:8001';
  } else {
    // Fallback for iOS Simulator or local dev
    API_BASE_URL = 'http://localhost:8001';
  }
}

if (!API_BASE_URL && !__DEV__) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Set it in your environment / EAS secrets before building.'
  );
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
        showToast('Cannot reach server. Verify your EXPO_PUBLIC_API_URL in .env and ensure your phone is on the same network.', 'error');
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
