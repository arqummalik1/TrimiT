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
    // Verbose, structured logging for the onboarding "create salon/parlour" flow.
    // This is the single most failure-prone step in owner onboarding, so we trace
    // the request/response/error explicitly (visible in the Expo/Metro terminal).
    const payload = (salonData ?? {}) as Record<string, unknown>;
    const images = Array.isArray(payload.images) ? (payload.images as unknown[]) : [];
    console.log('🏪 [SalonCreate][service] POST /salons/ →', {
      name: payload.name,
      city: payload.city,
      gender_serve: payload.gender_serve,
      hasPhone: !!payload.phone,
      latitude: payload.latitude,
      longitude: payload.longitude,
      imageCount: images.length,
      firstImage: typeof images[0] === 'string' ? images[0] : null,
      payloadKeys: Object.keys(payload),
    });
    try {
      const response = await apiClient.post('/salons/', salonData);
      console.log('✅ [SalonCreate][service] salon created', {
        status: response.status,
        salonId: (response.data as { id?: string })?.id,
      });
      return normalizeSalon(response.data as Salon);
    } catch (error) {
      const appErr = error as {
        kind?: string;
        code?: string;
        status?: number;
        message?: string;
        requestId?: string;
        details?: unknown;
      };
      console.error('❌ [SalonCreate][service] POST /salons/ failed', {
        kind: appErr?.kind,
        code: appErr?.code,
        status: appErr?.status,
        message: appErr?.message,
        requestId: appErr?.requestId,
        details: appErr?.details,
      });
      throw error;
    }
  },

  updateSalon: async (salonId: string, updates: unknown): Promise<Salon> => {
    await apiClient.patch(`/salons/${salonId}`, updates);
    const response = await apiClient.get(`/salons/${salonId}`);
    return normalizeSalon(response.data as Salon);
  },

  /** Owner kill-switch: toggle accepting new bookings, with optional timed reopen. */
  updateAvailability: async (
    salonId: string,
    payload: { accepting_bookings: boolean; closed_until?: string | null; reason?: string | null }
  ): Promise<Salon> => {
    const response = await apiClient.patch(`/salons/${salonId}/availability`, payload);
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

  getBankDetails: async () => {
    const response = await apiClient.get('/owner/bank-details');
    return response.data;
  },

  updateBankDetails: async (payload: { bank_account_number?: string; bank_ifsc?: string; bank_account_holder_name?: string }) => {
    const response = await apiClient.patch('/owner/bank-details', payload);
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
      category_id?: string | null;
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
