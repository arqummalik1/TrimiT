import { promotionService } from "../services/promotionService";
import { Promotion } from "../types";

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

  async validatePromoCode(data: {
    code: string;
    salon_id: string;
    booking_amount: number;
  }): Promise<{
    valid: boolean;
    discount_amount?: number;
    final_amount?: number;
    error?: string;
  }> {
    return await promotionService.validatePromoCode(data);
  },
};
