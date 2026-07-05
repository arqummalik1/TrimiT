/**
 * Unit tests for src/lib/ownerNavigation.ts
 * Covers: resetOwnerDashboardToMain, navigateOwnerToServices,
 *         navigateOwnerToDashboard, getOwnerTabNavigator (via integration)
 */
import { CommonActions } from '@react-navigation/native';
import {
  resetOwnerDashboardToMain,
  navigateOwnerToServices,
  navigateOwnerToDashboard,
} from '../../src/lib/ownerNavigation';

// ─── Helpers to create mock navigation trees ─────────────────────────────────

function createMockNav(overrides?: Record<string, any>) {
  const navigate = jest.fn();
  const getState = jest.fn();
  const dispatch = jest.fn();
  const getParent = jest.fn(() => undefined);
  return { navigate, getState, dispatch, getParent, ...overrides };
}

describe('resetOwnerDashboardToMain', () => {
  it('navigates to DashboardMain via tab navigator when found', () => {
    const tabNav = createMockNav();
    tabNav.getState.mockReturnValue({ routeNames: ['Dashboard', 'Services', 'Bookings'] });
    const nav = createMockNav({ getParent: () => tabNav });

    resetOwnerDashboardToMain(nav as any);
    expect(tabNav.navigate).toHaveBeenCalledWith('Dashboard', { screen: 'DashboardMain' });
  });

  it('resets to DashboardMain when found directly in routeNames', () => {
    const nav = createMockNav();
    nav.getState.mockReturnValue({ routeNames: ['DashboardMain', 'Other'] });

    resetOwnerDashboardToMain(nav as any);
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({ index: 0, routes: [{ name: 'DashboardMain' }] })
    );
  });

  it('does nothing when no tab or stack found', () => {
    const nav = createMockNav();
    nav.getState.mockReturnValue({ routeNames: ['SomeOther'] });

    // Should not throw
    expect(() => resetOwnerDashboardToMain(nav as any)).not.toThrow();
    expect(nav.dispatch).not.toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  });
});

describe('navigateOwnerToServices', () => {
  it('returns true and navigates when Services tab is found', () => {
    const tabNav = createMockNav();
    tabNav.getState.mockReturnValue({ routeNames: ['Services', 'Dashboard'] });
    const nav = createMockNav({ getParent: () => tabNav });

    const result = navigateOwnerToServices(nav as any);
    expect(result).toBe(true);
    expect(tabNav.navigate).toHaveBeenCalledWith('Services', {
      screen: 'ServicesMain',
      params: undefined,
    });
  });

  it('passes openAddService param when provided', () => {
    const tabNav = createMockNav();
    tabNav.getState.mockReturnValue({ routeNames: ['Services', 'Dashboard'] });
    const nav = createMockNav({ getParent: () => tabNav });

    navigateOwnerToServices(nav as any, { openAddService: true });
    expect(tabNav.navigate).toHaveBeenCalledWith('Services', {
      screen: 'ServicesMain',
      params: { openAddService: true },
    });
  });

  it('returns false when Services tab is not found', () => {
    const nav = createMockNav();

    const result = navigateOwnerToServices(nav as any);
    expect(result).toBe(false);
  });
});

describe('navigateOwnerToDashboard', () => {
  it('returns true and navigates when tab navigator found', () => {
    const tabNav = createMockNav();
    tabNav.getState.mockReturnValue({ routeNames: ['Dashboard', 'Services'] });
    const nav = createMockNav({ getParent: () => tabNav });

    const result = navigateOwnerToDashboard(nav as any);
    expect(result).toBe(true);
    expect(tabNav.navigate).toHaveBeenCalledWith('Dashboard', { screen: 'DashboardMain' });
  });

  it('returns false when tab navigator not found', () => {
    const nav = createMockNav();

    const result = navigateOwnerToDashboard(nav as any);
    expect(result).toBe(false);
  });
});
