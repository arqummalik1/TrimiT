import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Hourglass,
  Copy,
  ArrowLeft,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  useInitiateUpi,
  useMarkAwaitingVerification,
  usePaymentStatus,
} from '../../hooks/usePayment';
import { useToastStore } from '../../store/toastStore';
import { getApiErrorMessage } from '../../lib/utils';

/**
 * PaymentWaitingPage — UPI payment for a booking (web).
 * ─────────────────────────────────────────────────────────────────────────────
 * TrimiT never collects money. We show the salon's UPI ID + a `upi://pay` link
 * and the booking reference. We NEVER show "Payment Successful" — the booking is
 * confirmed only after the salon owner verifies. We poll the verification status
 * and reflect verified / rejected / timeout states.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const WAITING_COPY =
  'We are waiting for the salon to verify your payment. This usually takes less than five minutes.';

const PaymentWaitingPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToastStore();

  const initiate = useInitiateUpi();
  const markAwaiting = useMarkAwaitingVerification();
  const { data: status } = usePaymentStatus(bookingId, !!bookingId);

  const [upi, setUpi] = useState(null);
  const [reference, setReference] = useState('');

  // Start (or idempotently re-fetch) the UPI intent once on mount.
  useEffect(() => {
    if (!bookingId) return;
    initiate.mutate(bookingId, {
      onSuccess: (data) => {
        setUpi(data.upi || null);
        setReference(data.booking_reference || '');
      },
      onError: (err) => {
        showError(getApiErrorMessage(err, 'Could not start the UPI payment.'), {
          title: 'Payment unavailable',
        });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const verification = status?.payment_verification_status;
  const isVerified = verification === 'verified';
  const isRejected = verification === 'rejected';
  const isTimeout = verification === 'timeout';

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      success('Copied', { duration: 1500 });
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleIHavePaid = () => {
    markAwaiting.mutate(bookingId);
  };

  const handleRetry = () => {
    initiate.mutate(bookingId, {
      onSuccess: (data) => {
        setUpi(data.upi || null);
        setReference(data.booking_reference || '');
      },
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/my-bookings')}
            className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center hover:bg-stone-200"
          >
            <ArrowLeft size={20} className="text-stone-700" />
          </button>
          <h1 className="font-heading text-xl font-bold text-stone-900">Pay with UPI</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm text-center"
        >
          {/* Verified */}
          {isVerified ? (
            <>
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={36} weight="fill" className="text-green-600" />
              </div>
              <h2 className="font-heading text-xl font-bold text-stone-900 mb-2">
                Booking confirmed
              </h2>
              <p className="text-stone-500 text-sm mb-6">
                The salon verified your payment. See it in My Bookings.
              </p>
              <Link to="/my-bookings" className="btn-primary inline-flex">
                View My Bookings
              </Link>
            </>
          ) : isRejected ? (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <XCircle size={36} weight="fill" className="text-red-600" />
              </div>
              <h2 className="font-heading text-xl font-bold text-stone-900 mb-2">
                Payment not verified
              </h2>
              <p className="text-stone-500 text-sm mb-6">
                We could not verify your payment. Please try again or contact the salon.
              </p>
              <button onClick={handleRetry} className="btn-primary inline-flex">
                Try again
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Hourglass size={32} weight="duotone" className="text-orange-700" />
              </div>
              <h2 className="font-heading text-lg font-bold text-stone-900 mb-2">
                {isTimeout ? 'Still waiting for verification' : 'Waiting for salon verification'}
              </h2>
              <p className="text-stone-500 text-sm mb-5">
                {isTimeout
                  ? 'The salon has not verified your payment yet. You may wait, contact the salon, or cancel from My Bookings.'
                  : WAITING_COPY}
              </p>

              {/* UPI details */}
              {initiate.isPending && !upi ? (
                <div className="space-y-2 mb-5" aria-hidden="true">
                  <div className="h-4 bg-stone-100 rounded animate-pulse" />
                  <div className="h-4 bg-stone-100 rounded animate-pulse w-4/5 mx-auto" />
                </div>
              ) : upi ? (
                <div className="bg-stone-50 rounded-xl border border-stone-100 p-4 mb-5 text-left space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-sm">Pay to</span>
                    <button
                      onClick={() => copy(upi.payee_vpa)}
                      className="font-semibold text-stone-900 inline-flex items-center gap-1.5"
                    >
                      {upi.payee_vpa}
                      <Copy size={14} className="text-stone-400" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-sm">Amount</span>
                    <span className="font-semibold text-stone-900">₹{upi.amount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-sm">Reference</span>
                    <button
                      onClick={() => copy(reference)}
                      className="font-semibold text-stone-900 inline-flex items-center gap-1.5"
                    >
                      {reference}
                      <Copy size={14} className="text-stone-400" />
                    </button>
                  </div>

                  <a href={upi.intent_uri} className="btn-primary w-full inline-flex justify-center mt-2">
                    Open UPI app to pay
                  </a>

                  {upi.qr_code ? (
                    <img
                      src={upi.qr_code}
                      alt="Salon UPI QR code"
                      className="mx-auto mt-3 w-40 h-40 object-contain rounded-lg border border-stone-200"
                    />
                  ) : null}

                  <p className="flex items-start gap-1.5 text-xs text-stone-400 mt-2">
                    <WarningCircle size={14} className="shrink-0 mt-0.5" />
                    On a computer, scan the QR or pay this UPI ID from your phone.
                  </p>
                </div>
              ) : null}

              <button
                onClick={handleIHavePaid}
                disabled={markAwaiting.isPending}
                className="w-full btn-primary mb-2 disabled:opacity-50"
              >
                {markAwaiting.isPending ? 'Please wait…' : "I've paid"}
              </button>
              <Link
                to="/my-bookings"
                className="block w-full py-2 text-sm text-stone-500 hover:text-stone-700"
              >
                I'll do this later
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentWaitingPage;
