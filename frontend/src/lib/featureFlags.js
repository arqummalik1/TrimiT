/**
 * v1 feature flags — keep UI aligned with what production actually uses.
 * Set VITE_ENABLE_*=true in .env when enabling a feature.
 */

/** When the env var is explicitly set, honour it; otherwise fall back to `fallback`. */
function flagWithDefault(viteValue, craValue, fallback) {
  const raw = viteValue ?? craValue;
  if (raw === undefined || raw === null || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

export const ENABLE_MULTI_BOOKING_PER_SLOT =
  import.meta.env.VITE_ENABLE_MULTI_BOOKING === 'true' ||
  import.meta.env.VITE_ENABLE_MULTI_BOOKING === '1';

export const ENABLE_OWNER_PROMO_MANAGEMENT =
  import.meta.env.VITE_ENABLE_PROMO_MANAGEMENT === 'true' ||
  import.meta.env.VITE_ENABLE_PROMO_MANAGEMENT === '1';

/**
 * TrimiT Pro subscriptions (owner). Enabled by default now that the backend
 * owner-subscription system is live. An explicit env override still wins.
 */
export const ENABLE_SUBSCRIPTIONS = flagWithDefault(
  import.meta.env.VITE_ENABLE_SUBSCRIPTIONS,
  import.meta.env.REACT_APP_ENABLE_SUBSCRIPTIONS,
  true
);

/**
 * Phase 2 client enforcement: grey out lapsed salons + gate lapsed owners.
 * Enabled by default now that backend enforcement is live. Env override wins.
 */
export const ENABLE_SUBSCRIPTION_ENFORCEMENT = flagWithDefault(
  import.meta.env.VITE_ENABLE_SUBSCRIPTION_ENFORCEMENT,
  import.meta.env.REACT_APP_ENABLE_SUBSCRIPTION_ENFORCEMENT,
  true
);
