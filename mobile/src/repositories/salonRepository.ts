import { salonService } from '../services/salonService';
import { Salon, Analytics } from '../types';
import { isAppError } from '../types/error';
import { logger } from '../lib/logger';

export const salonRepository = {
  async getOwnerSalon(): Promise<Salon | null> {
    try {
      return await salonService.getOwnerSalon();
    } catch (error: unknown) {
      if (isAppError(error)) {
        if (error.status === 404 || error.code === 'NOT_FOUND') {
          logger.info('[SalonRepository] No salon for owner (404)');
          return null;
        }
        if (error.kind === 'unauthorized') {
          throw error;
        }
      }
      logger.error('[SalonRepository] getOwnerSalon failed', error);
      throw error;
    }
  },

  async getSalon(salonId: string): Promise<Salon> {
    return await salonService.getSalon(salonId);
  },

  async createSalon(
    data: Omit<Salon, 'id' | 'owner_id' | 'created_at' | 'services' | 'reviews' | 'avg_rating' | 'review_count' | 'distance'>
  ): Promise<Salon> {
    return await salonService.createSalon(data);
  },

  async updateSalon(
    salonId: string,
    updates: Partial<Omit<Salon, 'id' | 'owner_id' | 'created_at'>>
  ): Promise<Salon> {
    return await salonService.updateSalon(salonId, updates);
  },

  async getAnalytics(period: string): Promise<Analytics> {
    return await salonService.getAnalytics(period);
  },

  async getNearbySalons(latitude: number, longitude: number, radius?: number): Promise<Salon[]> {
    return await salonService.getNearbySalons({ latitude, longitude, radius });
  },
};
