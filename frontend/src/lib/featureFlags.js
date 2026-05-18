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
