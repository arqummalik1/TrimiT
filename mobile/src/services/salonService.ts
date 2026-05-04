import apiClient from './apiClient';
import { Salon, Analytics } from '../types';

export const salonService = {
  getOwnerSalon: async (): Promise<Salon> => {
    const response = await apiClient.get('/owner/salon');
    return response.data;
  },

  getSalon: async (salonId: string): Promise<Salon> => {
    const response = await apiClient.get(`/salons/${salonId}`);
    return response.data;
  },

  createSalon: async (salonData: unknown): Promise<Salon> => {
    const response = await apiClient.post('/salons/', salonData);
    return response.data;
  },

  updateSalon: async (salonId: string, updates: unknown): Promise<Salon> => {
    const response = await apiClient.patch(`/salons/${salonId}`, updates);
    return response.data;
  },

  getAnalytics: async (period: string = 'today'): Promise<Analytics> => {
    const response = await apiClient.get('/owner/analytics', {
      params: { period },
    });
    return response.data;
  },

  getNearbySalons: async (params: { latitude: number; longitude: number; radius?: number }): Promise<Salon[]> => {
    const response = await apiClient.get('/salons/', { params });
    return response.data;
  },
};
