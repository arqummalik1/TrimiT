import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { isOfferActive, PROMO } from '../config/promotions';

const STORAGE_KEY = 'trimit_promo_dismissed_v2';

/**
 * PromoBanner — A clean, full-width urgency strip.
 * Auto-hides after OFFER_END_DATE in config/promotions.js.
 * Permanently dismissed per user via localStorage.
 */
export default function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOfferActive() && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Promotional offer"
      className="relative z-50 bg-stone-900 border-b border-stone-700"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          <span className="hidden sm:flex items-center gap-2 text-xs text-stone-400 font-medium tracking-widest uppercase">
            Limited Offer
          </span>
          <span className="hidden sm:block w-px h-3 bg-stone-600" />
          <p className="text-sm text-stone-200 text-center">
            Salon owners get{' '}
            <span className="font-bold text-orange-400">30 days free</span>
            {' '}— onboarding is completely free.{' '}
            <Link
              to={PROMO.ctaPath}
              className="font-bold text-white underline underline-offset-2 hover:text-orange-300 transition-colors"
            >
              Start Free Trial
            </Link>
          </p>
          <span className="hidden sm:block w-px h-3 bg-stone-600" />
          <span className="hidden sm:flex items-center text-xs text-stone-500">
            Offer ends June 30
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss offer banner"
          className="shrink-0 p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
