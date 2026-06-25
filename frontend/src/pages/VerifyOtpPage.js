import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import { useToastStore } from '../store/toastStore';
import SuccessOverlay from '../components/ui/SuccessOverlay';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';
  const type = queryParams.get('type') || 'magiclink'; // signup, recovery, magiclink

  const { verifyOtp, sendOtp, isLoading, error: authError, clearError } = useAuthStore();

  const [code, setCode] = useState(Array(6).fill(''));
  // Server enforces a 60s per-email OTP throttle (backend OTP_EMAIL_THROTTLE_SECONDS
  // + Supabase's own 60s email rate limit). Keep the client cooldown aligned so the
  // "Resend Code" button doesn't enable early and hand the user a guaranteed 429.
  const RESEND_COOLDOWN_SECONDS = 60;
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [localError, setLocalError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [targetRedirect, setTargetRedirect] = useState('/');

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Resend Countdown Timer — stable interval, no re-render cascade.
  // Matches mobile VerifyOtpScreen.tsx fix: interval is created once and
  // self-clears when the timer reaches 0. Only re-created when resendTimer
  // is explicitly reset to a positive value (e.g. after resend).
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (resendTimer <= 0) return;

    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendTimer > 0 ? 'running' : 'stopped']);

  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate(targetRedirect);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').trim().slice(0, 6);
    if (pasteData.length === 6) {
      const newCode = pasteData.split('');
      setCode(newCode);
      inputRefs[5].current.focus();
    }
  };

  const handleTextChange = (e, index) => {
    setLocalError(null);
    clearError();

    const val = e.target.value.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    // Auto-advance focus to next field
    if (val && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setLocalError('Please enter all 6 digits of the code.');
      return;
    }

    const result = await verifyOtp(email, fullCode, type);
    if (result.success) {
      if (type === 'recovery') {
        const token = result.session?.access_token;
        navigate(`/reset-password?token=${token}`);
        return;
      }

      // New / broken account → finish profile (pick role + name). Mirrors
      // the mobile app: role is decided AFTER OTP on CompleteProfile.
      if (result.profileComplete === false) {
        navigate('/complete-profile', { replace: true });
        return;
      }

      // Existing user — route to role-based dashboard.
      const isNew = result.session?.is_new_user;
      const name = result.profile?.name || email.split('@')[0];

      setIsNewUser(isNew);
      setUserName(name);

      let redirectPath = '/';
      const role = result.profile?.role;
      if (role === 'owner') {
        redirectPath = result.hasSalon ? '/owner/dashboard' : '/owner/salon';
      } else {
        redirectPath = '/explore';
      }
      setTargetRedirect(redirectPath);
      setShowSuccessModal(true);
    }
  };

  const handleResend = async () => {
    clearError();
    setLocalError(null);
    const result = await sendOtp(email);
    if (result.success) {
      useToastStore.getState().success('A new verification code has been sent to your email.');
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      setCode(Array(6).fill(''));
      inputRefs[0].current.focus();
    }
  };

  // Mask email for display
  const maskedEmail = () => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  };

  const isVerifyDisabled = code.some((val) => !val) || isLoading;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <AuthBrandMark />
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-stone-500 text-sm">
            We sent a 6-digit code to <span className="font-semibold text-stone-850">{maskedEmail()}</span>
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          {(authError || localError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
            >
              <p>{authError || localError}</p>
            </motion.div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* Numeric Digits Code Boxes */}
            <div className="flex justify-between gap-2 my-6">
              {code.map((value, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleTextChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-bold bg-white focus:outline-none transition-colors ${
                    value ? 'border-orange-800 bg-orange-50/20' : 'border-stone-200'
                  }`}
                  disabled={isLoading}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isVerifyDisabled}
              className={`w-full btn-primary flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-orange-800 hover:bg-orange-700 focus:outline-none transition-colors ${
                isVerifyDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          {/* Resend Cooldown Section */}
          <div className="mt-6 flex justify-center">
            {resendTimer > 0 ? (
              <p className="text-xs text-stone-500">
                Resend code in <span className="font-semibold text-stone-700">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-xs text-orange-800 hover:underline font-semibold"
              >
                Resend Code
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <SuccessOverlay
        isOpen={showSuccessModal}
        isNewUser={isNewUser}
        userName={userName}
        onClose={handleModalClose}
      />
    </div>
  );
}
