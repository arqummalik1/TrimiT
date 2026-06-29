import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Star } from '@phosphor-icons/react';
import { useSubscriptionStatus } from '../../hooks/useSubscription';
import SubscriptionBanner from './SubscriptionBanner';
import {
  ENABLE_SUBSCRIPTIONS,
  ENABLE_SUBSCRIPTION_ENFORCEMENT,
} from '../../lib/featureFlags';

/**
 * Wraps owner management pages. When the owner's subscription has lapsed and
 * the backend has enforcement turned on, it replaces the page with a clear
 * "Subscription expired" state + Subscribe CTA instead of showing raw 402s.
 * While in trial it shows the SubscriptionBanner above the page content.
 */
export default function OwnerSubscriptionGate({ children }) {
  const { data: status, isLoading } = useSubscriptionStatus();

  // Subscriptions off, or status not loaded yet — render the page as-is so we
  // never block the owner on a transient fetch (production-safety rule).
  if (!ENABLE_SUBSCRIPTIONS || isLoading || !status) {
    return <>{children}</>;
  }

  const enforce =
    ENABLE_SUBSCRIPTION_ENFORCEMENT && status.enforcement_enabled === true;
  const lapsed = enforce && status.has_access === false;

  if (lapsed) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="subscription-expired-gate"
            className="rounded-2xl border border-red-200 bg-white p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <Lock size={32} weight="duotone" className="text-red-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">
              Subscription expired
            </h1>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
              Your TrimiT Pro access has ended, so your salon is hidden from
              customers and management tools are paused. Subscribe to reactivate
              your salon instantly.
            </p>
            <Link
              to="/owner/subscription"
              data-testid="gate-subscribe-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-white font-semibold px-6 py-3 hover:bg-teal-800 transition-colors"
            >
              <Star size={20} weight="fill" />
              Subscribe ₹299/month
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <SubscriptionBanner />
      </div>
      {children}
    </>
  );
}
