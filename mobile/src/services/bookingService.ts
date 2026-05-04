import apiClient from './apiClient';
import { Booking } from '../types';

export const bookingService = {
  getBookings: async (params?: Record<string, unknown>): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings/', { params });
    return response.data;
  },

  getBooking: async (bookingId: string): Promise<Booking> => {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data;
  },

  updateBookingStatus: async (bookingId: string, status: string): Promise<Booking> => {
    const response = await apiClient.patch(`/bookings/${bookingId}/status`, { status });
    return response.data;
  },

  createBooking: async (bookingData: unknown): Promise<Booking> => {
    const response = await apiClient.post('/bookings/', bookingData);
    return response.data;
  },

  getSalonBookings: async (salonId: string, params?: Record<string, unknown>): Promise<Booking[]> => {
    const response = await apiClient.get(`/bookings/salon/${salonId}`, { params });
    return response.data;
  },
};
