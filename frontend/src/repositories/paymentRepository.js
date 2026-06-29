import paymentService from '../services/paymentService';

/**
 * paymentRepository — the only layer pages/hooks touch for UPI payments.
 * Keeps `api`/axios out of the views (no direct api.* in pages).
 */
export const paymentRepository = {
  initiateUpi: async (bookingId) => {
    return paymentService.initiateUpi(bookingId);
  },
  markAwaitingVerification: async (bookingId) => {
    return paymentService.markAwaitingVerification(bookingId);
  },
  getPaymentStatus: async (bookingId) => {
    return paymentService.getPaymentStatus(bookingId);
  },
  verifyPayment: async (bookingId, notes) => {
    return paymentService.verifyPayment(bookingId, notes);
  },
  rejectPayment: async (bookingId, notes) => {
    return paymentService.rejectPayment(bookingId, notes);
  },
};

export default paymentRepository;
