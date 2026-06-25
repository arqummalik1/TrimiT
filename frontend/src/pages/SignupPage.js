import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';

// Email-only OTP signup — identical flow to the mobile app and to LoginPage.
// The user enters only their email, receives a 6-digit OTP, verifies it, and
// (if new) finishes on CompleteProfile where they pick their role. Role is
// decided AFTER OTP. There is no upfront role/name/phone form anymore.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupPage = () => {
  const navigate = useNavigate();
  const { sendOtp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer === 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFieldError(null);
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setFieldError('Please enter a valid email address.');
      return;
    }
    const result = await sendOtp(email.trim());
    if (result.success) {
      useToastStore.getState().success('Verification OTP code sent to your email.');
      setResendTimer(60);
      navigate(
        `/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&type=magiclink`
      );
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
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">Join TrimiT</h1>
          <p className="text-stone-500">Enter your email to receive a 6-digit code</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(fieldError || error) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                data-testid="signup-error"
                role="alert"
              >
                {fieldError || error}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  data-testid="signup-email"
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || resendTimer > 0}
              data-testid="signup-submit"
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : resendTimer > 0 ? (
                `Resend in ${resendTimer}s`
              ) : (
                'Send Verification Code'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-stone-500 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-orange-800 font-semibold hover:underline"
                data-testid="login-link"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
