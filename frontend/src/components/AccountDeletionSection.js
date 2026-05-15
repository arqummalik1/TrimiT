import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash, Warning } from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';

const AccountDeletionSection = () => {
  const navigate = useNavigate();
  const { deleteAccount, isLoading } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete your TrimiT account permanently? This removes your salon profile, bookings data, and associated records. This cannot be undone.'
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
    <div className="bg-white rounded-2xl border border-red-200 p-6 mt-6">
      <div className="flex items-start gap-3 mb-4">
        <Warning size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-stone-900 mb-1">Account</h2>
          <p className="text-sm text-stone-600">
            Delete your account and associated data from the app, or request deletion on the web.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50 mb-3"
      >
        <Trash size={20} />
        {isDeleting ? 'Deleting…' : 'Delete account'}
      </button>

      <p className="text-xs text-stone-500 text-center">
        <Link to="/contact" className="text-orange-800 hover:underline">
          Request deletion on the web
        </Link>
        {' · '}
        <a href="mailto:privacy@trimit.app" className="text-orange-800 hover:underline">
          privacy@trimit.app
        </a>
      </p>
    </div>
  );
};

export default AccountDeletionSection;
