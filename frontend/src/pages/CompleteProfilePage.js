import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, ShieldCheck, Users } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import AuthBrandMark from '../components/brand/AuthBrandMark';
import { clearPendingAuthIntent, setPendingAuthIntent } from '../lib/pendingAuthIntent';
import { sanitizePhoneInput, isValidNationalPhone, toE164, phoneDialCode } from '../config/phone';

/** Invitation-only employee identity claim. Customers and owners no longer see a profile form. */
export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { completeProfile, logout, isAuthenticated, profileComplete, profile, isLoading, error, clearError } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState(null);

  useEffect(() => {
    clearError();
    setPendingAuthIntent({ kind: 'employee_claim' });
    if (!isAuthenticated) {
      navigate('/login?redirect=%2Femployee-access', { replace: true });
    } else if (profileComplete && profile?.role === 'employee') {
      clearPendingAuthIntent();
      navigate('/owner/dashboard', { replace: true });
    }
    return () => clearError();
  }, [clearError, isAuthenticated, navigate, profile?.role, profileComplete]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError(null);
    clearError();
    if (!isValidNationalPhone(phone)) {
      setFieldError('Enter the same 10-digit mobile number your salon owner invited.');
      return;
    }
    const result = await completeProfile({ role: 'employee', phone: toE164(phone) });
    if (!result.success) return;
    clearPendingAuthIntent();
    useToastStore.getState().success('Employee access confirmed.');
    navigate('/owner/dashboard', { replace: true });
  };

  const cancel = () => {
    clearPendingAuthIntent();
    if (!profileComplete) logout();
    navigate(profileComplete ? '/explore' : '/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <AuthBrandMark />
        <div className="text-center mb-8 -mt-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <Users size={30} weight="duotone" className="text-brand-800" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">Connect to your salon</h1>
          <p className="text-stone-500">Verify the mobile number used in your staff invitation.</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          {(error || fieldError) && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" role="alert">
              {fieldError || error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Invited mobile number</label>
              <div className="relative">
                <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <span className="absolute left-11 top-1/2 -translate-y-1/2 text-stone-500 text-sm pointer-events-none">{phoneDialCode()}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => { setPhone(sanitizePhoneInput(event.target.value)); setFieldError(null); }}
                  data-testid="employee-phone"
                  className="w-full pl-20 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                  placeholder="98765 43210"
                  autoComplete="tel"
                />
              </div>
            </div>
            <button type="submit" disabled={isLoading} data-testid="employee-submit" className="w-full btn-primary disabled:opacity-50">
              {isLoading ? 'Verifying invitation…' : 'Verify invitation'}
            </button>
            <button type="button" onClick={cancel} className="w-full text-sm text-stone-500 hover:underline">Cancel employee access</button>
          </form>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
            <ShieldCheck size={18} weight="fill" className="shrink-0" />
            Employee permissions are granted only after the backend matches a pending salon invitation.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
