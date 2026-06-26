import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentRepository } from '../repositories/paymentRepository';
import {
  CreateOrderResponse,
  PaymentStatusResponse,
  isKnownPaymentStatus,
} from '../types/payment';

/**
 * usePayment — React Query hooks for the PayU online-payment path.
 * ─────────────────────────────────────────────────────────────────────────────
 *  • useCreatePayment   — mutation: create a PayU order for a booking.
 *  • usePaymentStatus   — query: poll a booking's payment/settlement status
 *                         while it is still pending (stops once final).
 *
 * Requirements: 4.4, 4.5, 17.4, 17.5
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Query key factory for a booking's payment status. */
export const paymentStatusKey = (bookingId: string) =>
  ['paymentStatus', bookingId] as const;

interface CreatePaymentVariables {
  bookingId: string;
  /** Stable key for one logical "pay" action so retries dedupe (Req 6.6). */
  idempotencyKey?: string;
}

/** Create a PayU order for a booking. Returns the signed PayU form params. */
export function useCreatePayment() {
  return useMutation<CreateOrderResponse, unknown, CreatePaymentVariables>({
    mutationFn: ({ bookingId, idempotencyKey }) =>
      paymentRepository.createOrder(bookingId, idempotencyKey),
    // create-order is idempotent server-side AND a payment mutation, so we do
    // not auto-retry here — the user explicitly re-taps to retry.
    retry: false,
  });
}

/**
 * Poll a booking's payment status. While the payment is still `pending` (and a
 * `bookingId` is set) the query refetches on an interval so the UI flips to
 * success/failure as soon as the PayU callback/webhook lands. Polling stops
 * automatically once the status is final or unknown.
 *
 * @param bookingId  Booking to poll (query disabled when empty).
 * @param enabled    Gate polling on (e.g. only after returning from checkout).
 */
export function usePaymentStatus(bookingId: string | undefined, enabled = true) {
  return useQuery<PaymentStatusResponse>({
    queryKey: paymentStatusKey(bookingId ?? ''),
    queryFn: () => paymentRepository.getPaymentStatus(bookingId as string),
    enabled: enabled && !!bookingId,
    // Poll every 3s while pending; stop once the payment reaches a final state.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (!isKnownPaymentStatus(data)) return 3000; // still "unknown" → keep polling
      return data.payment_status === 'pending' ? 3000 : false;
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: 2,
  });
}
