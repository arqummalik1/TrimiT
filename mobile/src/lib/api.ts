/**
 * api.ts (Legacy Wrapper)
 * ─────────────────────────────────────────────────────────────────────────────
 * This file is now a wrapper around the centralized services/apiClient.ts.
 * New code should import directly from services/apiClient or dedicated services.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient, { setAuthToken as newSetAuthToken, API_V1_PREFIX } from '../services/apiClient';

// Re-export for compatibility
export const axios = require('axios');
export const setAuthToken = newSetAuthToken;
export { API_V1_PREFIX };
export default apiClient;

// =====================================================
// LEGACY SERVICE FUNCTIONS
// These should be moved to dedicated service files
// =====================================================

export async function getSalonStaff(salonId: string, includeInactive: boolean = false): Promise<any[]> {
  const response = await apiClient.get(`/api/v1/staff/salon/${salonId}`, {
    params: { include_inactive: includeInactive },
  });
  return response.data;
}

export async function getStaff(staffId: string): Promise<any> {
  const response = await apiClient.get(`/api/v1/staff/${staffId}`);
  return response.data;
}

export async function createStaff(staffData: any): Promise<any> {
  const response = await apiClient.post('/api/v1/staff', staffData);
  return response.data;
}

export async function updateStaff(staffId: string, updates: any): Promise<any> {
  const response = await apiClient.patch(`/api/v1/staff/${staffId}`, updates);
  return response.data;
}

export async function deleteStaff(staffId: string): Promise<void> {
  await apiClient.delete(`/api/v1/staff/${staffId}`);
}

export async function assignServiceToStaff(assignment: any): Promise<any> {
  const response = await apiClient.post('/api/v1/staff/services/assign', assignment);
  return response.data;
}

export async function bulkAssignServices(assignment: any): Promise<any> {
  const response = await apiClient.post('/api/v1/staff/services/assign-bulk', assignment);
  return response.data;
}

export async function removeServiceFromStaff(staffServiceId: string): Promise<void> {
  await apiClient.delete(`/api/v1/staff/services/${staffServiceId}`);
}

export async function getAvailableStaff(params: any): Promise<any> {
  const response = await apiClient.get(
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

export async function checkStaffAvailability(check: any): Promise<any> {
  const response = await apiClient.post('/api/v1/staff/check-availability', check);
  return response.data;
}

export async function getStaffStats(staffId: string): Promise<any> {
  const response = await apiClient.get(`/api/v1/staff/${staffId}/stats`);
  return response.data;
}

export async function getSalonStaffPerformance(salonId: string): Promise<any[]> {
  const response = await apiClient.get(`/api/v1/staff/salon/${salonId}/performance`);
  return response.data;
}
