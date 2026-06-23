/**
 * v1 Play Store: cash-only by default. Set EXPO_PUBLIC_ENABLE_ONLINE_PAY=true for v1.1 Razorpay.
 */
export const ENABLE_ONLINE_PAY =
  process.env.EXPO_PUBLIC_ENABLE_ONLINE_PAY === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_ONLINE_PAY === '1';

/**
 * Staff picker on booking screen. Off for narrow v1; enable after migration 34 + Phase 4 QA.
 */
export const ENABLE_STAFF_SELECTION =
  process.env.EXPO_PUBLIC_ENABLE_STAFF_SELECTION === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_STAFF_SELECTION === '1';

/** Multiple customers per time slot (owner settings + slot UI). v1 uses one booking per slot. */
export const ENABLE_MULTI_BOOKING_PER_SLOT =
  process.env.EXPO_PUBLIC_ENABLE_MULTI_BOOKING === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_MULTI_BOOKING === '1';

/** Owner promo codes screen + promotional notification preference. */
export const ENABLE_OWNER_PROMO_MANAGEMENT =
  process.env.EXPO_PUBLIC_ENABLE_PROMO_MANAGEMENT === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_PROMO_MANAGEMENT === '1';

/**
 * TrimiT Pro subscriptions. Disabled until payment gateway is integrated.
 * Set EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS=true to re-enable.
 */
export const ENABLE_SUBSCRIPTIONS =
  process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS === '1';

/**
 * Phase 2 client enforcement: freeze the owner app + grey out lapsed salons
 * for customers. Disabled until payment gateway is integrated.
 * Set EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT=true to re-enable.
 */
export const ENABLE_SUBSCRIPTION_ENFORCEMENT =
  process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT === '1';
