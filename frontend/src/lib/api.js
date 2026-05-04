import axios from 'axios';

/**
 * Single API surface: all requests go to …/api/v1 (same contract as mobile).
 * REACT_APP_BACKEND_URL = origin only, e.g. http://localhost:8001 or https://trimit-….onrender.com
 * (no path, or already …/api/v1 — both normalized).
 */
function resolveApiBaseUrl() {
  const raw = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
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

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('trimit-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
