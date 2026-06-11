import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Lock, Receipt, CheckCircle } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSubscription,
  usePaymentHistory,
  useCancelSubscription,
} from '../../hooks/useSubscription';
import { subscriptionRepository } from '../../repositories/subscriptionRepository';
import { loadRazorpay } from '../../lib/razorpay';
import { useAuthStore } from '../../store/authStore';

const STATUS_LABEL = {
  trial: 'Free Trial',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  payment_failed: 'Payment Failed',
  past_due: 'Past Due',
  grace_period: 'Grace Period',
};

const STATUS_TONE = {
  trial: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  grace_period: 'bg-amber-100 text-amber-700',
  past_due: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  payment_failed: 'bg-red-100 text-red-700',
};

const PRO_FEATURES = [
  ['Unlimited bookings', 'Accept, confirm & manage all customer bookings'],
  ['Services & pricing', 'Add and edit your full service menu'],
  ['Staff management', 'Add staff, assign services & schedules'],
  ['Real-time dashboard', 'Live new-booking alerts the moment they arrive'],
  ['Analytics & reports', 'Revenue, trends and business insights'],
  ['Promotions & marketing', 'Run promo codes and offers'],
  ['Customer notifications', 'Automatic booking push updates to customers'],
  ['Marketplace visibility', 'Your salon stays listed & bookable to all customers'],
];

const fmtDate = (iso) => {  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const SubscriptionPage = () => {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: sub, isLoading } = useSubscription();
  const { data: history } = usePaymentHistory();
  const cancelMutation = useCancelSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });
  };

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await subscriptionRepository.create();
      if (created.already_active) {
        refresh();
        setBusy(false);
        return;
      }
      const Razorpay = await loadRazorpay();
      const rzp = new Razorpay({
        key: created.key_id,
        subscription_id: created.subscription_id,
        name: 'TrimiT Pro',
        description: '₹299 / month subscription',
        recurring: 1,
        prefill: {
          name: profile?.name || '',
          email: profile?.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#0F766E' },
        handler: async (response) => {
          try {
            await subscriptionRepository.verify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
            refresh();
          } catch (e) {
            setError('Payment verification failed. If charged, contact support.');
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e?.response?.data?.detail?.message || 'Could not start checkout.');
      setBusy(false);
    }
  };

  const onCancel = () => {
    if (!window.confirm('Cancel at the end of the current billing cycle?')) return;
    cancelMutation.mutate(true, {
      onError: () => setError('Could not cancel. Please try again.'),
    });
  };

  if (isLoading || !sub) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse h-40 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const showSubscribe = sub.status !== 'active';
  const showCancel = sub.status === 'active' && !sub.cancel_at_period_end;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <Link to="/owner/settings" className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft size={20} /> Back to settings
      </Link>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Plan card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <Star size={24} weight="fill" className="text-teal-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TrimiT Pro</h1>
              <p className="text-gray-500">₹{(sub.amount / 100).toFixed(0)} / month</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_TONE[sub.status] || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABEL[sub.status]}
          </span>
        </div>

        {sub.is_trial && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-teal-800 text-sm font-medium">
            <CheckCircle size={18} />
            {sub.trial_days_remaining} day{sub.trial_days_remaining === 1 ? '' : 's'} left in your free trial
          </div>
        )}
      </div>

      {/* What you get — TrimiT Pro value card */}
      <div className="rounded-2xl border border-teal-300 bg-white p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Everything in TrimiT Pro</h2>
            <p className="text-sm text-gray-500">One plan. All features unlocked.</p>
          </div>
          <div className="flex items-end text-teal-700">
            <span className="text-3xl font-extrabold">₹299</span>
            <span className="text-sm font-bold mb-1">/mo</span>
          </div>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {PRO_FEATURES.map(([title, desc]) => (
            <li key={title} className="flex items-start gap-2">
              <CheckCircle size={20} weight="fill" className="text-teal-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-gray-900">{title}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-4 space-y-3 text-sm">
        <Row label="Status" value={STATUS_LABEL[sub.status]} />
        {sub.is_trial ? (
          <Row label="Trial ends" value={fmtDate(sub.trial_end)} />
        ) : (
          <>
            <Row label="Current cycle start" value={fmtDate(sub.current_period_start)} />
            <Row label="Next renewal" value={fmtDate(sub.next_renewal_at)} />
          </>
        )}
        <Row label="Subscription start" value={fmtDate(sub.created_at)} />
        {sub.cancel_at_period_end && <Row label="Cancels on" value={fmtDate(sub.current_period_end)} />}
      </div>

      {/* Actions */}
      {showSubscribe && (
        <button
          onClick={startCheckout}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-white font-semibold py-4 disabled:opacity-60"
        >
          <Lock size={18} />
          {busy ? 'Opening checkout…' : sub.status === 'trial' ? 'Subscribe to TrimiT Pro' : 'Renew subscription'}
        </button>
      )}

      {showCancel && (
        <button
          onClick={onCancel}
          disabled={cancelMutation.isPending}
          className="w-full mt-3 rounded-xl border border-red-300 text-red-600 font-semibold py-3 disabled:opacity-60"
        >
          {cancelMutation.isPending ? 'Cancelling…' : 'Cancel subscription'}
        </button>
      )}

      {/* Payment history */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={20} className="text-gray-700" />
          <h2 className="font-bold text-gray-900">Payment history</h2>
        </div>
        {history && history.payments.length > 0 ? (
          <>
            <div className="flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3 mb-3">
              <span className="text-gray-700 font-medium">Total paid</span>
              <span className="text-teal-700 font-extrabold text-lg">
                ₹{(history.total_paid / 100).toFixed(0)}
              </span>
            </div>
            <div className="space-y-2">
              {history.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <div className="font-semibold text-gray-900">₹{(p.amount / 100).toFixed(0)}</div>
                    <div className="text-xs text-gray-500">{fmtDate(p.paid_at || p.created_at)}</div>
                  </div>
                  <span className="text-xs font-bold capitalize text-gray-600">{p.status}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">No payments yet.</p>
        )}
      </div>
    </motion.div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 font-semibold">{value}</span>
  </div>
);

export default SubscriptionPage;
