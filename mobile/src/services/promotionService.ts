import apiClient from "./apiClient";
import { Promotion } from "../types";
import axios from "axios";

export interface CheckoutOffer {
  code: string;
  description?: string;
  discount_amount?: number;
  final_amount: number;
  source: "salon" | "platform";
  expires_at?: string;
  auto_apply?: boolean;
}

export interface CampaignGrant {
  id: string;
  code: string;
  issued_at: string;
  expires_at: string;
  redeemed_at?: string | null;
  description?: string;
  discount_type?: string;
  discount_value?: number;
  min_order_value?: number;
  campaign_name?: string;
}

function mapPromotion(row: Record<string, unknown>): Promotion {
  return {
    ...(row as unknown as Promotion),
    max_uses: (row.usage_limit as number | null) ?? null,
    used_count: (row.used_count as number) ?? 0,
  };
}

export const promotionService = {
  getOwnerPromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get("/promotions/owner");
    return (response.data as Record<string, unknown>[]).map(mapPromotion);
  },

  createPromotion: async (data: {
    code: string;
    description?: string | null;
    discount_type: string;
    discount_value: number;
    max_discount?: number | null;
    min_order_value?: number;
    usage_limit?: number | null;
    expires_at?: string | null;
    active?: boolean;
  }): Promise<Promotion> => {
    const response = await apiClient.post("/promotions/", data);
    const row = Array.isArray(response.data) ? response.data[0] : response.data;
    return mapPromotion(row as Record<string, unknown>);
  },

  updatePromotion: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<Promotion> => {
    const response = await apiClient.patch(`/promotions/${id}`, data);
    return mapPromotion(response.data);
  },

  deletePromotion: async (id: string): Promise<void> => {
    await apiClient.delete(`/promotions/${id}`);
  },

  validatePromoCode: async (data: {
    code: string;
    salon_id: string;
    booking_amount: number;
  }) => {
    const response = await apiClient.post("/promotions/validate", data);
    return response.data;
  },

  getCheckoutOffers: async (data: {
    salon_id: string;
    list_price: number;
    offer_price: number;
  }): Promise<{
    salon_offers: CheckoutOffer[];
    platform_offers: CheckoutOffer[];
    best_price: number;
    discount_source: string;
    auto_apply: CheckoutOffer | null;
  }> => {
    const response = await apiClient.post("/promotions/checkout-offers", data);
    return response.data;
  },

  getMyGrants: async (): Promise<CampaignGrant[]> => {
    try {
      const response = await apiClient.get("/promotions/my-grants");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        // Backend not deployed yet — treat as no grants instead of surfacing errors.
        if (status === 404 || status === 405) {
          return [];
        }
      }
      throw error;
    }
  },

  getSalonActivePromos: async (salonId: string) => {
    const response = await apiClient.get(
      `/promotions/active?salon_id=${salonId}`,
    );
    return response.data;
  },
};
