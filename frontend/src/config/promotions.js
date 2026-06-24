/**
 * Centralized promotion configuration.
 * To disable an offer: change OFFER_END_DATE to a past date.
 * This is the SINGLE SOURCE OF TRUTH for all promotional content on the site.
 */

/** Offer expires end of day June 30 2026 IST (UTC+5:30) */
export const OFFER_END_DATE = new Date('2026-07-01T00:00:00+05:30');

/** Returns true only if the current datetime is before the offer end date */
export const isOfferActive = () => new Date() < OFFER_END_DATE;

export const PROMO = {
  /** Urgency strip headline */
  bannerText: 'Salon owners get 30 days free — onboarding is completely free.',
  /** CTA label used across hero, header, and final CTA sections */
  ctaLabel: 'Start Free Trial',
  /** Route all CTAs point to */
  ctaPath: '/signup',
  /** Customer-facing value prop */
  customerProp: 'Free for Customers — Forever',
  /** Owner-facing value prop */
  ownerProp: '30 Days Free Trial for Salon Owners',
  /** Urgency sub-text */
  urgencyText: 'Offer valid till June 30, 2026. Don\'t miss it.',
};
