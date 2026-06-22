/**
 * Unit tests for src/lib/queryKeys.ts
 * Covers: queryKeys factory functions produce correct shapes
 */
import { queryKeys } from '../../src/lib/queryKeys';

describe('queryKeys', () => {
  it('ownerSalon is a readonly tuple with correct value', () => {
    expect(queryKeys.ownerSalon).toEqual(['ownerSalon']);
  });

  it('ownerAnalytics produces correct key with period', () => {
    expect(queryKeys.ownerAnalytics('week')).toEqual(['ownerAnalytics', 'week', undefined]);
  });

  it('ownerAnalytics includes salonId when provided', () => {
    expect(queryKeys.ownerAnalytics('month', 'salon-123')).toEqual(['ownerAnalytics', 'month', 'salon-123']);
  });

  it('ownerBookings is a readonly tuple', () => {
    expect(queryKeys.ownerBookings).toEqual(['ownerBookings']);
  });

  it('recentBookings is a readonly tuple', () => {
    expect(queryKeys.recentBookings).toEqual(['recentBookings']);
  });

  it('subscription is a readonly tuple', () => {
    expect(queryKeys.subscription).toEqual(['subscription']);
  });

  it('subscriptionStatus is a readonly tuple', () => {
    expect(queryKeys.subscriptionStatus).toEqual(['subscriptionStatus']);
  });

  it('subscriptionHistory is a readonly tuple', () => {
    expect(queryKeys.subscriptionHistory).toEqual(['subscriptionHistory']);
  });

  it('each key produces unique references for cache invalidation', () => {
    expect(queryKeys.ownerSalon).not.toBe(queryKeys.ownerBookings);
    expect(queryKeys.subscription).not.toBe(queryKeys.subscriptionStatus);
  });
});
