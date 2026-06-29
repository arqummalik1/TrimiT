import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WarningCircle, Star, ArrowRight } from '@phosphor-icons/react';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import { ENABLE_SUBSCRIPTIONS } from '../../lib/featureFlags';

/**
 * Owner-only trial / expiry banner. Shows:
 *  • trial → "X days left in your free trial" with a Subscribe link.
 *  • expired / no access → "Subscription expired — subscribe to keep your salon active".
 * Renders nothing while active (paid) or when subscriptions are disabled.
 */
export default function SubscriptionBanner() {
  const { data: status } = useSubscriptionStatus();

  if (!ENABLE_SUBSCRIPTIONS || !status) return null;

  const { is_trial, has_access, trial_days_remaining } = status;

  // Active paid subscription — nothing to nag about.
  if (has_access && !is_trial) return null;

  const expired = !has_access;
  const days = trial_days_remaining || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Link
        to="/owner/subscription"
        data-testid="subscription-banner"
        className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors group ${
          expired
            ? 'border-red-200 bg-red-50 hover:bg-red-100'
            : 'border-teal-200 bg-teal-50 hover:bg-teal-100'
        }`}
      >
        <span
          className={`p-2 rounded-xl ${
            expired ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
          }`}
        >
          {expired ? (
            <WarningCircle size={22} weight="bold" />
          ) : (
            <Star size={22} weight="fill" />
          )}
        </span>
        <div className="flex-1">
          <p className={`font-semibold ${expired ? 'text-red-800' : 'text-teal-800'}`}>
            {expired
              ? 'Subscription expired — subscribe to keep your salon active'
              : `${days} day${days === 1 ? '' : 's'} left in your free trial`}
          </p>
          <p className={`text-sm ${expired ? 'text-red-700' : 'text-teal-700'}`}>
            {expired
              ? 'Your salon is hidden from customers until you subscribe to TrimiT Pro.'
              : 'Subscribe to TrimiT Pro (₹299/month) to stay listed after your trial ends.'}
          </p>
        </div>
        <ArrowRight
          size={18}
          className={`${
            expired ? 'text-red-500 group-hover:text-red-700' : 'text-teal-500 group-hover:text-teal-700'
          } transition-colors`}
        />
      </Link>
    </motion.div>
  );
}
