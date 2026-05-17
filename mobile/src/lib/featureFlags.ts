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
