import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  EnvelopeSimple,
  ShieldCheck,
  Trash,
  Warning,
} from '@phosphor-icons/react';

import { SUPPORT_EMAIL } from '../config/contact';
import { useAuthStore } from '../store/authStore';

const REMOVED_DATA = [
  'Your TrimiT profile and sign-in identity',
  'Bookings, reviews, preferences, and account-linked records',
  'Salon, service, staff, and business records if you are an owner',
];

export default function AccountDeletionPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile, user, deleteAccount, isLoading } = useAuthStore();
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const accountEmail = profile?.email || user?.email || '';
  const needsNativeAppleConfirmation = /confirm.*apple|apple.*confirm/i.test(error);
  const emailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('TrimiT account deletion request')}&body=${encodeURIComponent(
    `Please delete my TrimiT account and associated data.\n\nAccount email: ${accountEmail || '[enter the email used for your account]'}\n`,
  )}`;

  const handleDelete = async () => {
    if (!confirmed || isDeleting) return;
    setIsDeleting(true);
    setError('');
    const result = await deleteAccount();
    setIsDeleting(false);
    if (!result.success) {
      setError(result.error || 'We could not delete the account. Please try again.');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-700 flex items-center justify-center mb-6">
          <ShieldCheck size={32} weight="duotone" />
        </div>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-800 mb-3">
          Privacy control
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
          Delete your TrimiT account
        </h1>
        <p className="text-lg text-stone-600 leading-relaxed max-w-2xl mb-8">
          You can permanently delete your account and associated personal data here. This page
          is available even when you do not have the app installed.
        </p>

        <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 mb-6">
          <h2 className="font-heading text-2xl font-bold text-stone-900 mb-5">What is removed</h2>
          <div className="space-y-4">
            {REMOVED_DATA.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle size={21} weight="fill" className="text-brand-700 mt-0.5 flex-none" />
                <p className="text-stone-600">{item}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6 rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <Warning size={22} className="text-amber-700 flex-none mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              Deletion is permanent and cannot be undone. Limited records may be retained only
              where legally required, such as financial or fraud-prevention records.
            </p>
          </div>
        </section>

        {isAuthenticated ? (
          <section className="bg-white rounded-3xl border border-red-200 p-6 sm:p-8 mb-6">
            <h2 className="font-heading text-2xl font-bold text-stone-900 mb-2">
              Delete the signed-in account
            </h2>
            <p className="text-sm text-stone-600 mb-5">
              {accountEmail ? <>You are signed in as <strong>{accountEmail}</strong>.</> : 'You are signed in.'}
            </p>

            <label className="flex items-start gap-3 rounded-2xl border border-stone-200 p-4 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-red-700 focus:ring-red-600"
              />
              <span className="text-sm text-stone-700">
                I understand that my account and associated data will be permanently deleted.
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4" role="alert">
                <p className="text-sm text-red-800">{error}</p>
                {needsNativeAppleConfirmation && (
                  <p className="text-sm text-red-800 mt-2">
                    Open TrimiT on your iPhone to confirm with Apple, or use the email request below.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleDelete}
              disabled={!confirmed || isDeleting || isLoading}
              className="w-full min-h-12 rounded-full bg-red-700 hover:bg-red-800 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash size={20} />
              {isDeleting ? 'Deleting your account…' : 'Delete account permanently'}
            </button>
          </section>
        ) : (
          <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 mb-6">
            <h2 className="font-heading text-2xl font-bold text-stone-900 mb-2">Verify your account</h2>
            <p className="text-stone-600 mb-5">
              Sign in to delete immediately, or send a deletion request from the email address
              used for your TrimiT account.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                to="/login?redirect=%2Fdelete-account"
                className="min-h-12 rounded-full bg-stone-900 hover:bg-black text-white font-semibold flex items-center justify-center px-5 transition-colors"
              >
                Sign in to delete
              </Link>
              <a
                href={emailHref}
                className="min-h-12 rounded-full border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold flex items-center justify-center gap-2 px-5 transition-colors"
              >
                <EnvelopeSimple size={20} /> Request by email
              </a>
            </div>
          </section>
        )}

        <p className="text-sm text-stone-500 text-center">
          Need help? Email <a className="text-brand-800 underline" href={emailHref}>{SUPPORT_EMAIL}</a>.
        </p>
      </motion.div>
    </div>
  );
}
