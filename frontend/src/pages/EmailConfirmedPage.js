import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, DeviceMobile } from '@phosphor-icons/react';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import { completeAuthEmailCallback } from '../lib/completeAuthCallback';

/**
 * Landing page after the user taps the signup confirmation link in email.
 * Supabase redirects here (see PUBLIC_SITE_URL + backend redirect_to).
 */
const EmailConfirmedPage = () => {
  const [status, setStatus] = useState('loading'); // loading | success | error | idle
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await completeAuthEmailCallback();
      if (cancelled) return;

      window.history.replaceState(null, '', '/auth/email-confirmed');

      if (result.success) {
        setStatus('success');
        return;
      }

      if (result.idle) {
        setStatus('idle');
        return;
      }

      setStatus('error');
      setDetail(
        result.error ||
          'This confirmation link is invalid or has expired. Open the TrimiT app and tap Resend confirmation email.'
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-stone-200 text-center"
      >
        <AuthBrandMark />

        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-2 border-orange-800/30 border-t-orange-800 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">
              Confirming your email…
            </h1>
            <p className="text-stone-600 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={36} weight="fill" className="text-green-600" />
            </motion.div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-stone-900 mb-3">
              Email verified
            </h1>
            {detail ? (
              <p className="text-stone-600 mb-4">{detail}</p>
            ) : null}
            <p className="text-stone-600 leading-relaxed mb-6">
              Your TrimiT account is active. Open the{' '}
              <strong className="text-stone-800">TrimiT mobile app</strong> on your phone and sign
              in with the <strong className="text-stone-800">same email</strong> and{' '}
              <strong className="text-stone-800">password</strong> you used when you signed up.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl text-left mb-6"
            >
              <DeviceMobile size={28} className="text-orange-800 shrink-0 mt-0.5" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-stone-700 leading-relaxed"
              >
                <p className="font-semibold text-stone-900 mb-1">Next step</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open the TrimiT app</li>
                  <li>Tap Sign In</li>
                  <li>Enter your email and password</li>
                </ol>
              </motion.div>
            </motion.div>
            <p className="text-stone-500 text-xs">
              Salon owners can finish setting up their salon after signing in. Customers can book
              appointments right away.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={36} weight="fill" className="text-red-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-stone-900 mb-3">
              Could not verify email
            </h1>
            <p className="text-stone-600 leading-relaxed mb-6">{detail}</p>
            <p className="text-stone-500 text-sm mb-6">
              In the TrimiT app, use &quot;Resend confirmation email&quot; on the sign-up screen, or
              contact support if the problem continues.
            </p>
          </>
        )}

        {status === 'idle' && (
          <>
            <h1 className="font-heading text-2xl font-bold text-stone-900 mb-3">
              Email confirmation
            </h1>
            <p className="text-stone-600 leading-relaxed mb-6">
              If you just confirmed your email from your inbox, open the TrimiT mobile app and sign
              in with your email and password.
            </p>
          </>
        )}

        <motion.div className="mt-8 pt-6 border-t border-stone-100">
          <Link
            to="/"
            className="text-sm text-orange-800 font-semibold hover:underline"
          >
            Back to TrimiT website
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default EmailConfirmedPage;
