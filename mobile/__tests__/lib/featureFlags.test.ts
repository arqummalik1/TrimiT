/**
 * Unit tests for src/lib/featureFlags.ts
 * Covers: ENABLE_STAFF_SELECTION,
 *         ENABLE_MULTI_BOOKING_PER_SLOT, ENABLE_OWNER_PROMO_MANAGEMENT,
 *         ENABLE_SUBSCRIPTIONS, ENABLE_MY_OFFERS_ENTRY,
 *         ENABLE_SUBSCRIPTION_ENFORCEMENT
 *
 * These flags read from process.env at module load time. We test the
 * boolean coercion logic by checking the exported values are booleans.
 */
import {
  ENABLE_STAFF_SELECTION,
  ENABLE_MULTI_BOOKING_PER_SLOT,
  ENABLE_OWNER_PROMO_MANAGEMENT,
  ENABLE_SUBSCRIPTIONS,
  ENABLE_MY_OFFERS_ENTRY,
  ENABLE_WELCOME_VOUCHER,
  ENABLE_SUBSCRIPTION_ENFORCEMENT,
} from '../../src/lib/featureFlags';

describe('featureFlags', () => {
  it('ENABLE_STAFF_SELECTION is a boolean', () => {
    expect(typeof ENABLE_STAFF_SELECTION).toBe('boolean');
  });

  it('ENABLE_MULTI_BOOKING_PER_SLOT is a boolean', () => {
    expect(typeof ENABLE_MULTI_BOOKING_PER_SLOT).toBe('boolean');
  });

  it('ENABLE_OWNER_PROMO_MANAGEMENT is a boolean', () => {
    expect(typeof ENABLE_OWNER_PROMO_MANAGEMENT).toBe('boolean');
  });

  it('ENABLE_SUBSCRIPTIONS is a boolean', () => {
    expect(typeof ENABLE_SUBSCRIPTIONS).toBe('boolean');
  });

  it('keeps the standalone My offers profile entry hidden for 1.1.0', () => {
    expect(ENABLE_MY_OFFERS_ENTRY).toBe(false);
  });

  it('keeps the automatic welcome voucher hidden for 1.1.0', () => {
    expect(ENABLE_WELCOME_VOUCHER).toBe(false);
  });

  it('ENABLE_SUBSCRIPTION_ENFORCEMENT is a boolean', () => {
    expect(typeof ENABLE_SUBSCRIPTION_ENFORCEMENT).toBe('boolean');
  });

  it('ENABLE_SUBSCRIPTIONS defaults to true when env is not explicitly false', () => {
    // Default behavior: ON unless EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS=false/0
    expect(ENABLE_SUBSCRIPTIONS).toBe(true);
  });

  it('ENABLE_SUBSCRIPTION_ENFORCEMENT defaults to true when env is not explicitly false', () => {
    expect(ENABLE_SUBSCRIPTION_ENFORCEMENT).toBe(true);
  });
});
