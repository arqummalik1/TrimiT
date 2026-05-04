import apiClient from './apiClient';
import { Booking } from '../types';

export const bookingService = {
  getBookings: async (params?: any): Promise<Booking[]> => {
    const response = await apiClient.get('/api/v1/bookings', { params });
    return response.data;
  },

  getBooking: async (bookingId: string): Promise<Booking> => {
    const response = await apiClient.get(`/api/v1/bookings/${bookingId}`);
    return response.data;
  },

  updateBookingStatus: async (bookingId: string, status: string): Promise<Booking> => {
    const response = await apiClient.patch(`/api/v1/bookings/${bookingId}/status`, { status });
    return response.data;
  },

  createBooking: async (bookingData: any): Promise<Booking> => {
    const response = await apiClient.post('/api/v1/bookings', bookingData);
    return response.data;
  },

  getSalonBookings: async (salonId: string, params?: any): Promise<Booking[]> => {
    const response = await apiClient.get(`/api/v1/bookings/salon/${salonId}`, { params });
    return response.data;
  },
};
