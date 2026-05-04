import { staffService } from '../services/staffService';
import { Staff, StaffCreateInput, StaffUpdateInput, StaffWithServices, AvailableStaffResponse, StaffAvailabilityCheck, StaffStats, StaffPerformance } from '../types/staff';

export const staffRepository = {
  async getSalonStaff(salonId: string, includeInactive: boolean = false): Promise<Staff[]> {
    return await staffService.getSalonStaff(salonId, includeInactive);
  },

  async getStaff(staffId: string): Promise<StaffWithServices> {
    return await staffService.getStaff(staffId);
  },

  async createStaff(staffData: StaffCreateInput): Promise<Staff> {
    return await staffService.createStaff(staffData);
  },

  async updateStaff(staffId: string, updates: StaffUpdateInput): Promise<Staff> {
    return await staffService.updateStaff(staffId, updates);
  },

  async deleteStaff(staffId: string): Promise<void> {
    return await staffService.deleteStaff(staffId);
  },

  async assignService(staffId: string, serviceId: string, customPrice?: number, customDuration?: number): Promise<any> {
    return await staffService.assignServiceToStaff({ staff_id: staffId, service_id: serviceId, custom_price: customPrice, custom_duration: customDuration });
  },

  async bulkAssignServices(staffId: string, serviceIds: string[]): Promise<any> {
    return await staffService.bulkAssignServices({ staff_id: staffId, service_ids: serviceIds });
  },

  async removeService(staffServiceId: string): Promise<void> {
    return await staffService.removeServiceFromStaff(staffServiceId);
  },

  async getAvailableStaff(salonId: string, serviceId: string, date: string, time: string): Promise<AvailableStaffResponse> {
    return await staffService.getAvailableStaff({ salon_id: salonId, service_id: serviceId, booking_date: date, time_slot: time });
  },

  async checkAvailability(check: StaffAvailabilityCheck): Promise<boolean> {
    const result = await staffService.checkStaffAvailability(check);
    return result.available;
  },

  async getStats(staffId: string): Promise<StaffStats> {
    return await staffService.getStaffStats(staffId);
  },

  async getPerformance(salonId: string): Promise<StaffPerformance[]> {
    return await staffService.getSalonStaffPerformance(salonId);
  },
};
