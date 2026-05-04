/**
 * api.ts — default HTTP client for screens that still import from `lib/api`.
 * Base URL is always `…/api/v1`; paths here are relative (e.g. `/staff/...`).
 * Prefer `services/*` for new code.
 */

import apiClient, { setAuthToken as newSetAuthToken } from '../services/apiClient';

export const axios = require('axios');
export const setAuthToken = newSetAuthToken;
export default apiClient;

export async function getSalonStaff(salonId: string, includeInactive: boolean = false): Promise<unknown[]> {
  const response = await apiClient.get(`/staff/salon/${salonId}`, {
    params: { include_inactive: includeInactive },
  });
  return response.data;
}

export async function getStaff(staffId: string): Promise<unknown> {
  const response = await apiClient.get(`/staff/${staffId}`);
  return response.data;
}

export async function createStaff(staffData: unknown): Promise<unknown> {
  const response = await apiClient.post('/staff', staffData);
  return response.data;
}

export async function updateStaff(staffId: string, updates: unknown): Promise<unknown> {
  const response = await apiClient.patch(`/staff/${staffId}`, updates);
  return response.data;
}

export async function deleteStaff(staffId: string): Promise<void> {
  await apiClient.delete(`/staff/${staffId}`);
}

export async function assignServiceToStaff(assignment: unknown): Promise<unknown> {
  const response = await apiClient.post('/staff/services/assign', assignment);
  return response.data;
}

export async function bulkAssignServices(assignment: unknown): Promise<unknown> {
  const response = await apiClient.post('/staff/services/assign-bulk', assignment);
  return response.data;
}

export async function removeServiceFromStaff(staffServiceId: string): Promise<void> {
  await apiClient.delete(`/staff/services/${staffServiceId}`);
}

export async function getAvailableStaff(params: {
  salon_id: string;
  service_id: string;
  booking_date: string;
  time_slot: string;
}): Promise<unknown> {
  const response = await apiClient.get(`/staff/available/${params.salon_id}/${params.service_id}`, {
    params: {
      booking_date: params.booking_date,
      time_slot: params.time_slot,
    },
  });
  return response.data;
}

export async function checkStaffAvailability(check: unknown): Promise<unknown> {
  const response = await apiClient.post('/staff/check-availability', check);
  return response.data;
}

export async function getStaffStats(staffId: string): Promise<unknown> {
  const response = await apiClient.get(`/staff/${staffId}/stats`);
  return response.data;
}

export async function getSalonStaffPerformance(salonId: string): Promise<unknown[]> {
  const response = await apiClient.get(`/staff/salon/${salonId}/performance`);
  return response.data;
}
