/**
 * v1 Play Store: cash-only by default. Set EXPO_PUBLIC_ENABLE_ONLINE_PAY=true for v1.1 Razorpay.
 */
export const ENABLE_ONLINE_PAY =
  process.env.EXPO_PUBLIC_ENABLE_ONLINE_PAY === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_ONLINE_PAY === '1';
