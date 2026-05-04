import apiClient from './apiClient';
import { Promotion } from '../types';

export const promotionService = {
  getOwnerPromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get('/promotions/owner');
    return response.data;
  },

  createPromotion: async (data: unknown): Promise<Promotion> => {
    const response = await apiClient.post('/promotions/', data);
    return response.data;
  },

  updatePromotion: async (id: string, data: unknown): Promise<Promotion> => {
    const response = await apiClient.patch(`/promotions/${id}`, data);
    return response.data;
  },

  deletePromotion: async (id: string): Promise<void> => {
    await apiClient.delete(`/promotions/${id}`);
  },
};
