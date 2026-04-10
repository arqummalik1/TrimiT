import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ToggleRight, 
  ToggleLeft,
  Info,
  Storefront,
  Scissors,
  CheckCircle
} from '@phosphor-icons/react';
import api from '../../lib/api';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: salon, isLoading } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.patch(`/api/salons/${salon.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerSalon']);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleToggle = () => {
    if (!salon) return;
    updateMutation.mutate({
      allow_multiple_bookings_per_slot: !salon.allow_multiple_bookings_per_slot
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-stone-200 rounded w-48 mb-2" />
          <div className="h-4 bg-stone-200 rounded w-64" />
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-stone-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
            <Storefront size={48} className="mx-auto mb-4 text-stone-400" />
            <h2 className="font-heading text-xl font-bold text-stone-900 mb-2">
              No Salon Found
            </h2>
            <p className="text-stone-500 mb-4">
              You need to create a salon first to access settings.
            </p>
            <Link 
              to="/owner/salon" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-800 text-white rounded-full font-semibold hover:bg-orange-900 transition-colors"
            >
              Create Salon
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link 
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className="font-heading text-3xl font-bold text-stone-900">
            Salon Settings
          </h1>
          <p className="text-stone-500 mt-1">
            Manage your salon preferences
          </p>
        </motion.div>

        {/* Success Message */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800"
          >
            <CheckCircle size={20} weight="fill" />
            Settings updated successfully!
          </motion.div>
        )}

        {/* Booking Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6"
        >
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Scissors size={20} className="text-orange-800" />
              </div>
              <h2 className="font-heading text-lg font-bold text-stone-900">
                Booking Preferences
              </h2>
            </div>
            <p className="text-stone-500 text-sm">
              Configure how customers can book appointments at your salon
            </p>
          </div>

          <div className="p-6">
            {/* Multiple Bookings Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-stone-900">
                  Multiple Bookings Per Slot
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  Allow multiple customers to book the same time slot
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={updateMutation.isPending}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  salon.allow_multiple_bookings_per_slot 
                    ? 'bg-orange-800' 
                    : 'bg-stone-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    salon.allow_multiple_bookings_per_slot 
                      ? 'translate-x-6' 
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl flex gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How this works:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• When OFF: Only one booking per time slot (prevents double booking)</li>
                  <li>• When ON: Multiple customers can book the same slot (for group services)</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-stone-200 p-6"
        >
          <h3 className="font-semibold text-stone-900 mb-4">Current Status</h3>
          <div className="flex items-center gap-3">
            {salon.allow_multiple_bookings_per_slot ? (
              <>
                <ToggleRight size={32} weight="fill" className="text-orange-800" />
                <div>
                  <p className="font-medium text-stone-900">Multiple bookings enabled</p>
                  <p className="text-sm text-stone-500">Multiple customers can book the same slot</p>
                </div>
              </>
            ) : (
              <>
                <ToggleLeft size={32} weight="fill" className="text-stone-400" />
                <div>
                  <p className="font-medium text-stone-900">Single booking per slot</p>
                  <p className="text-sm text-stone-500">Only one customer per time slot</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
