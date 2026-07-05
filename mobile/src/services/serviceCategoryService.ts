import apiClient from './apiClient';
import { ServiceCategory } from '../types';

export const serviceCategoryService = {
  list: async (): Promise<ServiceCategory[]> => {
    const response = await apiClient.get('/owner/categories');
    return response.data;
  },

  getPresets: async (): Promise<{ name: string; sort_order: number }[]> => {
    const response = await apiClient.get('/owner/categories/presets');
    return response.data?.presets ?? [];
  },

  create: async (payload: { name: string; sort_order?: number }): Promise<ServiceCategory> => {
    const response = await apiClient.post('/owner/categories', payload);
    return response.data;
  },

  quickStart: async (): Promise<{ created: ServiceCategory[]; count: number }> => {
    const response = await apiClient.post('/owner/categories/quick-start');
    return response.data;
  },

  update: async (
    id: string,
    payload: { name?: string; sort_order?: number; active?: boolean },
  ): Promise<void> => {
    await apiClient.patch(`/owner/categories/${id}`, payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/owner/categories/${id}`);
  },
};
