/**
 * v1 feature flags — keep UI aligned with what production actually uses.
 * Set VITE_ENABLE_*=true in .env when enabling a feature.
 */

export const ENABLE_MULTI_BOOKING_PER_SLOT =
  import.meta.env.VITE_ENABLE_MULTI_BOOKING === 'true' ||
  import.meta.env.VITE_ENABLE_MULTI_BOOKING === '1';

export const ENABLE_OWNER_PROMO_MANAGEMENT =
  import.meta.env.VITE_ENABLE_PROMO_MANAGEMENT === 'true' ||
  import.meta.env.VITE_ENABLE_PROMO_MANAGEMENT === '1';

/** TrimiT Pro subscriptions (owner). Default ON to surface trial + billing. */
export const ENABLE_SUBSCRIPTIONS =
  import.meta.env.VITE_ENABLE_SUBSCRIPTIONS !== 'false' &&
  import.meta.env.VITE_ENABLE_SUBSCRIPTIONS !== '0';

/** Phase 2 client enforcement: grey out lapsed salons for customers. Default ON. */
export const ENABLE_SUBSCRIPTION_ENFORCEMENT =
  import.meta.env.VITE_ENABLE_SUBSCRIPTION_ENFORCEMENT !== 'false' &&
  import.meta.env.VITE_ENABLE_SUBSCRIPTION_ENFORCEMENT !== '0';
