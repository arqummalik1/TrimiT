import api from '../lib/api';
import { createIdempotencyKey } from '../lib/idempotency';

/**
 * paymentService — UPI-intent + manual-verification HTTP surface (web).
 * ─────────────────────────────────────────────────────────────────────────────
 * TrimiT never collects money. For UPI bookings the customer pays the salon's
 * UPI ID directly, then the salon owner verifies the payment. Endpoints (all
 * under /api/v1):
 *
 *   POST /payments/upi/initiate                — start UPI flow for a booking.
 *   POST /payments/upi/awaiting-verification   — mark "customer says they paid".
 *   GET  /payments/{booking_id}/status         — poll verification status.
 *   POST /payments/{booking_id}/verify         — OWNER: verify + confirm booking.
 *   POST /payments/{booking_id}/reject         — OWNER: reject payment.
 *
 * No "Payment Successful" is ever shown on initiate — the booking is confirmed
 * ONLY after the owner verifies (payment_verification_status === 'verified').
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const paymentService = {
  /**
   * Start the UPI flow for a booking. Returns the salon UPI details and a
   * `upi://pay?...` intent URI the customer opens to pay.
   * @param {string} bookingId
   */
  initiateUpi: async (bookingId) => {
    const response = await api.post('/payments/upi/initiate', {
      booking_id: bookingId,
    });
    return response.data;
  },

  /**
   * Mark the booking as awaiting the salon's verification (customer indicated
   * they have paid). Status moves initiated → waiting_verification.
   * @param {string} bookingId
   */
  markAwaitingVerification: async (bookingId) => {
    const response = await api.post('/payments/upi/awaiting-verification', {
      booking_id: bookingId,
    });
    return response.data;
  },

  /** Fetch a booking's payment + verification status (used for polling). */
  getPaymentStatus: async (bookingId) => {
    const response = await api.get(`/payments/${bookingId}/status`);
    return response.data;
  },

  /**
   * OWNER: verify the customer's UPI payment. Single action — also confirms the
   * booking server-side (payment_verification_status:'verified',
   * payment_status:'paid', booking_status:'confirmed').
   * @param {string} bookingId
   * @param {string} [notes] optional owner note
   */
  verifyPayment: async (bookingId, notes) => {
    const response = await api.post(
      `/payments/${bookingId}/verify`,
      notes ? { notes } : {},
      { headers: { 'Idempotency-Key': createIdempotencyKey() } }
    );
    return response.data;
  },

  /**
   * OWNER: reject the customer's UPI payment.
   * @param {string} bookingId
   * @param {string} [notes] optional rejection reason
   */
  rejectPayment: async (bookingId, notes) => {
    const response = await api.post(
      `/payments/${bookingId}/reject`,
      notes ? { notes } : {}
    );
    return response.data;
  },
};

export default paymentService;
