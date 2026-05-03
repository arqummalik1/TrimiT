/**
 * api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Axios client with structured error interception.
 *
 * Interceptors handle:
 *  - Auth token injection (request)
 *  - 401 auto-logout
 *  - Network/timeout errors → showToast + structured AppError passthrough
 *  - All errors normalized via handleApiError before rejection
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
export { axios };
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { handleApiError } from './errorHandler';

// ─── Base URL Resolution ───────────────────────────────────────────────────────

const PRODUCTION_API_URL = 'https://trimit-az5h.onrender.com/api/v1';
const LOCAL_PORT = '8000';

/**
 * Programmatically determines the best API URL.
 * Priority: 1. Explicit env var → 2. Auto-detected host IP → 3. Production fallback
 */
const getBaseURL = (): string => {
  if (!__DEV__) return PRODUCTION_API_URL;

  const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
  if (ENV_URL && ENV_URL.startsWith('https://')) {
    console.log('[API] Using production URL from .env:', ENV_URL);
    return ENV_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const hostIP = hostUri?.split(':')[0];

  if (hostIP && !hostIP.includes('127.0.0.1')) {
    const detected = `http://${hostIP}:${LOCAL_PORT}/api/v1`;
    console.log('[API] Auto-detected host:', detected);
    return detected;
  }

  if (Platform.OS === 'android') return `http://10.0.2.2:${LOCAL_PORT}/api/v1`;
  return PRODUCTION_API_URL;
};

// ─── Module Augmentation ─────────────────────────────────────────────────────
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _retryCount?: number;
  }
}

const API_BASE_URL = getBaseURL();
console.log(`[API] Client initialized → ${API_BASE_URL}`);

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000, // 15 seconds
  headers: { 'Content-Type': 'application/json' },
});

import { generateRequestSignature } from './security';

// ─── Request Interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use(
  async (config) => {
    // Only sign mutating requests in production or if configured
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = await generateRequestSignature(
          config.method || 'GET',
          config.url || '',
          config.data,
          timestamp
        );
        
        if (signature) {
          config.headers['X-Trimit-Timestamp'] = timestamp;
          config.headers['X-Trimit-Signature'] = signature;
        }
      } catch (err) {
        console.warn('[Security] Failed to sign request:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor State ───────────────────────────────────────────────

interface PendingRequest {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: PendingRequest[] = [];

/**
 * Process the queue of requests that failed with 401
 */
const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Response Interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const appError = handleApiError(error);

    // 401 → Token Refresh Flow
    if (appError.kind === 'unauthorized' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { supabase } = require('./supabase');
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !data.session) {
          throw new Error('Refresh failed');
        }

        const newToken = data.session.access_token;
        const { useAuthStore } = require('../store/authStore');
        
        // Update local state and client headers
        useAuthStore.getState().setUser(data.session.user, newToken);
        setAuthToken(newToken);
        processQueue(null, newToken);
        
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        const { useAuthStore } = require('../store/authStore');
        useAuthStore.getState().logout();
        return Promise.reject(appError);
      } finally {
        isRefreshing = false;
      }
    }

    // Network / timeout / server errors → show toast immediately
    // 401/403 (Security) are handled silently or with specialized flow
    if (appError.kind !== 'unauthorized' && appError.kind !== 'unknown') {
      try {
        const { showToast } = require('../store/toastStore');
        showToast(appError.message, 'error');
      } catch {
        // Toast store may not be ready
      }
    }

    // RETRY LOGIC: Retry idempotent GET requests on network failures
    if (appError.kind === 'network' && originalRequest.method?.toUpperCase() === 'GET') {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      if (originalRequest._retryCount <= 3) {
        const delay = Math.pow(2, originalRequest._retryCount) * 1000;
        console.log(`[API] Retrying GET ${originalRequest.url} (${originalRequest._retryCount}/3) in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    return Promise.reject(appError);
  }
);

// ─── Auth Token Helper ────────────────────────────────────────────────────────

export const setAuthToken = (token: string | null): void => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;

// =====================================================
// STAFF MANAGEMENT API
// =====================================================

/**
 * Get all staff members for a salon
 */
export async function getSalonStaff(
  salonId: string,
  includeInactive: boolean = false
): Promise<any[]> {
  const response = await api.get(`/api/v1/staff/salon/${salonId}`, {
    params: { include_inactive: includeInactive },
  });
  return response.data;
}

/**
 * Get single staff member with services
 */
export async function getStaff(staffId: string): Promise<any> {
  const response = await api.get(`/api/v1/staff/${staffId}`);
  return response.data;
}

/**
 * Create new staff member (Owner only)
 */
export async function createStaff(staffData: {
  salon_id: string;
  name: string;
  bio?: string;
  phone?: string;
  email?: string;
  working_hours?: any;
  days_off?: string[];
  is_active?: boolean;
}): Promise<any> {
  const response = await api.post('/api/v1/staff', staffData);
  return response.data;
}

/**
 * Update staff member (Owner only)
 */
export async function updateStaff(
  staffId: string,
  updates: {
    name?: string;
    bio?: string;
    phone?: string;
    email?: string;
    working_hours?: any;
    days_off?: string[];
    is_active?: boolean;
  }
): Promise<any> {
  const response = await api.patch(`/api/v1/staff/${staffId}`, updates);
  return response.data;
}

/**
 * Delete (deactivate) staff member (Owner only)
 */
export async function deleteStaff(staffId: string): Promise<void> {
  await api.delete(`/api/v1/staff/${staffId}`);
}

/**
 * Assign a service to a staff member
 */
export async function assignServiceToStaff(assignment: {
  staff_id: string;
  service_id: string;
  custom_price?: number;
  custom_duration?: number;
}): Promise<any> {
  const response = await api.post('/api/v1/staff/services/assign', assignment);
  return response.data;
}

/**
 * Assign multiple services to a staff member at once
 */
export async function bulkAssignServices(assignment: {
  staff_id: string;
  service_ids: string[];
}): Promise<any> {
  const response = await api.post('/api/v1/staff/services/assign-bulk', assignment);
  return response.data;
}

/**
 * Remove a service assignment from a staff member
 */
export async function removeServiceFromStaff(staffServiceId: string): Promise<void> {
  await api.delete(`/api/v1/staff/services/${staffServiceId}`);
}

/**
 * Get available staff for a specific service/date/time
 */
export async function getAvailableStaff(params: {
  salon_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
}): Promise<{
  salon_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
  available_staff: any[];
  any_available: boolean;
}> {
  const response = await api.get(
    `/api/v1/staff/available/${params.salon_id}/${params.service_id}`,
    {
      params: {
        booking_date: params.booking_date,
        time_slot: params.time_slot,
      },
    }
  );
  return response.data;
}

/**
 * Check if a specific staff member is available
 */
export async function checkStaffAvailability(check: {
  staff_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
  duration?: number;
}): Promise<{
  staff_id: string;
  is_available: boolean;
  booking_date: string;
  time_slot: string;
}> {
  const response = await api.post('/api/v1/staff/check-availability', check);
  return response.data;
}

/**
 * Get staff statistics (Owner only)
 */
export async function getStaffStats(staffId: string): Promise<{
  staff_id: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  most_booked_service?: string;
  busiest_day?: string;
  busiest_time_slot?: string;
}> {
  const response = await api.get(`/api/v1/staff/${staffId}/stats`);
  return response.data;
}

/**
 * Get performance metrics for all staff in a salon (Owner only)
 */
export async function getSalonStaffPerformance(salonId: string): Promise<any[]> {
  const response = await api.get(`/api/v1/staff/salon/${salonId}/performance`);
  return response.data;
}
