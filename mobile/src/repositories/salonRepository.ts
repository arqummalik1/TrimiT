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
      const kind = isAppError(error) ? error.kind : undefined;
      if (kind === 'network') {
        logger.warn('[SalonRepository] getOwnerSalon network issue', {
          message: isAppError(error) ? error.message : 'network',
        });
      } else {
        logger.error('[SalonRepository] getOwnerSalon failed', error);
      }
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

  async getBankDetails() {
    return await salonService.getBankDetails();
  },

  async updateBankDetails(payload: { bank_account_number?: string; bank_ifsc?: string; bank_account_holder_name?: string }) {
    return await salonService.updateBankDetails(payload);
  },

  async createService(
    salonId: string,
    payload: Parameters<typeof salonService.createService>[1]
  ) {
    return await salonService.createService(salonId, payload);
  },

  async updateService(
    salonId: string,
    serviceId: string,
    payload: Record<string, unknown>
  ) {
    return await salonService.updateService(salonId, serviceId, payload);
  },

  async deleteService(salonId: string, serviceId: string) {
    return await salonService.deleteService(salonId, serviceId);
  },
};
