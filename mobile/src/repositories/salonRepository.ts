import { salonService } from '../services/salonService';
import { Salon, Analytics } from '../types';

export const salonRepository = {
  async getOwnerSalon(): Promise<Salon | null> {
    try {
      return await salonService.getOwnerSalon();
    } catch (error: unknown) {
      // 404 is expected when no salon exists yet
      if (
        (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'NOT_FOUND') ||
        (error instanceof Error && 'response' in error && (error as Record<string, unknown> & { response?: { status?: number } }).response?.status === 404)
      ) {
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

  async createSalon(data: Omit<Salon, 'id' | 'owner_id' | 'created_at' | 'services' | 'reviews' | 'avg_rating' | 'review_count' | 'distance'>): Promise<Salon> {
    return await salonService.createSalon(data);
  },

  async updateSalon(salonId: string, updates: Partial<Omit<Salon, 'id' | 'owner_id' | 'created_at'>>): Promise<Salon> {
    return await salonService.updateSalon(salonId, updates);
  },

  async getAnalytics(period: string): Promise<Analytics> {
    return await salonService.getAnalytics(period);
  },

  async getNearbySalons(latitude: number, longitude: number, radius?: number): Promise<Salon[]> {
    return await salonService.getNearbySalons({ latitude, longitude, radius });
  },
};
