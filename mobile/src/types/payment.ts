/**
 * payment.ts — client types for the UPI-intent + manual-verification model.
 * ─────────────────────────────────────────────────────────────────────────────
 * TrimiT never collects money. There are exactly two payment methods:
 *   • 'salon_cash' — pay the salon in cash after the service (booking flows as today).
 *   • 'upi'        — pay the salon's UPI ID directly from any UPI app. The salon
 *                    owner then VERIFIES the payment; only then is the booking
 *                    confirmed. We never auto-show "Payment Successful".
 *
 * Mirrors the backend contract under /api/v1:
 *   POST /payments/upi/initiate
 *   POST /payments/upi/awaiting-verification
 *   POST /payments/{booking_id}/verify   (owner)
 *   POST /payments/{booking_id}/reject   (owner)
 *   GET  /payments/{booking_id}/status
 *
 * No `any` types.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The two — and only two — payment methods in v1. */
export type PaymentMethod = 'salon_cash' | 'upi';

/**
 * Verification lifecycle of a UPI payment as reported by the backend.
 *  • not_required        — cash booking, nothing to verify.
 *  • initiated           — UPI intent created, customer sent to their UPI app.
 *  • waiting_verification — customer returned; awaiting salon owner verification.
 *  • verified            — owner confirmed payment; booking is confirmed.
 *  • rejected            — owner could not verify the payment.
 *  • timeout             — owner hasn't verified within the allowed window.
 */
export type PaymentVerificationStatus =
  | 'not_required'
  | 'initiated'
  | 'waiting_verification'
  | 'verified'
  | 'rejected'
  | 'timeout';

/** Payment settlement status echoed by the backend (not money TrimiT holds). */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/** Booking lifecycle echoed by the payment endpoints. */
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/**
 * The UPI intent payload returned by `POST /payments/upi/initiate`. `intent_uri`
 * is a ready-to-launch `upi://pay?...` deep link; the rest is shown so the
 * customer can pay manually if no UPI app is installed.
 */
export interface UpiIntent {
  payee_vpa: string;
  payee_name: string;
  /** Rupee amount as a number (display only — server is authoritative). */
  amount: number;
  currency: string;
  transaction_note: string;
  booking_reference: string;
  /** `upi://pay?pa=...&pn=...&am=...&tn=...` deep link. */
  intent_uri: string;
}

/** Successful `POST /payments/upi/initiate` response. */
export interface UpiInitiateResponse {
  booking_id: string;
  booking_reference: string;
  payment_verification_status: PaymentVerificationStatus;
  upi: UpiIntent;
  message: string;
}

/** Successful `POST /payments/upi/awaiting-verification` response. */
export interface UpiAwaitingVerificationResponse {
  booking_id: string;
  payment_verification_status: PaymentVerificationStatus;
  message: string;
}

/** `GET /payments/{booking_id}/status` response. */
export interface PaymentStatusResponse {
  booking_id: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_verification_status: PaymentVerificationStatus;
  booking_status: BookingStatus;
  booking_reference: string;
}

/** Owner action result for `POST /payments/{booking_id}/verify`. */
export interface VerifyPaymentResponse {
  booking_id: string;
  payment_verification_status: PaymentVerificationStatus;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
}

/** Owner action result for `POST /payments/{booking_id}/reject`. */
export interface RejectPaymentResponse {
  booking_id: string;
  payment_verification_status: PaymentVerificationStatus;
  booking_status: BookingStatus;
}

/** Verification states where polling should continue (not yet final). */
export const PENDING_VERIFICATION_STATUSES: ReadonlySet<PaymentVerificationStatus> =
  new Set<PaymentVerificationStatus>(['initiated', 'waiting_verification']);

/** True while the payment verification is still in a non-final, pollable state. */
export function isPendingVerification(
  status: PaymentVerificationStatus | undefined | null
): boolean {
  return !!status && PENDING_VERIFICATION_STATUSES.has(status);
}
