import api from '../lib/api';
import { createIdempotencyKey } from '../lib/idempotency';

/**
 * paymentService — PayU online-payment HTTP surface (Layer B, flag-gated).
 * ─────────────────────────────────────────────────────────────────────────────
 * Additive backend endpoints (same contract as mobile):
 *   POST /payments/create-order  — requires auth + an `Idempotency-Key` header.
 *   GET  /payments/status        — caller-scoped payment + settlement status.
 *
 * While the server flag `PAYU_PAYOUTS_ENABLED` is OFF, create-order returns
 * 403 `ONLINE_PAYMENT_DISABLED`; callers treat that as "online payments
 * unavailable" and keep the unchanged pay-at-salon flow.
 *
 * The `Idempotency-Key` is generated per logical "pay" action and sent
 * explicitly (the interceptor only auto-adds it for `/payments/verify` and
 * `/bookings/`). Re-using the same key on a retry returns the existing order
 * instead of creating a duplicate (Req 6.4, 6.6).
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const paymentService = {
  /**
   * Create (or idempotently re-fetch) a PayU order for a booking. The payable
   * amount is derived server-side from the booking (Req 17.1, 17.2).
   *
   * @param {string} bookingId
   * @param {string} [idempotencyKey] stable key across retries of the same tap.
   */
  createOrder: async (bookingId, idempotencyKey) => {
    const key = idempotencyKey || createIdempotencyKey();
    const response = await api.post(
      '/payments/create-order',
      { booking_id: bookingId },
      { headers: { 'Idempotency-Key': key } }
    );
    return response.data;
  },

  /** Fetch the caller's payment + settlement status for a booking. */
  getPaymentStatus: async (bookingId) => {
    const response = await api.get('/payments/status', {
      params: { booking_id: bookingId },
    });
    return response.data;
  },
};

export default paymentService;
