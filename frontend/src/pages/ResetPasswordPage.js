import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeSlash, Scissors, CheckCircle, XCircle } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { extractRecoveryToken } from '../lib/recoveryToken';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [recoveryToken, setRecoveryToken] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isValidToken, setIsValidToken] = useState(false);

  const { resetPassword, validateResetToken } = useAuthStore();

  useEffect(() => {
    const token = extractRecoveryToken();
    if (!token) {
      setIsValidating(false);
      setIsValidToken(false);
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    setRecoveryToken(token);

    const validate = async () => {
      try {
        const result = await validateResetToken(token);
        setIsValidToken(Boolean(result.valid));
        if (!result.valid) {
          setError(result.error || 'This reset link has expired or is invalid. Please request a new one.');
        }
      } catch {
        setIsValidToken(false);
        setError('Unable to validate reset link. Please request a new password reset.');
      } finally {
        setIsValidating(false);
      }
    };

    void validate();
  }, [validateResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!recoveryToken) {
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(recoveryToken, password);
      if (result.success) {
        setIsSuccess(true);
        window.history.replaceState(null, '', '/reset-password');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md"
            >
              <div className="w-16 h-16 bg-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Scissors size={32} weight="bold" className="text-white" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
                {isSuccess ? 'Password Reset!' : 'Create New Password'}
              </h1>
              <p className="text-stone-500">
                {isSuccess
                  ? 'Your password has been successfully reset'
                  : 'Enter your new password below'}
              </p>
            </motion.div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
            {isValidating ? (
              <div className="text-center py-12">
                <motion.div className="w-8 h-8 border-2 border-orange-800/30 border-t-orange-800 rounded-full animate-spin mx-auto" />
                <p className="text-stone-500 mt-4 text-sm">Validating reset link…</p>
              </div>
            ) : !isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {!isValidToken && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3"
                  >
                    <XCircle size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{error}</p>
                      <Link
                        to="/forgot-password"
                        className="text-orange-800 font-medium hover:underline mt-2 inline-block"
                      >
                        Request new reset link
                      </Link>
                    </div>
                  </motion.div>
                )}

                {error && isValidToken && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    New Password
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
                      disabled={!isValidToken}
                      className="w-full pl-12 pr-12 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors disabled:bg-stone-100 disabled:cursor-not-allowed"
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!isValidToken}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 disabled:cursor-not-allowed"
                    >
                      {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <motion.div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={!isValidToken}
                      className="w-full pl-12 pr-12 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors disabled:bg-stone-100 disabled:cursor-not-allowed"
                      placeholder="Confirm your new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={!isValidToken}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 disabled:cursor-not-allowed"
                    >
                      {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </motion.div>

                <button
                  type="submit"
                  disabled={isLoading || !isValidToken}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-stone-600 mb-6">
                  Your password has been reset. You&apos;ll be redirected to sign in shortly.
                </p>
                <Link to="/login" className="text-orange-800 font-medium hover:underline">
                  Go to Sign In now
                </Link>
              </motion.div>
            )}

            {!isSuccess && !isValidating && (
              <div className="mt-6 text-center">
                <p className="text-stone-500 text-sm">
                  Remember your password?{' '}
                  <Link to="/login" className="text-orange-800 font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResetPasswordPage;
