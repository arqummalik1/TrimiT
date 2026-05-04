import apiClient from './apiClient';
import { Promotion } from '../types';

export const promotionService = {
  getOwnerPromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get('/api/v1/promotions/owner');
    return response.data;
  },

  createPromotion: async (data: any): Promise<Promotion> => {
    const response = await apiClient.post('/api/v1/promotions', data);
    return response.data;
  },

  updatePromotion: async (id: string, data: any): Promise<Promotion> => {
    const response = await apiClient.patch(`/api/v1/promotions/${id}`, data);
    return response.data;
  },

  deletePromotion: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/promotions/${id}`);
  },
};
