import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrimitLogo from '../components/brand/TrimitLogo';
import { useAuthStore } from '../store/authStore';
import {
  consumePendingAuthIntent,
  pathForPendingAuthIntent,
  peekPendingAuthIntent,
  roleForPendingAuthIntent,
} from '../lib/pendingAuthIntent';

/** Retry-safe fallback when automatic customer profile creation was interrupted. */
export default function ProfileBootstrapPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile, hasSalon, completeProfile, logout } = useAuthStore();
  const [error, setError] = useState(null);
  const started = useRef(false);

  const finish = async () => {
    const intent = peekPendingAuthIntent();
    const role = roleForPendingAuthIntent(intent);
    if (role === 'employee') {
      navigate('/employee-access', { replace: true });
      return;
    }
    setError(null);
    const result = await completeProfile({ role });
    if (!result.success) {
      setError(result.error || 'Could not finish your sign-in. Please try again.');
      return;
    }
    navigate(
      pathForPendingAuthIntent(consumePendingAuthIntent())
        || (result.profile?.role === 'owner'
          ? result.hasSalon ? '/owner/dashboard' : '/owner/choose-type'
          : '/explore'),
      { replace: true },
    );
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (profile?.role) {
      navigate(profile.role === 'owner' ? (hasSalon ? '/owner/dashboard' : '/owner/choose-type') : '/explore', { replace: true });
    } else {
      void finish();
    }
  }, [hasSalon, isAuthenticated, navigate, profile?.role]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
        <TrimitLogo variant="icon" asLink={false} iconClassName="h-16 w-16 mx-auto mb-4 animate-pulse" showWordmark={false} />
        <h1 className="font-heading text-2xl font-bold text-stone-900">Finishing your sign-in</h1>
        <p className={`mt-3 text-sm ${error ? 'text-red-600' : 'text-stone-500'}`}>
          {error || 'We’re securely preparing your TrimiT profile.'}
        </p>
        {error && (
          <div className="mt-6 flex flex-col gap-3">
            <button className="btn-primary" onClick={() => void finish()}>Try again</button>
            <button className="text-sm text-stone-500 hover:underline" onClick={() => { logout(); navigate('/', { replace: true }); }}>
              Cancel and sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
