import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Trash, Warning, Storefront, Users } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { SUPPORT_EMAIL } from '../../config/contact';
import AppVersionNote from '../../components/AppVersionNote';
import { FilterChipRow } from '../../components/FilterChipRow';
import { DISCOVERY_PREF_OPTIONS } from '../../lib/genderServe';

const AccountPage = () => {
  const { profile, user, updateProfile } = useAuthStore();
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
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
            <User size={24} className="text-brand-800" />
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

      {profile?.role === 'customer' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-900 mb-2">For salon teams</h2>
          <p className="text-sm text-stone-500 mb-4">Enter a workspace only when it applies to you.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link to="/owner/start" className="rounded-xl border border-stone-200 p-4 hover:border-brand-500 hover:bg-brand-50">
              <Storefront size={24} weight="duotone" className="text-brand-800 mb-2" />
              <span className="block font-semibold text-stone-900">List or manage my salon</span>
              <span className="text-xs text-stone-500">Start owner-specific setup</span>
            </Link>
            <Link to="/employee-access" className="rounded-xl border border-stone-200 p-4 hover:border-brand-500 hover:bg-brand-50">
              <Users size={24} weight="duotone" className="text-brand-800 mb-2" />
              <span className="block font-semibold text-stone-900">Employee access</span>
              <span className="text-xs text-stone-500">Connect through a salon invitation</span>
            </Link>
          </div>
        </div>
      )}

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
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-800 underline">
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

        <Link
          to="/delete-account"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50"
        >
          <Trash size={20} />
          Review account deletion
        </Link>

        <p className="text-xs text-stone-500 mt-4 text-center">
          <Link to="/delete-account" className="text-brand-800 hover:underline">
            Open the account and data deletion page
          </Link>
        </p>

        <AppVersionNote className="mt-8 pb-4" />
      </div>
    </motion.div>
  );
};

export default AccountPage;
