import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeSimple, ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import { useAuthStore } from '../store/authStore';

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [errorTitle, setErrorTitle] = useState(null);
  const { forgotPassword } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrorTitle(null);
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setSent(true);
      } else {
        setErrorTitle(result.rateLimitTitle || null);
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <AuthBrandMark />
        <div className="text-center mb-8 -mt-4">
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            {sent ? 'Check your email' : 'Reset Password'}
          </h1>
          <p className="text-stone-500">
            {sent
              ? 'We sent a reset link if that email has an account'
              : 'Enter your email and we will send you a password reset link'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" weight="fill" />
              </div>
              <p className="text-stone-800 font-semibold mb-2">
                Reset link sent
              </p>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                If <span className="font-medium text-stone-700">{email.trim().toLowerCase()}</span>{' '}
                is registered, open the email and tap <span className="font-medium">Reset password</span>.
                The link opens a secure page where you can create a new password.
                Check spam if you do not see it in a minute.
              </p>
              <Link
                to="/login"
                className="w-full btn-primary inline-flex items-center justify-center"
              >
                Back to Sign In
              </Link>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-4 text-sm text-stone-500 hover:text-orange-800 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-sm"
                  role="alert"
                >
                  {errorTitle ? (
                    <p className="font-semibold text-amber-900 mb-2">{errorTitle}</p>
                  ) : null}
                  <p className="whitespace-pre-line leading-relaxed">{error}</p>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeSimple
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}

          {!sent && (
            <div className="mt-6 pt-6 border-t border-stone-100">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-stone-500 hover:text-orange-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
