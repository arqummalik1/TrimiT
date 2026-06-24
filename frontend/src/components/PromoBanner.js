import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkle } from '@phosphor-icons/react';
import { isOfferActive, PROMO } from '../../config/promotions';

const STORAGE_KEY = 'trimit_promo_dismissed';

/**
 * PromoBanner — auto-hides if:
 *   1. The user has dismissed it (stored in sessionStorage)
 *   2. The offer expiry date has passed (OFFER_END_DATE in config/promotions.js)
 *
 * To disable the banner permanently after June 30, simply update OFFER_END_DATE
 * in config/promotions.js. No other file needs changing.
 */
export default function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if offer is still active AND user hasn't dismissed this session
    if (isOfferActive() && !sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Promotional offer"
      className="relative z-50 bg-gradient-to-r from-orange-700 via-orange-800 to-orange-900 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkle size={16} weight="fill" className="text-orange-200 shrink-0" />
          <p className="text-sm font-medium text-center sm:text-left truncate sm:whitespace-normal">
            <span className="hidden sm:inline">{PROMO.bannerText}</span>
            <span className="sm:hidden">🎉 30 Days Free Trial — Offer ends June 30</span>
            {' '}
            <Link
              to={PROMO.ctaPath}
              className="underline underline-offset-2 font-bold hover:text-orange-200 transition-colors ml-1 shrink-0"
            >
              {PROMO.ctaLabel} →
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss promotion banner"
          className="shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
