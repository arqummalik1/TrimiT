import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, WarningCircle, ShieldCheck } from '@phosphor-icons/react';
import { formatPrice, formatTime } from '../../lib/utils';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Fallback to empty if accessed directly
  const { amount = 0, salonName = '', serviceName = '', bookingDate = '', timeSlot = '' } = location.state || {};

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-stone-700" />
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-stone-900">
                Payment Information
              </h1>
              <p className="text-sm text-stone-500">{salonName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
              <ShieldCheck size={32} weight="duotone" className="text-orange-800" />
            </div>
          </div>

          <div className="space-y-4 mb-8 bg-stone-50 p-5 rounded-xl border border-stone-100">
            <div className="flex justify-between">
              <span className="text-stone-500">Service</span>
              <span className="font-semibold text-stone-900">{serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Date</span>
              <span className="font-semibold text-stone-900">{bookingDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Time</span>
              <span className="font-semibold text-stone-900">{timeSlot ? formatTime(timeSlot) : ''}</span>
            </div>
            <div className="border-t border-stone-200 pt-4 mt-4 flex justify-between items-center">
              <span className="text-stone-700 font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-orange-800">{formatPrice(amount)}</span>
            </div>
          </div>

          <div className="mb-6 bg-yellow-50 text-yellow-800 p-5 rounded-xl border border-yellow-200 flex gap-3">
            <WarningCircle size={24} className="shrink-0 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-bold mb-1">Gateway Update in Progress</h3>
              <p className="text-sm">
                Our payment gateway is currently being updated to serve you better. 
                Online payments are temporarily disabled. Please pay directly at the salon for this booking.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/my-bookings')}
            className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
          >
            Go to My Bookings
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentPage;
