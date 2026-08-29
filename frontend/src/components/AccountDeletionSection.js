import React from 'react';
import { Link } from 'react-router-dom';
import { Trash, Warning } from '@phosphor-icons/react';

const AccountDeletionSection = () => {
  return (
    <div className="bg-white rounded-2xl border border-red-200 p-6 mt-6">
      <div className="flex items-start gap-3 mb-4">
        <Warning size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-stone-900 mb-1">Account</h2>
          <p className="text-sm text-stone-600">
            Review what will be removed, then securely confirm permanent deletion.
          </p>
        </div>
      </div>

      <Link
        to="/delete-account"
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50 mb-3"
      >
        <Trash size={20} />
        Review account deletion
      </Link>

      <p className="text-xs text-stone-500 text-center">
        <Link to="/delete-account" className="text-brand-800 hover:underline">
          Account and data deletion details
        </Link>
      </p>
    </div>
  );
};

export default AccountDeletionSection;
