import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '../../src/screens/customer/ProfileScreen';

const customer = { id: 'test-customer', name: 'Test Customer', email: 'test@example.com', role: 'customer' };
let mockUser: typeof customer | null = customer;

jest.mock('../../src/store/authStore', () => ({
  useAuthStore: () => ({ user: mockUser, setUser: jest.fn(), token: null, resetOnboarding: jest.fn() }),
}));
jest.mock('../../src/components/NotificationSettingsSection', () => ({ NotificationSettingsSection: () => null }));
jest.mock('../../src/components/DiscoverySettingsSection', () => ({ DiscoverySettingsSection: () => null }));
jest.mock('../../src/components/SignOutButton', () => ({ SignOutButton: () => null }));
jest.mock('../../src/lib/authGate', () => ({
  requestAuthentication: jest.fn(), requestEmployeeWorkspace: jest.fn(), requestOwnerWorkspace: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderProfile() {
  const navigation = { navigate: jest.fn(), getParent: jest.fn() } as any;
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ProfileScreen navigation={navigation} route={{ key: 'profile', name: 'ProfileMain' }} />
    </SafeAreaProvider>,
  );
  return navigation;
}

beforeEach(() => { mockUser = customer; });

it('hides the My offers entry while preserving the other customer settings', () => {
  const navigation = renderProfile();
  expect(screen.queryByText('My offers & coupons')).toBeNull();
  expect(screen.queryByText('Offers')).toBeNull();
  fireEvent.press(screen.getByText('Payments help'));
  expect(navigation.navigate).toHaveBeenCalledWith('PaymentsHelp');
});

it('shows 1.1.0 at the bottom of the signed-in profile', () => {
  renderProfile();
  expect(screen.getByText('TrimiT v1.1.0 · Production')).toBeTruthy();
});

it('shows the same version in the guest account screen', () => {
  mockUser = null;
  renderProfile();
  expect(screen.getByText('TrimiT v1.1.0 · Production')).toBeTruthy();
});
