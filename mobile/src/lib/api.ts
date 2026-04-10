import axios from 'axios';

// Backend API URL — reads from environment, falls back to hardcoded for development
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://fce8dc56-ff15-4e9f-a5c8-0a3cac0e5480.preview.emergentagent.com';

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
        showToast('No internet connection. Please check your network.', 'error');
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
