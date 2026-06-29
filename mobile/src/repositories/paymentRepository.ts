import { paymentService } from '../services/paymentService';
import {
  UpiInitiateResponse,
  UpiAwaitingVerificationResponse,
  PaymentStatusResponse,
  VerifyPaymentResponse,
  RejectPaymentResponse,
} from '../types/payment';
import { isAppError } from '../types/error';
import { logger } from '../lib/logger';

/**
 * paymentRepository — the only layer views/hooks touch for UPI payments.
 * Keeps `apiClient`/axios out of the screens (no direct `api.*` in views) and
 * gives a single place to log/normalise failures. Errors are re-thrown as the
 * already-normalised AppError from the apiClient interceptor.
 */
export const paymentRepository = {
  async initiateUpi(bookingId: string): Promise<UpiInitiateResponse> {
    try {
      return await paymentService.initiateUpi(bookingId);
    } catch (error: unknown) {
      logger.error('[paymentRepository] initiateUpi failed', error, {
        bookingId,
        code: isAppError(error) ? error.code : undefined,
      });
      throw error;
    }
  },

  async markAwaitingVerification(
    bookingId: string
  ): Promise<UpiAwaitingVerificationResponse> {
    try {
      return await paymentService.markAwaitingVerification(bookingId);
    } catch (error: unknown) {
      logger.error('[paymentRepository] markAwaitingVerification failed', error, {
        bookingId,
        code: isAppError(error) ? error.code : undefined,
      });
      throw error;
    }
  },

  async getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
    try {
      return await paymentService.getPaymentStatus(bookingId);
    } catch (error: unknown) {
      logger.error('[paymentRepository] getPaymentStatus failed', error, {
        bookingId,
        code: isAppError(error) ? error.code : undefined,
      });
      throw error;
    }
  },

  async verifyPayment(
    bookingId: string,
    notes?: string
  ): Promise<VerifyPaymentResponse> {
    try {
      return await paymentService.verifyPayment(bookingId, notes);
    } catch (error: unknown) {
      logger.error('[paymentRepository] verifyPayment failed', error, {
        bookingId,
        code: isAppError(error) ? error.code : undefined,
      });
      throw error;
    }
  },

  async rejectPayment(
    bookingId: string,
    notes?: string
  ): Promise<RejectPaymentResponse> {
    try {
      return await paymentService.rejectPayment(bookingId, notes);
    } catch (error: unknown) {
      logger.error('[paymentRepository] rejectPayment failed', error, {
        bookingId,
        code: isAppError(error) ? error.code : undefined,
      });
      throw error;
    }
  },
};

export default paymentRepository;
