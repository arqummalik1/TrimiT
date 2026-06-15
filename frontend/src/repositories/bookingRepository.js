import api from '../lib/api';

export const bookingRepository = {
  async getMyBookings() {
    const response = await api.get('/bookings/');
    return response.data;
  },

  async getBookingById(bookingId) {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },

  async cancelBooking(bookingId) {
    const response = await api.patch(`/bookings/${bookingId}/status`, { status: 'cancelled' });
    return response.data;
  },
};
