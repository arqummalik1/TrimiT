import apiClient from './apiClient';
import { Salon, Analytics } from '../types';
import { normalizeSalon } from '../lib/salonImage';

export const salonService = {
  getOwnerSalon: async (): Promise<Salon> => {
    const response = await apiClient.get('/owner/salon');
    return normalizeSalon(response.data as Salon);
  },

  getSalon: async (salonId: string): Promise<Salon> => {
    const response = await apiClient.get(`/salons/${salonId}`);
    return normalizeSalon(response.data as Salon);
  },

  createSalon: async (salonData: unknown): Promise<Salon> => {
    const response = await apiClient.post('/salons/', salonData);
    return normalizeSalon(response.data as Salon);
  },

  updateSalon: async (salonId: string, updates: unknown): Promise<Salon> => {
    await apiClient.patch(`/salons/${salonId}`, updates);
    const response = await apiClient.get(`/salons/${salonId}`);
    return normalizeSalon(response.data as Salon);
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

  createService: async (
    salonId: string,
    payload: {
      name: string;
      description?: string;
      price: number;
      duration: number;
      image_url?: string | null;
      is_on_offer?: boolean;
      discount_percentage?: number | null;
    }
  ) => {
    const response = await apiClient.post(`/salons/${salonId}/services`, payload);
    return response.data;
  },

  updateService: async (
    salonId: string,
    serviceId: string,
    payload: Record<string, unknown>
  ) => {
    const response = await apiClient.patch(`/salons/${salonId}/services/${serviceId}`, payload);
    return response.data;
  },

  deleteService: async (salonId: string, serviceId: string) => {
    await apiClient.delete(`/salons/${salonId}/services/${serviceId}`);
  },
};
