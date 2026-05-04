import apiClient, { API_V1_PREFIX } from './apiClient';
import { Staff, StaffCreateInput, StaffUpdateInput, StaffWithServices, AvailableStaffResponse, StaffAvailabilityCheck, StaffStats, StaffPerformance } from '../types/staff';

export const staffService = {
  getSalonStaff: async (salonId: string, includeInactive: boolean = false): Promise<Staff[]> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/staff/salon/${salonId}`, {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  getStaff: async (staffId: string): Promise<StaffWithServices> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/staff/${staffId}`);
    return response.data;
  },

  createStaff: async (staffData: StaffCreateInput): Promise<Staff> => {
    const response = await apiClient.post(`${API_V1_PREFIX}/staff`, staffData);
    return response.data;
  },

  updateStaff: async (staffId: string, updates: StaffUpdateInput): Promise<Staff> => {
    const response = await apiClient.patch(`${API_V1_PREFIX}/staff/${staffId}`, updates);
    return response.data;
  },

  deleteStaff: async (staffId: string): Promise<void> => {
    await apiClient.delete(`${API_V1_PREFIX}/staff/${staffId}`);
  },

  assignServiceToStaff: async (assignment: { staff_id: string; service_id: string; custom_price?: number; custom_duration?: number }): Promise<any> => {
    const response = await apiClient.post(`${API_V1_PREFIX}/staff/services/assign`, assignment);
    return response.data;
  },

  bulkAssignServices: async (assignment: { staff_id: string; service_ids: string[] }): Promise<any> => {
    const response = await apiClient.post(`${API_V1_PREFIX}/staff/services/assign-bulk`, assignment);
    return response.data;
  },

  removeServiceFromStaff: async (staffServiceId: string): Promise<void> => {
    await apiClient.delete(`${API_V1_PREFIX}/staff/services/${staffServiceId}`);
  },

  getAvailableStaff: async (params: { salon_id: string; service_id: string; booking_date: string; time_slot: string }): Promise<AvailableStaffResponse> => {
    const response = await apiClient.get(
      `${API_V1_PREFIX}/staff/available/${params.salon_id}/${params.service_id}`,
      {
        params: {
          booking_date: params.booking_date,
          time_slot: params.time_slot,
        },
      }
    );
    return response.data;
  },

  checkStaffAvailability: async (check: StaffAvailabilityCheck): Promise<{ available: boolean }> => {
    const response = await apiClient.post(`${API_V1_PREFIX}/staff/check-availability`, check);
    return response.data;
  },

  getStaffStats: async (staffId: string): Promise<StaffStats> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/staff/${staffId}/stats`);
    return response.data;
  },

  getSalonStaffPerformance: async (salonId: string): Promise<StaffPerformance[]> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/staff/salon/${salonId}/performance`);
    return response.data;
  },
};
