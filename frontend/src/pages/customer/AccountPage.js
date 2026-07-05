import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Trash, Warning } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { SUPPORT_EMAIL } from '../../config/contact';
import AppVersionNote from '../../components/AppVersionNote';
import { FilterChipRow } from '../../components/FilterChipRow';
import { DISCOVERY_PREF_OPTIONS } from '../../lib/genderServe';

const AccountPage = () => {
  const navigate = useNavigate();
  const { profile, user, deleteAccount, updateProfile, isLoading } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [discoveryAudience, setDiscoveryAudience] = useState(
    profile?.discovery_audience || user?.discovery_audience || 'auto',
  );
  const [savingDiscovery, setSavingDiscovery] = useState(false);

  const handleDiscoveryChange = async (value) => {
    setDiscoveryAudience(value);
    setSavingDiscovery(true);
    const result = await updateProfile({ discovery_audience: value });
    setSavingDiscovery(false);
    if (result.success) {
      useToastStore.getState().success('Discovery preference updated');
    } else {
      setError(result.error || 'Could not update discovery preference');
      setDiscoveryAudience(profile?.discovery_audience || 'auto');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete your TrimiT account permanently? This removes your profile and associated data. Active bookings may be cancelled. This cannot be undone.'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    const result = await deleteAccount();
    setIsDeleting(false);

    if (!result.success) {
      setError(result.error || 'Could not delete account');
      return;
    }
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-10"
    >
      <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">My Account</h1>
      <p className="text-stone-500 mb-8">Manage your profile and account data.</p>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <User size={24} className="text-orange-800" />
          </div>
          <div>
            <p className="font-semibold text-stone-900">{profile?.name || 'User'}</p>
            <p className="text-sm text-stone-500">{profile?.email}</p>
            {profile?.phone && (
              <p className="text-sm text-stone-500">{profile.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-2">Discovery</h2>
        <p className="text-sm text-stone-500 mb-4">
          Choose which salons appear when you browse near you.
        </p>
        <FilterChipRow
          options={DISCOVERY_PREF_OPTIONS}
          value={discoveryAudience}
          onChange={handleDiscoveryChange}
          testIDPrefix="discovery-pref"
        />
        {savingDiscovery && (
          <p className="text-sm text-stone-500 mt-3">Saving…</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Warning size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-stone-900 mb-1">Delete account</h2>
            <p className="text-sm text-stone-600">
              Permanently delete your TrimiT account and associated personal data. You can also
              request deletion by emailing{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-orange-800 underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50"
        >
          <Trash size={20} />
          {isDeleting ? 'Deleting…' : 'Delete account'}
        </button>

        <p className="text-xs text-stone-500 mt-4 text-center">
          <Link to="/contact" className="text-orange-800 hover:underline">
            Account deletion help on Contact page
          </Link>
        </p>

        <AppVersionNote className="mt-8 pb-4" />
      </div>
    </motion.div>
  );
};

export default AccountPage;
