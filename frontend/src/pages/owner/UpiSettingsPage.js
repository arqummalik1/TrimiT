import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, QrCode, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import api from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
import { getApiErrorMessage } from '../../lib/utils';

/**
 * UpiSettingsPage — owner payout details for the v1 UPI model.
 * The salon receives customer money DIRECTLY to its UPI ID; TrimiT never holds
 * funds. A valid UPI ID is required to offer "Pay with UPI" at checkout.
 */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

const UpiSettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToastStore();

  const { data: salon, isLoading } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/owner/salon');
      return response.data;
    },
  });

  const [form, setForm] = useState({
    upi_id: '',
    account_holder_name: '',
    bank_name: '',
    upi_qr_code: '',
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (salon) {
      setForm({
        upi_id: salon.upi_id || '',
        account_holder_name: salon.account_holder_name || '',
        bank_name: salon.bank_name || '',
        upi_qr_code: salon.upi_qr_code || '',
      });
    }
  }, [salon]);

  const upiValid = !form.upi_id || UPI_RE.test(form.upi_id.trim());

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.patch(`/salons/${salon.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      success('Payout details saved', { title: 'Saved' });
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
    },
    onError: (err) => {
      showError(getApiErrorMessage(err, 'Could not save payout details.'), {
        title: 'Save failed',
      });
    },
  });

  const handleSave = () => {
    setTouched(true);
    if (!form.upi_id.trim() || !upiValid) return;
    saveMutation.mutate({
      upi_id: form.upi_id.trim(),
      account_holder_name: form.account_holder_name.trim() || null,
      bank_name: form.bank_name.trim() || null,
      upi_qr_code: form.upi_qr_code.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-40" />
          <div className="h-40 bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center hover:bg-stone-200"
          >
            <ArrowLeft size={20} className="text-stone-700" />
          </button>
          <div>
            <h1 className="font-heading text-xl font-bold text-stone-900">Payout details</h1>
            <p className="text-sm text-stone-500">Get paid directly via UPI</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
        >
          <div className="bg-orange-50 text-orange-900 rounded-xl p-4 mb-6 flex gap-3">
            <QrCode size={22} weight="duotone" className="shrink-0 mt-0.5" />
            <p className="text-sm">
              Customers pay you directly to this UPI ID. TrimiT never holds your money.
              Add your UPI ID to accept "Pay with UPI" bookings.
            </p>
          </div>

          <label className="block mb-4">
            <span className="text-sm font-medium text-stone-700">UPI ID (required)</span>
            <input
              type="text"
              value={form.upi_id}
              onChange={(e) => setForm((f) => ({ ...f, upi_id: e.target.value }))}
              placeholder="glowsalon@okaxis"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-orange-800 focus:outline-none"
            />
            {touched && !form.upi_id.trim() && (
              <span className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <WarningCircle size={14} /> UPI ID is required.
              </span>
            )}
            {form.upi_id && !upiValid && (
              <span className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <WarningCircle size={14} /> Enter a valid UPI ID like name@bank.
              </span>
            )}
          </label>

          <label className="block mb-4">
            <span className="text-sm font-medium text-stone-700">Account holder name (optional)</span>
            <input
              type="text"
              value={form.account_holder_name}
              onChange={(e) => setForm((f) => ({ ...f, account_holder_name: e.target.value }))}
              placeholder="As shown on your UPI app"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-orange-800 focus:outline-none"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-medium text-stone-700">Bank name (optional)</span>
            <input
              type="text"
              value={form.bank_name}
              onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-orange-800 focus:outline-none"
            />
          </label>

          <label className="block mb-6">
            <span className="text-sm font-medium text-stone-700">UPI QR code image URL (optional)</span>
            <input
              type="text"
              value={form.upi_qr_code}
              onChange={(e) => setForm((f) => ({ ...f, upi_qr_code: e.target.value }))}
              placeholder="https://…"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-orange-800 focus:outline-none"
            />
          </label>

          {salon?.upi_id && (
            <p className="text-sm text-green-700 flex items-center gap-1.5 mb-4">
              <CheckCircle size={16} weight="fill" /> UPI payments are active for your salon.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full btn-primary disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save payout details'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default UpiSettingsPage;
