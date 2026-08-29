import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storefront } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import {
  consumePendingAuthIntent,
  pathForPendingAuthIntent,
  peekPendingAuthIntent,
  setPendingAuthIntent,
} from '../lib/pendingAuthIntent';

export default function OwnerStartPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile, completeProfile } = useAuthStore();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (peekPendingAuthIntent()?.kind !== 'owner_onboarding') {
      setPendingAuthIntent({ kind: 'owner_onboarding' });
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=%2Fowner%2Fchoose-type', { replace: true });
      return;
    }
    if (profile?.role === 'owner') {
      navigate(pathForPendingAuthIntent(consumePendingAuthIntent()) || '/owner/choose-type', { replace: true });
      return;
    }
    if (profile?.role && profile.role !== 'customer') {
      setError('Owner setup is not available for this account.');
      return;
    }

    void completeProfile({ role: 'owner' }).then((result) => {
      if (result.success) {
        const intendedPath = pathForPendingAuthIntent(consumePendingAuthIntent());
        navigate(intendedPath || (result.hasSalon ? '/owner/dashboard' : '/owner/choose-type'), { replace: true });
      } else {
        setError(result.error || 'Could not activate your owner workspace.');
      }
    });
  }, [completeProfile, isAuthenticated, navigate, profile?.role]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <Storefront size={32} weight="duotone" className="text-brand-800" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-stone-900">Preparing your salon workspace</h1>
        <p className={`mt-3 text-sm ${error ? 'text-red-600' : 'text-stone-500'}`}>
          {error || 'Your identity is confirmed. We’re opening the guided salon setup now.'}
        </p>
        {error && (
          <button className="mt-6 btn-primary" onClick={() => navigate('/explore', { replace: true })}>
            Return to explore
          </button>
        )}
      </div>
    </div>
  );
}
