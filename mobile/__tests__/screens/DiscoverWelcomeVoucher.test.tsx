import React from 'react';
import { act, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

let mockUser: { id: string; role: string } | null = null;
const mockGetMyGrants = jest.fn();
const mockBootstrap = jest.fn();
const mockRecenter = jest.fn();
const mockSalonsQuery = {
  data: { pages: [] },
  isLoading: false,
  isError: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
  isRefetching: false,
  isFetching: false,
};

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => mockSalonsQuery,
  useQuery: () => ({ data: { serviceable: true } }),
}));
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: () => null,
  Marker: () => null,
}));
jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../src/store/authStore', () => ({
  useAuthStore: () => ({ user: mockUser }),
}));
jest.mock('../../src/repositories/promotionRepository', () => ({
  promotionRepository: { getMyGrants: (...args: unknown[]) => mockGetMyGrants(...args) },
}));
jest.mock('../../src/hooks/useDiscoverLocation', () => ({
  useDiscoverLocation: () => ({
    coords: null,
    errorMessage: null,
    locationReady: true,
    source: 'denied',
    bootstrap: mockBootstrap,
    recenter: mockRecenter,
  }),
}));
jest.mock('../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));
jest.mock('../../src/hooks/useMinLoadingTime', () => ({
  useMinLoadingTime: () => false,
}));
jest.mock('../../src/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: unknown) => value,
}));

import { DiscoverScreen } from '../../src/screens/customer/DiscoverScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function screenElement() {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <DiscoverScreen
        navigation={{ navigate: jest.fn(), getParent: () => null } as any}
        route={{ key: 'discover', name: 'DiscoverMain' } as any}
      />
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
});

it.each([null, '1'])('does not check or consume the welcome offer after guest login (shown=%s)', async (shown) => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(shown);
  const view = render(screenElement());

  mockUser = { id: 'test-customer', role: 'customer' };
  view.rerender(screenElement());
  await act(async () => {});

  expect(mockBootstrap).toHaveBeenCalled(); // The actual Discover screen mounted.
  expect(mockGetMyGrants).not.toHaveBeenCalled();
  expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('welcome_voucher_shown_test-customer');
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('welcome_voucher_shown_test-customer', '1');
  expect(view.queryByText('TRIMIT50')).toBeNull();
});

it('does not show or fetch the welcome offer when a signed-in customer returns to Discover', async () => {
  mockUser = { id: 'returning-customer', role: 'customer' };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  const view = render(screenElement());
  await act(async () => {});

  expect(mockBootstrap).toHaveBeenCalled();
  expect(mockGetMyGrants).not.toHaveBeenCalled();
  expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('welcome_voucher_shown_returning-customer');
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('welcome_voucher_shown_returning-customer', '1');
  expect(view.queryByText('TRIMIT50')).toBeNull();
});
