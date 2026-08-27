import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import AppleSignInButton from '../components/auth/AppleSignInButton';
import {
  GOOGLE_LOGIN_ENABLED,
  APPLE_LOGIN_ENABLED,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../config/auth';
import { safeInternalPath } from '../lib/utils';
import { intentForProtectedPath, setPendingAuthIntent } from '../lib/pendingAuthIntent';

// Email-only OTP signup — identical flow to the mobile app and to LoginPage.
// The user enters only their email, receives a 6-digit OTP, verifies it, and
// New customers bootstrap automatically; owner and employee roles are entered
// only from their explicit workspace actions. No generic profile form.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectAfterLogin = safeInternalPath(searchParams.get('redirect'));
  const requestedOwner = searchParams.get('role') === 'owner';
  const { sendOtp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const intent = requestedOwner
      ? { kind: 'owner_onboarding' }
      : intentForProtectedPath(redirectAfterLogin);
    if (intent) setPendingAuthIntent(intent);
  }, [redirectAfterLogin, requestedOwner]);

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
      setResendTimer(OTP_RESEND_COOLDOWN_SECONDS);
      navigate(
        `/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&type=magiclink${redirectAfterLogin ? `&redirect=${encodeURIComponent(redirectAfterLogin)}` : ''}`
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
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition-colors"
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

          {(GOOGLE_LOGIN_ENABLED || APPLE_LOGIN_ENABLED) && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <div className="space-y-3">
                {GOOGLE_LOGIN_ENABLED && (
                  <GoogleSignInButton label="Sign up with Google" />
                )}
                {APPLE_LOGIN_ENABLED && (
                  <AppleSignInButton label="Sign up with Apple" />
                )}
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-stone-500 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-brand-800 font-semibold hover:underline"
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
