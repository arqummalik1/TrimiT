import apiClient from './apiClient';
import {
  UpiInitiateResponse,
  UpiAwaitingVerificationResponse,
  PaymentStatusResponse,
  VerifyPaymentResponse,
  RejectPaymentResponse,
} from '../types/payment';

/**
 * paymentService — UPI-intent + manual-verification HTTP surface.
 * ─────────────────────────────────────────────────────────────────────────────
 * Talks to the backend payment endpoints under /api/v1. TrimiT never collects
 * money: the customer pays the salon's UPI ID directly, and the salon owner
 * verifies the payment to confirm the booking.
 *
 *   initiateUpi               → POST /payments/upi/initiate
 *   markAwaitingVerification  → POST /payments/upi/awaiting-verification
 *   getPaymentStatus          → GET  /payments/{booking_id}/status
 *   verifyPayment   (owner)   → POST /payments/{booking_id}/verify
 *   rejectPayment   (owner)   → POST /payments/{booking_id}/reject
 *
 * No `any`. All requests go through the shared apiClient (auth + error
 * normalisation handled there).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const paymentService = {
  /** Create a UPI intent for a booking (customer). Returns the `upi://pay` deep link. */
  async initiateUpi(bookingId: string): Promise<UpiInitiateResponse> {
    const response = await apiClient.post('/payments/upi/initiate', {
      booking_id: bookingId,
    });
    return response.data as UpiInitiateResponse;
  },

  /** Mark a UPI booking as awaiting salon verification (call on return from UPI app). */
  async markAwaitingVerification(
    bookingId: string
  ): Promise<UpiAwaitingVerificationResponse> {
    const response = await apiClient.post('/payments/upi/awaiting-verification', {
      booking_id: bookingId,
    });
    return response.data as UpiAwaitingVerificationResponse;
  },

  /** Fetch the current payment + verification + booking status for a booking. */
  async getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
    const response = await apiClient.get(`/payments/${bookingId}/status`);
    return response.data as PaymentStatusResponse;
  },

  /**
   * Owner action: verify the UPI payment AND confirm the booking in one tap.
   * The optional `notes` are forwarded for the owner's reference.
   */
  async verifyPayment(
    bookingId: string,
    notes?: string
  ): Promise<VerifyPaymentResponse> {
    const response = await apiClient.post(
      `/payments/${bookingId}/verify`,
      notes ? { notes } : {}
    );
    return response.data as VerifyPaymentResponse;
  },

  /** Owner action: reject the UPI payment (could not verify). */
  async rejectPayment(
    bookingId: string,
    notes?: string
  ): Promise<RejectPaymentResponse> {
    const response = await apiClient.post(
      `/payments/${bookingId}/reject`,
      notes ? { notes } : {}
    );
    return response.data as RejectPaymentResponse;
  },
};

export default paymentService;
