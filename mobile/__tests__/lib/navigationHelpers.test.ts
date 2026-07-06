/**
 * Unit tests for src/lib/navigationHelpers.ts
 * Covers: navigateToCustomerBookings, navigateToOwnerBookings,
 *         resetToCustomerDiscover
 */
import { CommonActions, StackActions } from '@react-navigation/native';
import {
  navigateToCustomerBookings,
  navigateToOwnerBookings,
  resetToCustomerDiscover,
} from '../../src/lib/navigationHelpers';

function createMockNavigation() {
  const dispatch = jest.fn();
  const navigate = jest.fn();
  const getParent = jest.fn(() => null);
  return { dispatch, navigate, getParent };
}

describe('navigateToCustomerBookings', () => {
  it('dispatches popToTop then navigates via parent when available', () => {
    const nav = createMockNavigation();
    const parentNav = { navigate: jest.fn(), getState: jest.fn() } as any;
    nav.getParent.mockReturnValue(parentNav);

    navigateToCustomerBookings(nav as any);

    // Should dispatch popToTop
    expect(nav.dispatch).toHaveBeenCalledWith(StackActions.popToTop());
    // Parent should navigate to Bookings
    expect(parentNav.navigate).toHaveBeenCalledWith('Bookings');
  });

  it('dispatches CommonActions when no parent available', () => {
    const nav = createMockNavigation();

    navigateToCustomerBookings(nav as any);

    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'CustomerTabs',
        params: { screen: 'Bookings' },
      })
    );
  });

  it('does not crash if popToTop throws (not in stack navigator)', () => {
    const nav = createMockNavigation();
    nav.dispatch.mockImplementation(() => {
      throw new Error('not in stack');
    });

    // Should not throw
    expect(() => navigateToCustomerBookings(nav as any)).not.toThrow();
  });
});

describe('navigateToOwnerBookings', () => {
  it('dispatches Bookings via parent tab navigator when available', () => {
    const nav = createMockNavigation();
    const parentNav = { dispatch: jest.fn(), navigate: jest.fn() } as any;
    nav.getParent.mockReturnValue(parentNav);

    navigateToOwnerBookings(nav as any);
    expect(parentNav.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'Bookings',
        params: undefined,
      })
    );
  });

  it('dispatches Bookings on the current navigator when no parent', () => {
    const nav = createMockNavigation();

    navigateToOwnerBookings(nav as any);
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'Bookings',
        params: undefined,
      })
    );
  });

  it('passes highlightBookingId when provided', () => {
    const nav = createMockNavigation();

    navigateToOwnerBookings(nav as any, { highlightBookingId: 'b-123' });
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'Bookings',
        params: { highlightBookingId: 'b-123' },
      })
    );
  });
});

describe('resetToCustomerDiscover', () => {
  it('dispatches popToTop then navigates to Discover via parent', () => {
    const nav = createMockNavigation();
    const parentNav = { navigate: jest.fn() } as any;
    nav.getParent.mockReturnValue(parentNav);

    resetToCustomerDiscover(nav as any);
    expect(nav.dispatch).toHaveBeenCalledWith(StackActions.popToTop());
    expect(parentNav.navigate).toHaveBeenCalledWith('Discover');
  });

  it('dispatches deep-link CommonActions when no parent', () => {
    const nav = createMockNavigation();

    resetToCustomerDiscover(nav as any);
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'CustomerTabs',
        params: { screen: 'Discover', params: { screen: 'DiscoverMain' } },
      })
    );
  });
});
