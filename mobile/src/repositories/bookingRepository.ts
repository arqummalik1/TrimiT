import { bookingService } from '../services/bookingService';
import { Booking } from '../types';

export const bookingRepository = {
  async getRecentBookings(limit: number = 5): Promise<Booking[]> {
    try {
      const bookings = await bookingService.getBookings();
      return bookings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('[BookingRepository] Failed to fetch recent bookings:', error);
      return [];
    }
  },

  async updateBookingStatus(bookingId: string, status: string): Promise<Booking | null> {
    try {
      return await bookingService.updateBookingStatus(bookingId, status);
    } catch (error) {
      console.error('[BookingRepository] Failed to update booking status:', error);
      throw error;
    }
  },

  async getSalonBookings(salonId: string, params?: any): Promise<Booking[]> {
    try {
      return await bookingService.getSalonBookings(salonId, params);
    } catch (error) {
      console.error('[BookingRepository] Failed to fetch salon bookings:', error);
      return [];
    }
  },
};
