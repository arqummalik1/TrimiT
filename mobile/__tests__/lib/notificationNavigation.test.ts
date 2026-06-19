/**
 * Unit tests for src/lib/notificationNavigation.ts
 * Covers: handleNotificationNavigation — all routing branches:
 *         null/undefined data, not ready, unauthenticated,
 *         broadcast (customer/owner), owner bookings, customer bookings
 */
import { CommonActions } from '@react-navigation/native';
import {
  handleNotificationNavigation,
} from '../../src/lib/notificationNavigation';

function createMockNavRef(isReady = true) {
  const dispatch = jest.fn();
  return {
    isReady: () => isReady,
    dispatch,
  };
}

describe('handleNotificationNavigation', () => {
  it('does nothing when navigationRef is null', () => {
    const navRef = null;
    // Should not throw
    expect(() => handleNotificationNavigation(navRef, { type: 'test' }, 'customer')).not.toThrow();
  });

  it('does nothing when navigationRef is not ready', () => {
    const navRef = createMockNavRef(false);
    handleNotificationNavigation(navRef as any, { type: 'test' }, 'customer');
    expect(navRef.dispatch).not.toHaveBeenCalled();
  });

  it('does nothing when data is undefined', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, undefined, 'customer');
    expect(navRef.dispatch).not.toHaveBeenCalled();
  });

  it('does nothing when userRole is undefined (unauthenticated)', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { type: 'booking' }, undefined);
    expect(navRef.dispatch).not.toHaveBeenCalled();
  });

  it('navigates customer to Bookings tab for non-broadcast type', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { type: 'booking_update', booking_id: 'abc' }, 'customer');

    expect(navRef.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'CustomerTabs',
        params: { screen: 'Bookings' },
      })
    );
  });

  it('navigates owner to Bookings tab for non-broadcast type', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { type: 'booking_update', booking_id: 'abc' }, 'owner');

    expect(navRef.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'OwnerTabs',
        params: { screen: 'Bookings' },
      })
    );
  });

  it('navigates customer to Discover on broadcast type', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { type: 'broadcast' }, 'customer');

    expect(navRef.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'CustomerTabs',
        params: { screen: 'Discover', params: { screen: 'DiscoverMain' } },
      })
    );
  });

  it('navigates owner to Dashboard on broadcast type', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { type: 'broadcast' }, 'owner');

    expect(navRef.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'OwnerTabs',
        params: { screen: 'Dashboard' },
      })
    );
  });

  it('handles empty type string (defaults to bookings)', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { type: '' }, 'customer');

    expect(navRef.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'CustomerTabs',
        params: { screen: 'Bookings' },
      })
    );
  });

  it('works with bookingId (not booking_id)', () => {
    const navRef = createMockNavRef(true);
    handleNotificationNavigation(navRef as any, { bookingId: 'b-123' }, 'owner');

    expect(navRef.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'OwnerTabs',
        params: { screen: 'Bookings' },
      })
    );
  });

  it('does not throw on malformed payload (graceful degradation)', () => {
    const navRef = createMockNavRef(true);
    // Pass a payload with unexpected types — schema validation catches it
    expect(() =>
      handleNotificationNavigation(navRef as any, { type: 123 } as any, 'customer')
    ).not.toThrow();
  });
});
