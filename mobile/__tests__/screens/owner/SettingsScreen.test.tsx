import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../../src/theme/ThemeContext';
import { SettingsScreen } from '../../../src/screens/owner/SettingsScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

jest.mock('../../../src/store/authStore', () => ({
  useAuthStore: jest.fn().mockReturnValue({
    deleteAccount: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../../../src/repositories/salonRepository', () => ({
  salonRepository: {
    getOwnerSalon: jest.fn().mockResolvedValue({
      id: '1',
      name: 'Test Salon',
      address: '123 Main St',
      allow_multiple_bookings_per_slot: false,
      auto_accept: true,
      show_offers: true,
    }),
  },
}));

jest.mock('../../../src/components/NotificationSettingsSection', () => ({
  NotificationSettingsSection: () => null,
}));

jest.mock('../../../src/components/SignOutButton', () => ({
  SignOutButton: () => null,
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(navigation: any = {}) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsScreen navigation={navigation} route={{} as any} />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('SettingsScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = renderScreen();
    expect(getByText('Loading settings...')).toBeTruthy();
  });
});
