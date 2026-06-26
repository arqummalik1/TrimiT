import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Spinner } from '@phosphor-icons/react';
import { usePaymentStatus } from '../../hooks/usePayment';
import { PAYU_PENDING_BOOKING_KEY } from '../../lib/payuCheckout';

/**
 * PaymentCallbackPage — landing page after the PayU hosted checkout returns.
 * ─────────────────────────────────────────────────────────────────────────────
 * PayU redirects the browser to the backend callback (surl/furl); the customer
 * lands here to see the outcome. The server is authoritative (the PayU webhook
 * confirms the booking independently of this redirect — Req 8.7), so this page
 * simply POLLS GET /payments/status until the payment resolves.
 *
 * The booking id is read from `?booking_id=` if present, otherwise from the
 * sessionStorage value we stashed before redirecting to PayU.
 *
 * TODO(PayU): confirm the surl/furl return path. The backend currently points
 * surl/furl at `{PUBLIC_SITE_URL}/payment/callback`; if PayU POSTs there, the
 * host must serve this SPA route (and ideally forward `booking_id`). Polling by
 * the stashed booking id keeps this resilient regardless.
 *
 * Requirements: 4.5, 17.5
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();

  const bookingId = useMemo(() => {
    const fromQuery =
      searchParams.get('booking_id') || searchParams.get('udf1') || '';
    if (fromQuery) return fromQuery;
    try {
      return sessionStorage.getItem(PAYU_PENDING_BOOKING_KEY) || '';
    } catch {
      return '';
    }
  }, [searchParams]);

  const { data, isLoading } = usePaymentStatus(bookingId, !!bookingId);

  const paymentStatus =
    data && data.status !== 'unknown' ? data.payment_status : 'pending';

  // Clear the stashed booking id once the payment reaches a final state.
  useEffect(() => {
    if (paymentStatus === 'paid' || paymentStatus === 'failed') {
      try {
        sessionStorage.removeItem(PAYU_PENDING_BOOKING_KEY);
      } catch {
        /* no-op */
      }
    }
  }, [paymentStatus]);

  const isPending =
    !bookingId ? false : isLoading || paymentStatus === 'pending';
  const isPaid = paymentStatus === 'paid';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm max-w-md w-full text-center"
      >
        {isPending && (
          <>
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Spinner size={32} className="text-orange-700 animate-spin" />
            </div>
            <h1 className="font-heading text-xl font-bold text-stone-900 mb-2">
              Confirming your payment…
            </h1>
            <p className="text-stone-500 text-sm">
              This only takes a moment. Please don’t close this window.
            </p>
            <div className="mt-6 space-y-2" aria-hidden="true">
              <div className="h-4 bg-stone-100 rounded animate-pulse" />
              <div className="h-4 bg-stone-100 rounded animate-pulse w-4/5 mx-auto" />
            </div>
          </>
        )}

        {!isPending && isPaid && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={36} weight="fill" className="text-green-600" />
            </div>
            <h1 className="font-heading text-xl font-bold text-stone-900 mb-2">
              Payment successful
            </h1>
            <p className="text-stone-500 text-sm mb-6">
              Your booking is confirmed. You can view it in My Bookings.
            </p>
            <Link to="/my-bookings" className="btn-primary inline-flex items-center gap-2">
              View My Bookings
            </Link>
          </>
        )}

        {!isPending && !isPaid && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={36} weight="fill" className="text-red-600" />
            </div>
            <h1 className="font-heading text-xl font-bold text-stone-900 mb-2">
              {bookingId ? 'Payment not completed' : 'Nothing to show'}
            </h1>
            <p className="text-stone-500 text-sm mb-6">
              {bookingId
                ? 'Your booking is still reserved. You can pay at the salon, or try paying online again from My Bookings.'
                : 'We couldn’t find a payment to confirm. Head back to your bookings.'}
            </p>
            <Link to="/my-bookings" className="btn-primary inline-flex items-center gap-2">
              Go to My Bookings
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentCallbackPage;
