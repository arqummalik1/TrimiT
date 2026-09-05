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

/** Owner promo codes screen + promotional notification preference. ON by default. */
export const ENABLE_OWNER_PROMO_MANAGEMENT =
  process.env.EXPO_PUBLIC_ENABLE_PROMO_MANAGEMENT === 'false' ||
  process.env.EXPO_PUBLIC_ENABLE_PROMO_MANAGEMENT === '0'
    ? false
    : true;

/**
 * TrimiT Pro subscriptions. ON: the backend now enables owner subscriptions
 * with a free trial + paid plan, so all subscription/trial UI is shown
 * (Settings card, dashboard trial pill, subscription banner, subscribe flow).
 */
export const ENABLE_SUBSCRIPTIONS = true;

/**
 * Customer Profile entry for the standalone "My offers" screen.
 * Hidden for the 1.1.0 release while the offer experience is not being promoted.
 * The screen, route, and checkout promotion engine remain intact. Set
 * EXPO_PUBLIC_ENABLE_MY_OFFERS=true in a future build to restore the entry.
 */
export const ENABLE_MY_OFFERS_ENTRY =
  process.env.EXPO_PUBLIC_ENABLE_MY_OFFERS === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_MY_OFFERS === '1';

/** 1.1.0: hide the automatic TRIMIT50 welcome popup, not checkout discounts. */
export const ENABLE_WELCOME_VOUCHER = false;

/**
 * Client enforcement: freeze the owner app when access lapses + grey out lapsed
 * salons for customers. Enforcement is ON now (backend enforces 402/403).
 * Defaults to `true`; set EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT=false to
 * explicitly disable for a build.
 */
export const ENABLE_SUBSCRIPTION_ENFORCEMENT =
  process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT === 'false' ||
  process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT === '0'
    ? false
    : true;
