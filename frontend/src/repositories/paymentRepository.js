import paymentService from '../services/paymentService';

/**
 * paymentRepository — the only layer pages/hooks touch for online payments.
 * Keeps `api`/axios out of the views (no direct api.* in pages).
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 */
export const paymentRepository = {
  createOrder: async (bookingId, idempotencyKey) => {
    return paymentService.createOrder(bookingId, idempotencyKey);
  },
  getPaymentStatus: async (bookingId) => {
    return paymentService.getPaymentStatus(bookingId);
  },
};

export default paymentRepository;
