/**
 * Unit tests for src/lib/featureFlags.ts
 * Covers: ENABLE_ONLINE_PAY, ENABLE_STAFF_SELECTION,
 *         ENABLE_MULTI_BOOKING_PER_SLOT, ENABLE_OWNER_PROMO_MANAGEMENT,
 *         ENABLE_SUBSCRIPTIONS, ENABLE_SUBSCRIPTION_ENFORCEMENT
 *
 * These flags read from process.env at module load time. We test the
 * boolean coercion logic by checking the exported values are booleans.
 */
import {
  ENABLE_ONLINE_PAY,
  ENABLE_STAFF_SELECTION,
  ENABLE_MULTI_BOOKING_PER_SLOT,
  ENABLE_OWNER_PROMO_MANAGEMENT,
  ENABLE_SUBSCRIPTIONS,
  ENABLE_SUBSCRIPTION_ENFORCEMENT,
} from '../../src/lib/featureFlags';

describe('featureFlags', () => {
  it('ENABLE_ONLINE_PAY is a boolean', () => {
    expect(typeof ENABLE_ONLINE_PAY).toBe('boolean');
  });

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
