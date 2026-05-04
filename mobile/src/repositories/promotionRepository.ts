import { promotionService } from '../services/promotionService';
import { Promotion } from '../types';

export const promotionRepository = {
  async getOwnerPromotions(): Promise<Promotion[]> {
    return await promotionService.getOwnerPromotions();
  },

  async createPromotion(data: any): Promise<Promotion> {
    return await promotionService.createPromotion(data);
  },

  async updatePromotion(id: string, data: any): Promise<Promotion> {
    return await promotionService.updatePromotion(id, data);
  },

  async deletePromotion(id: string): Promise<void> {
    return await promotionService.deletePromotion(id);
  },
};
