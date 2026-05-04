import apiClient, { API_V1_PREFIX } from './apiClient';
import { Salon, Analytics } from '../types';

export const salonService = {
  getOwnerSalon: async (): Promise<Salon> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/owner/salon`);
    return response.data;
  },

  getSalon: async (salonId: string): Promise<Salon> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/salons/${salonId}`);
    return response.data;
  },

  createSalon: async (salonData: any): Promise<Salon> => {
    try {
      console.log('[SalonService] Creating salon with FULL data:', salonData);
      
      const response = await apiClient.post(`${API_V1_PREFIX}/salons/`, salonData);
      
      console.log('[SalonService] Salon created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[SalonService] Create salon failed:', {
        message: error.message,
        kind: error.kind,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error,
      });
      throw error;
    }
  },

  updateSalon: async (salonId: string, updates: any): Promise<Salon> => {
    const response = await apiClient.patch(`${API_V1_PREFIX}/salons/${salonId}`, updates);
    return response.data;
  },

  getAnalytics: async (period: string = 'today'): Promise<Analytics> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/owner/analytics`, {
      params: { period },
    });
    return response.data;
  },

  getNearbySalons: async (params: { latitude: number; longitude: number; radius?: number }): Promise<Salon[]> => {
    const response = await apiClient.get(`${API_V1_PREFIX}/salons/`, { params });
    return response.data;
  },
};
