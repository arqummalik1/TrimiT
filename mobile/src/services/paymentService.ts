import apiClient from './apiClient';
import { createIdempotencyKey } from '../lib/idempotency';
import {
  CreateOrderResponse,
  PaymentStatusResponse,
} from '../types/payment';

/**
 * paymentService — PayU online-payment HTTP surface (Layer B, flag-gated).
 * ─────────────────────────────────────────────────────────────────────────────
 * Talks to the additive backend endpoints:
 *   POST /payments/create-order  — requires auth + an `Idempotency-Key` header.
 *   GET  /payments/status        — caller-scoped payment + settlement status.
 *
 * The `Idempotency-Key` is generated per logical "pay" action and sent
 * explicitly (the global interceptor only auto-adds it for `/payments/verify`
 * and `/bookings/`). Re-using the same key on a retry of the same action lets
 * the backend return the existing order instead of creating a duplicate
 * (Req 6.4, 6.6).
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const paymentService = {
  /**
   * Create (or idempotently re-fetch) a PayU order for a booking. The payable
   * amount is derived server-side from the booking — the client never supplies
   * an amount (Req 17.1, 17.2).
   *
   * @param bookingId       Booking to pay for.
   * @param idempotencyKey  Optional caller-supplied key; a fresh UUID is
   *                        generated when omitted. Pass a stable key across
   *                        retries of the SAME tap to dedupe (Req 6.6).
   */
  async createOrder(
    bookingId: string,
    idempotencyKey?: string
  ): Promise<CreateOrderResponse> {
    const key = idempotencyKey ?? (await createIdempotencyKey());
    const response = await apiClient.post(
      '/payments/create-order',
      { booking_id: bookingId },
      { headers: { 'Idempotency-Key': key } }
    );
    return response.data as CreateOrderResponse;
  },

  /** Fetch the caller's payment + settlement status for a booking (Req 9.1, 12.1). */
  async getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
    const response = await apiClient.get('/payments/status', {
      params: { booking_id: bookingId },
    });
    return response.data as PaymentStatusResponse;
  },
};

export default paymentService;
