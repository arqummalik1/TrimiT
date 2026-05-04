import { salonService } from '../services/salonService';
import { Salon, Analytics } from '../types';

export const salonRepository = {
  async getOwnerSalon(): Promise<Salon | null> {
    try {
      return await salonService.getOwnerSalon();
    } catch (error: any) {
      // 404 is expected when no salon exists yet
      if (error.code === 'NOT_FOUND' || error.response?.status === 404) {
        console.log('[SalonRepository] No salon found for owner (expected for new owners)');
        return null;
      }
      console.error('[SalonRepository] Failed to fetch owner salon:', error);
      return null;
    }
  },

  async getSalon(salonId: string): Promise<Salon> {
    return await salonService.getSalon(salonId);
  },

  async createSalon(data: any): Promise<Salon> {
    return await salonService.createSalon(data);
  },

  async updateSalon(salonId: string, updates: any): Promise<Salon> {
    return await salonService.updateSalon(salonId, updates);
  },

  async getAnalytics(period: string): Promise<Analytics> {
    return await salonService.getAnalytics(period);
  },

  async getNearbySalons(latitude: number, longitude: number, radius?: number): Promise<Salon[]> {
    return await salonService.getNearbySalons({ latitude, longitude, radius });
  },
};
