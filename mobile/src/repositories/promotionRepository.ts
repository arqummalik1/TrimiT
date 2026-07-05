import {
  promotionService,
  CheckoutOffer,
  CampaignGrant,
} from "../services/promotionService";
import { Promotion } from "../types";

export const promotionRepository = {
  async getOwnerPromotions(): Promise<Promotion[]> {
    return promotionService.getOwnerPromotions();
  },

  async createPromotion(data: {
    code: string;
    description?: string | null;
    discount_type: "flat" | "percent";
    discount_value: number;
    max_discount?: number | null;
    min_order_value?: number;
    usage_limit?: number | null;
    expires_at?: string | null;
    active?: boolean;
  }): Promise<Promotion> {
    return promotionService.createPromotion(data);
  },

  async updatePromotion(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Promotion> {
    return promotionService.updatePromotion(id, data);
  },

  async deletePromotion(id: string): Promise<void> {
    return promotionService.deletePromotion(id);
  },

  async validatePromoCode(data: {
    code: string;
    salon_id: string;
    booking_amount: number;
  }) {
    return promotionService.validatePromoCode(data);
  },

  async getCheckoutOffers(data: {
    salon_id: string;
    list_price: number;
    offer_price: number;
  }) {
    return promotionService.getCheckoutOffers(data);
  },

  async getMyGrants(): Promise<CampaignGrant[]> {
    return promotionService.getMyGrants();
  },
};

export type { CheckoutOffer, CampaignGrant };
