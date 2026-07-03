import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeSimple, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { safeInternalPath } from '../lib/utils';

// Google login is built but not yet verified end-to-end; hidden for launch.
// Flip to true once tested to re-enable.
const GOOGLE_LOGIN_ENABLED = false;

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, sendOtp, isLoading, error, clearError } = useAuthStore();
  const redirectAfterLogin = safeInternalPath(searchParams.get('redirect'));
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpLogin, setIsOtpLogin] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendTimer === 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSignInWithOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!email) {
      useAuthStore.setState({ error: 'Please enter your email address to sign in with OTP.' });
      return;
    }
    const result = await sendOtp(email.trim());
    if (result.success) {
      useToastStore.getState().success('Verification OTP code sent to your email.');
      setResendTimer(60);
      // P0-3 Security Fix: Pass redirect param through OTP flow so user lands back on booking page
      const redirectParam = redirectAfterLogin ? `&redirect=${encodeURIComponent(redirectAfterLogin)}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&type=magiclink${redirectParam}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!email || !password) {
      useAuthStore.setState({ error: 'Please enter both your email address and password.' });
      return;
    }
    const result = await login(email.trim(), password);
    if (result.success) {
      useToastStore.getState().success('Signed in successfully.');
      navigate(redirectAfterLogin || '/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <AuthBrandMark />
        <div className="text-center mb-8 -mt-4">
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            {isOtpLogin ? 'Sign In with OTP' : 'Welcome back'}
          </h1>
          <p className="text-stone-500">
            {isOtpLogin ? 'Enter your email to receive a 6-digit code' : 'Sign in to continue'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          <form onSubmit={isOtpLogin ? handleSignInWithOtp : handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                data-testid="login-error"
              >
                {error}
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
                  data-testid="login-email"
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {!isOtpLogin && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Password
                  </label>
                  <Link
                    to={`/forgot-password?email=${encodeURIComponent(email.trim())}`}
                    className="text-sm font-medium text-orange-800 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" 
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password"
                    className="w-full pl-12 pr-12 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (isOtpLogin && resendTimer > 0)}
              data-testid="login-submit"
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isOtpLogin 
                  ? (resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Send Verification Code')
                  : 'Sign In'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOtpLogin(!isOtpLogin);
                  clearError();
                }}
                className="text-sm font-semibold text-orange-800 hover:underline"
              >
                {isOtpLogin ? 'Sign in with Email and Password' : 'Sign in with OTP'}
              </button>
            </div>
          </form>

          {/* Divider + Google — hidden until Google login is verified */}
          {GOOGLE_LOGIN_ENABLED && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <GoogleSignInButton />
            </>
          )}

          <div className="mt-6 text-center space-y-3">
            <p className="text-stone-500 text-sm">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-orange-800 font-semibold hover:underline"
                data-testid="signup-link"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
