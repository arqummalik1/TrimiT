import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentRepository } from '../repositories/paymentRepository';

/**
 * usePayment — React Query hooks for the UPI-intent + manual-verification flow.
 *
 *  • useInitiateUpi            — customer: start the UPI flow for a booking.
 *  • useMarkAwaitingVerification — customer: "I've paid", await salon verify.
 *  • usePaymentStatus          — poll a booking's verification status.
 *  • useVerifyPayment          — owner: verify payment + confirm booking (1 op).
 *  • useRejectPayment          — owner: reject the payment.
 *
 * TrimiT never collects money — none of these report "Payment Successful". The
 * booking is confirmed only once the owner verifies.
 */

export const paymentStatusKey = (bookingId) => ['paymentStatus', bookingId];

/** Verification states that are still in-flight (keep polling). */
const PENDING_VERIFICATION = new Set(['initiated', 'waiting_verification']);

/** Customer: start the UPI flow. Returns salon UPI details + intent URI. */
export function useInitiateUpi() {
  return useMutation({
    mutationFn: (bookingId) => paymentRepository.initiateUpi(bookingId),
    retry: false,
  });
}

/** Customer: mark a booking as awaiting the salon's verification. */
export function useMarkAwaitingVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId) => paymentRepository.markAwaitingVerification(bookingId),
    retry: false,
    onSuccess: (_data, bookingId) => {
      qc.invalidateQueries({ queryKey: paymentStatusKey(bookingId) });
    },
  });
}

/**
 * Poll a booking's verification status. Refetches every 3s while the payment is
 * still initiated/waiting_verification; stops once verified/rejected/timeout.
 */
export function usePaymentStatus(bookingId, enabled = true) {
  return useQuery({
    queryKey: paymentStatusKey(bookingId || ''),
    queryFn: () => paymentRepository.getPaymentStatus(bookingId),
    enabled: enabled && !!bookingId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return PENDING_VERIFICATION.has(data.payment_verification_status) ? 3000 : false;
    },
    staleTime: 0,
    retry: 2,
  });
}

/** Owner: verify the UPI payment (also confirms the booking server-side). */
export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, notes }) => paymentRepository.verifyPayment(bookingId, notes),
    retry: false,
    onSuccess: (_data, { bookingId }) => {
      qc.invalidateQueries({ queryKey: paymentStatusKey(bookingId) });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['ownerBookings'] });
      qc.invalidateQueries({ queryKey: ['ownerAnalytics'] });
    },
  });
}

/** Owner: reject the UPI payment. The booking stays pending for a retry. */
export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, notes }) => paymentRepository.rejectPayment(bookingId, notes),
    retry: false,
    onSuccess: (_data, { bookingId }) => {
      qc.invalidateQueries({ queryKey: paymentStatusKey(bookingId) });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['ownerBookings'] });
      qc.invalidateQueries({ queryKey: ['ownerAnalytics'] });
    },
  });
}
