import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Storefront, Users, Wallet } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import {
  sanitizePhoneInput,
  isValidNationalPhone,
  toE164,
  phoneValidationHint,
  phoneDialCode,
} from '../config/phone';

// Web mirror of mobile CompleteProfileScreen.tsx.
// Shown after OTP verification when the user has no public.users row yet.
// Here the user picks their role (customer/owner) + name (+ optional phone),
// and the backend creates the profile. Role is decided AFTER OTP — same as
// the mobile app. Salon owners must also provide a UPI ID (they are paid
// directly via UPI); customers never see the UPI field.

// VPA format: name@bank (mirrors the backend regex).
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const {
    completeProfile,
    logout,
    isAuthenticated,
    profileComplete,
    profile,
    hasSalon,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  // If a user lands here without an authenticated session, send them to login.
  // If their profile is already complete, send them to their home.
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (profileComplete && profile?.role) {
      navigate(
        profile.role === 'owner'
          ? hasSalon
            ? '/owner/dashboard'
            : '/owner/salon'
          : '/explore',
        { replace: true }
      );
    }
  }, [isAuthenticated, profileComplete, profile, hasSalon, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError(null);
    setUpiError(null);
    clearError();

    if (name.trim().length < 2) {
      setFieldError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (phone && !isValidNationalPhone(phone)) {
      setFieldError(phoneValidationHint());
      return;
    }

    const trimmedUpi = upiId.trim();
    if (role === 'owner') {
      if (!trimmedUpi) {
        setUpiError('Please enter your UPI ID so customers can pay you directly.');
        return;
      }
      if (!UPI_REGEX.test(trimmedUpi)) {
        setUpiError('Enter a valid UPI ID in the format name@bank (e.g. glowsalon@okaxis).');
        return;
      }
    }

    if (!acceptedTerms) {
      setFieldError('You must accept the Terms and Privacy Policy to continue.');
      return;
    }

    const result = await completeProfile({
      role,
      name: name.trim(),
      phone: phone ? toE164(phone) : undefined,
      upi_id: role === 'owner' ? trimmedUpi : undefined,
    });

    if (result.success) {
      useToastStore.getState().success("Welcome to TrimiT! You're all set.");
      const nextRole = result.profile?.role || role;
      if (nextRole === 'owner') {
        navigate(result.hasSalon ? '/owner/dashboard' : '/owner/salon', {
          replace: true,
        });
      } else {
        navigate('/explore', { replace: true });
      }
      return;
    }

    // Map backend UPI validation errors to the inline UPI field.
    if (result.errorCode === 'UPI_REQUIRED') {
      setUpiError('Please enter your UPI ID so customers can pay you directly.');
    } else if (result.errorCode === 'INVALID_UPI') {
      setUpiError('Enter a valid UPI ID in the format name@bank (e.g. glowsalon@okaxis).');
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
            Almost there!
          </h1>
          <p className="text-stone-500">Let&apos;s finish setting up your profile</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          {(error || fieldError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
              role="alert"
            >
              {fieldError || error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selection */}
            <div>
              <h2 className="text-sm font-medium text-stone-700 mb-3">I am a...</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  data-testid="complete-role-customer"
                  className={`p-6 border-2 rounded-2xl transition-all group ${
                    role === 'customer'
                      ? 'border-orange-800 bg-orange-50'
                      : 'border-stone-200 hover:border-orange-800 hover:bg-orange-50'
                  }`}
                >
                  <Users
                    size={40}
                    weight="duotone"
                    className={`mx-auto mb-3 transition-colors ${
                      role === 'customer' ? 'text-orange-800' : 'text-stone-400'
                    }`}
                  />
                  <span className="block font-semibold text-stone-900">Customer</span>
                  <span className="text-xs text-stone-500">Book appointments</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  data-testid="complete-role-owner"
                  className={`p-6 border-2 rounded-2xl transition-all group ${
                    role === 'owner'
                      ? 'border-orange-800 bg-orange-50'
                      : 'border-stone-200 hover:border-orange-800 hover:bg-orange-50'
                  }`}
                >
                  <Storefront
                    size={40}
                    weight="duotone"
                    className={`mx-auto mb-3 transition-colors ${
                      role === 'owner' ? 'text-orange-800' : 'text-stone-400'
                    }`}
                  />
                  <span className="block font-semibold text-stone-900">Salon Owner</span>
                  <span className="text-xs text-stone-500">List your business</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="complete-name"
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <span className="absolute left-11 top-1/2 -translate-y-1/2 text-stone-500 text-sm pointer-events-none">
                  {phoneDialCode()}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(sanitizePhoneInput(e.target.value));
                    if (fieldError) setFieldError(null);
                  }}
                  data-testid="complete-phone"
                  className="w-full pl-20 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                  placeholder="98765 43210"
                />
              </div>
            </div>

            {role === 'owner' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  UPI ID <span className="text-orange-800">*</span>
                </label>
                <div className="relative">
                  <Wallet
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => {
                      setUpiId(e.target.value);
                      if (upiError) setUpiError(null);
                    }}
                    data-testid="complete-upi"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors ${
                      upiError ? 'border-red-300' : 'border-stone-200'
                    }`}
                    placeholder="glowsalon@okaxis"
                    required
                  />
                </div>
                {upiError ? (
                  <p className="mt-2 text-sm text-red-600" data-testid="complete-upi-error">
                    {upiError}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-stone-500">
                    Customers pay you directly at this UPI ID. Format: name@bank.
                  </p>
                )}
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 rounded border-stone-300 text-orange-800 focus:ring-orange-800"
                data-testid="complete-terms"
              />
              <span className="text-sm text-stone-600">
                I agree to the{' '}
                <Link to="/terms" className="text-orange-800 font-medium hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-orange-800 font-medium hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !acceptedTerms}
              data-testid="complete-submit"
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Complete Setup'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="w-full text-center text-sm text-stone-500 hover:underline pt-1"
            >
              Sign Out &amp; Cancel
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CompleteProfilePage;
