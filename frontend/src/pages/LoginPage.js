import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeSimple, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import { safeInternalPath } from '../lib/utils';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, sendOtp, isLoading, error, clearError } = useAuthStore();
  const redirectAfterLogin = safeInternalPath(searchParams.get('redirect'));
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isOtpLogin, setIsOtpLogin] = useState(true);

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('trimit_remember_email');
    const savedRemember = localStorage.getItem('trimit_remember_me');
    if (savedRemember === 'true' && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&type=magiclink`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    const result = await login(email, password, rememberMe);
    
    if (result.success) {
      // Save or clear remember me preferences
      if (rememberMe) {
        localStorage.setItem('trimit_remember_email', email);
        localStorage.setItem('trimit_remember_me', 'true');
      } else {
        localStorage.removeItem('trimit_remember_email');
        localStorage.removeItem('trimit_remember_me');
      }
      
      if (result.profile?.role === 'owner') {
        navigate(result.hasSalon ? '/owner/dashboard' : '/owner/salon', { replace: true });
      } else if (redirectAfterLogin) {
        navigate(redirectAfterLogin, { replace: true });
      } else {
        navigate('/explore', { replace: true });
      }
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
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Password
                  </label>
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
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-orange-800 border-stone-300 rounded focus:ring-orange-800"
                    />
                    <span className="text-sm text-stone-600">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-orange-800 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isOtpLogin ? 'Send Verification Code' : 'Sign In'
              )}
            </button>
          </form>

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
            <div className="border-t border-stone-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsOtpLogin(!isOtpLogin);
                  clearError();
                }}
                className="text-sm text-orange-800 font-semibold hover:underline cursor-pointer focus:outline-none"
              >
                {isOtpLogin ? 'Sign In with Password' : 'Sign In with OTP'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
