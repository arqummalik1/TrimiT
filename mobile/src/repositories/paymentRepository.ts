import { paymentService } from '../services/paymentService';
import { CreateOrderResponse, PaymentStatusResponse } from '../types/payment';
import { isAppError } from '../types/error';
import { logger } from '../lib/logger';

/**
 * paymentRepository — the only layer views/hooks touch for online payments.
 * Keeps `apiClient`/axios out of the screens (no direct `api.*` in views) and
 * gives a single place to log/normalise failures.
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 */
export const paymentRepository = {
  async createOrder(
    bookingId: string,
    idempotencyKey?: string
  ): Promise<CreateOrderResponse> {
    try {
      return await paymentService.createOrder(bookingId, idempotencyKey);
    } catch (error: unknown) {
      // ONLINE_PAYMENT_DISABLED (flag OFF) is an expected, benign outcome — log
      // it quietly so the screen can fall back to pay-at-salon without noise.
      const code = isAppError(error) ? error.code : undefined;
      if (code === 'ONLINE_PAYMENT_DISABLED') {
        logger.warn('[paymentRepository] online payments disabled (flag OFF)');
      } else {
        logger.error('[paymentRepository] createOrder failed', error);
      }
      throw error;
    }
  },

  async getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
    try {
      return await paymentService.getPaymentStatus(bookingId);
    } catch (error: unknown) {
      logger.error('[paymentRepository] getPaymentStatus failed', error);
      throw error;
    }
  },
};

export default paymentRepository;
