import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeSlash, CheckCircle, XCircle } from '@phosphor-icons/react';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import { useAuthStore } from '../store/authStore';
import { extractRecoverySession } from '../lib/recoveryToken';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isValidToken, setIsValidToken] = useState(false);

  const { resetPassword, validateResetToken, hydrateFromSupabaseSession } =
    useAuthStore();

  useEffect(() => {
    const { accessToken, refreshToken: refresh } = extractRecoverySession();
    if (!accessToken) {
      setIsValidating(false);
      setIsValidToken(false);
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    setRecoveryToken(accessToken);
    setRefreshToken(refresh);

    const validate = async () => {
      try {
        const result = await validateResetToken(accessToken);
        setIsValidToken(Boolean(result.valid));
        if (!result.valid) {
          setError(
            result.error ||
              'This reset link has expired or is invalid. Please request a new one.',
          );
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

  const goHomeAfterSuccess = (sessionHydrated) => {
    if (!sessionHydrated) {
      navigate('/', { replace: true });
      return;
    }
    const role = useAuthStore.getState().profile?.role;
    const ownerHasSalon = useAuthStore.getState().hasSalon;
    if (!role) {
      navigate('/complete-profile', { replace: true });
      return;
    }
    if (role === 'owner') {
      navigate(ownerHasSalon ? '/owner/dashboard' : '/owner/salon', { replace: true });
      return;
    }
    navigate('/explore', { replace: true });
  };

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
      if (!result.success) {
        setError(result.error || 'Failed to reset password. Please try again.');
        return;
      }

      setIsSuccess(true);
      window.history.replaceState(null, '', '/reset-password');

      let hydrated = false;
      if (refreshToken) {
        const hydrate = await hydrateFromSupabaseSession({
          access_token: recoveryToken,
          refresh_token: refreshToken,
        });
        hydrated = Boolean(hydrate?.success);
      }

      setTimeout(() => {
        goHomeAfterSuccess(hydrated);
      }, 1200);
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
            {isSuccess ? 'Password updated' : 'Create new password'}
          </h1>
          <p className="text-stone-500">
            {isSuccess
              ? 'Taking you to TrimiT…'
              : 'Choose a new password for your account'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          {isValidating ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-orange-800/30 border-t-orange-800 rounded-full animate-spin mx-auto" />
              <p className="text-stone-500 mt-4 text-sm">Validating reset link…</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-2">
                Password reset successful
              </h3>
              <p className="text-stone-600 mb-6 text-sm leading-relaxed">
                Your password is updated. Redirecting to home…
              </p>
              <button
                type="button"
                onClick={() => goHomeAfterSuccess(Boolean(useAuthStore.getState().isAuthenticated))}
                className="w-full btn-primary"
              >
                Continue to TrimiT
              </button>
            </div>
          ) : (
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
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!isValidToken}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 disabled:cursor-not-allowed"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
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
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={!isValidToken}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 disabled:cursor-not-allowed"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

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
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
