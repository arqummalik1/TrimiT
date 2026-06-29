import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentRepository } from '../repositories/paymentRepository';
import {
  UpiInitiateResponse,
  UpiAwaitingVerificationResponse,
  PaymentStatusResponse,
  VerifyPaymentResponse,
  RejectPaymentResponse,
  isPendingVerification,
} from '../types/payment';

/**
 * usePayment — React Query hooks for the UPI-intent + manual-verification flow.
 * ─────────────────────────────────────────────────────────────────────────────
 *  • useInitiateUpi             — customer: create a UPI intent for a booking.
 *  • useMarkAwaitingVerification — customer: mark "returned from UPI app".
 *  • usePaymentStatus           — poll status while verification is pending.
 *  • useVerifyPayment           — owner: verify payment + confirm booking.
 *  • useRejectPayment           — owner: reject an unverifiable payment.
 *
 * Mutations use retry:false — the user re-taps to retry explicitly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Query key factory for a booking's payment status. */
export const paymentStatusKey = (bookingId: string) =>
  ['paymentStatus', bookingId] as const;

/** Customer: create a UPI intent for a booking. */
export function useInitiateUpi() {
  return useMutation<UpiInitiateResponse, unknown, string>({
    mutationFn: (bookingId: string) => paymentRepository.initiateUpi(bookingId),
    retry: false,
  });
}

/** Customer: mark a UPI booking as awaiting salon verification. */
export function useMarkAwaitingVerification() {
  return useMutation<UpiAwaitingVerificationResponse, unknown, string>({
    mutationFn: (bookingId: string) =>
      paymentRepository.markAwaitingVerification(bookingId),
    retry: false,
  });
}

/**
 * Poll a booking's payment status. While the verification is `initiated` or
 * `waiting_verification` the query refetches every 3s so the UI flips to
 * verified/rejected/timeout as soon as the owner acts. Polling stops once the
 * verification reaches a final state.
 *
 * @param bookingId  Booking to poll (query disabled when empty).
 * @param enabled    Gate polling (e.g. only on the waiting screen).
 */
export function usePaymentStatus(bookingId: string | undefined, enabled = true) {
  return useQuery<PaymentStatusResponse>({
    queryKey: paymentStatusKey(bookingId ?? ''),
    queryFn: () => paymentRepository.getPaymentStatus(bookingId as string),
    enabled: enabled && !!bookingId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return isPendingVerification(data.payment_verification_status) ? 3000 : false;
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: 2,
  });
}

/**
 * Owner: verify the UPI payment AND confirm the booking in a single action.
 * Invalidates owner + customer booking lists so the confirmed state shows
 * everywhere immediately.
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation<VerifyPaymentResponse, unknown, { bookingId: string; notes?: string }>({
    mutationFn: ({ bookingId, notes }) =>
      paymentRepository.verifyPayment(bookingId, notes),
    retry: false,
    onSuccess: (_data, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: paymentStatusKey(bookingId) });
    },
  });
}

/** Owner: reject an unverifiable UPI payment. Invalidates booking lists. */
export function useRejectPayment() {
  const queryClient = useQueryClient();
  return useMutation<RejectPaymentResponse, unknown, { bookingId: string; notes?: string }>({
    mutationFn: ({ bookingId, notes }) =>
      paymentRepository.rejectPayment(bookingId, notes),
    retry: false,
    onSuccess: (_data, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: paymentStatusKey(bookingId) });
    },
  });
}
