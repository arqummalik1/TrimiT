import { bookingService } from "../services/bookingService";
import apiClient from "../services/apiClient";
import { Booking, SlotsResponse } from "../types";
import type { AvailableStaffResponse } from "../types/staff";

export const bookingRepository = {
  async getRecentBookings(limit: number = 5): Promise<Booking[]> {
    try {
      const bookings = await bookingService.getBookings();
      return bookings
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, limit);
    } catch (error) {
      console.error(
        "[BookingRepository] Failed to fetch recent bookings:",
        error,
      );
      return [];
    }
  },

  async updateBookingStatus(
    bookingId: string,
    status: string,
  ): Promise<Booking | null> {
    try {
      return await bookingService.updateBookingStatus(bookingId, status);
    } catch (error) {
      console.error(
        "[BookingRepository] Failed to update booking status:",
        error,
      );
      throw error;
    }
  },

  async getMyBookings(): Promise<Booking[]> {
    return bookingService.getBookings();
  },

  async cancelBooking(bookingId: string): Promise<Booking | null> {
    return bookingService.updateBookingStatus(bookingId, "cancelled");
  },

  async getSlots(params: Record<string, unknown>): Promise<SlotsResponse> {
    const response = await apiClient.get("/bookings/slots", { params });
    return response.data;
  },

  async reserveSlot(
    payload: {
      salon_id: string;
      service_id: string;
      booking_date: string;
      time_slot: string;
    },
    options?: { timeout?: number },
  ) {
    const response = await apiClient.post(
      "/bookings/reserve",
      payload,
      options,
    );
    return response.data;
  },

  async createBooking(
    payload: unknown,
    options?: { headers?: Record<string, string>; timeout?: number },
  ) {
    const response = await apiClient.post("/bookings/", payload, options);
    return response.data;
  },

  async getAvailableStaff(params: {
    salonId: string;
    serviceId: string;
    bookingDate: string;
    timeSlot: string;
  }): Promise<AvailableStaffResponse> {
    const response = await apiClient.get(
      `/staff/available/${params.salonId}/${params.serviceId}`,
      {
        params: {
          booking_date: params.bookingDate,
          time_slot: params.timeSlot,
        },
      },
    );
    return response.data;
  },

  async getSalonBookings(
    salonId: string,
    params?: {
      status?: string;
      date?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<Booking[]> {
    try {
      return await bookingService.getSalonBookings(salonId, params);
    } catch (error) {
      console.error(
        "[BookingRepository] Failed to fetch salon bookings:",
        error,
      );
      return [];
    }
  },
};
