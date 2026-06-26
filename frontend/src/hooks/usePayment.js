import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentRepository } from '../repositories/paymentRepository';

/**
 * usePayment — React Query hooks for the PayU online-payment path (web).
 *  • useCreatePayment  — mutation: create a PayU order for a booking.
 *  • usePaymentStatus  — query: poll a booking's payment/settlement status
 *                        while pending (stops once final/unknown→resolved).
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 */

export const paymentStatusKey = (bookingId) => ['paymentStatus', bookingId];

/** Create a PayU order for a booking. Returns the signed PayU form params. */
export function useCreatePayment() {
  return useMutation({
    mutationFn: ({ bookingId, idempotencyKey }) =>
      paymentRepository.createOrder(bookingId, idempotencyKey),
    retry: false,
  });
}

/**
 * Poll a booking's payment status. Refetches every 3s while the payment is
 * still `pending`; stops once the status is final. Disabled when no bookingId.
 */
export function usePaymentStatus(bookingId, enabled = true) {
  return useQuery({
    queryKey: paymentStatusKey(bookingId || ''),
    queryFn: () => paymentRepository.getPaymentStatus(bookingId),
    enabled: enabled && !!bookingId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (data.status === 'unknown') return 3000;
      return data.payment_status === 'pending' ? 3000 : false;
    },
    staleTime: 0,
    retry: 2,
  });
}
