/**
 * Render/behavior tests for MyBookingsScreen.
 *
 * Strategy: render the real screen inside the real ThemeProvider + a test
 * QueryClientProvider, but mock the network gateway (bookingRepository), the
 * realtime subscription (supabase), and heavy presentational children so the
 * test asserts the screen's OWN behaviour: data → list, [] → empty state,
 * error → ErrorState + retry.
 */

import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { createTestQueryClient } from '../../testUtils/createTestQueryClient';

const mockGetMyBookings = jest.fn();
const mockCancelBooking = jest.fn();
const mockRefetchSpy = jest.fn();

jest.mock('../../src/repositories/bookingRepository', () => ({
  bookingRepository: {
    getMyBookings: (...a: unknown[]) => mockGetMyBookings(...a),
    cancelBooking: (...a: unknown[]) => mockCancelBooking(...a),
  },
}));

// handleApiError classifies the error. Returning kind:'unauthorized' makes the
// screen's useQuery retry predicate return false, so a failure surfaces the error
// state immediately instead of retrying with backoff (which would outlast waitFor).
jest.mock('../../src/lib/errorHandler', () => ({
  handleApiError: (err: any) => ({ kind: 'unauthorized', message: err?.message ?? 'error' }),
}));

// useFocusEffect needs a NavigationContainer; run the effect on mount instead so
// the focus-driven realtime subscription is exercised.
jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      ReactModule.useEffect(effect, [effect]),
  };
});

// Realtime opens a socket — stub the channel lifecycle, but keep the mocks so the
// test can assert the JWT is synced BEFORE the channel is created (RLS).
const mockSubscribeToUserBookings = jest.fn(() => ({ unsubscribe: jest.fn() }));
const mockUnsubscribeFromBookings = jest.fn();
const mockSyncSupabaseAuthSession = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/lib/supabase', () => ({
  subscribeToUserBookings: (...a: unknown[]) => mockSubscribeToUserBookings(...(a as [])),
  unsubscribeFromBookings: (...a: unknown[]) => mockUnsubscribeFromBookings(...(a as [])),
  syncSupabaseAuthSession: (...a: unknown[]) => mockSyncSupabaseAuthSession(...(a as [])),
}));

// Reminder scheduling is a side effect (dynamically imported); no-op it here.
jest.mock('../../src/lib/notifications', () => ({
  scheduleBookingReminder: jest.fn().mockResolvedValue(undefined),
  cancelBookingReminder: jest.fn().mockResolvedValue(undefined),
}));

// Keep the user id + tokens stable so the realtime effect path is deterministic.
const mockAuthState = {
  user: { id: 'u1' },
  token: 'access-token',
  refreshToken: 'refresh-token',
};
jest.mock('../../src/store/authStore', () => {
  const useAuthStore = (selector: (s: any) => unknown) => selector(mockAuthState);
  useAuthStore.getState = () => mockAuthState;
  return { useAuthStore };
});

// Replace heavy children with trivial stand-ins exposing testIDs / labels.
jest.mock('../../src/components/BookingCard', () => {
  const { Text: T } = require('react-native');
  return {
    BookingCard: ({ booking, onCancel }: any) => (
      <T onPress={onCancel} testID={`booking-${booking.id}`}>
        {booking.id}
      </T>
    ),
  };
});
jest.mock('../../src/components/skeletons/BookingListSkeleton', () => {
  const { Text: T } = require('react-native');
  return { BookingListSkeleton: () => <T testID="skeleton">loading</T> };
});
jest.mock('../../src/components/ErrorState', () => {
  const { Text: T } = require('react-native');
  return {
    ErrorState: ({ message, onRetry }: any) => (
      <T testID="error-state" onPress={onRetry}>
        {message}
      </T>
    ),
  };
});
jest.mock('../../src/components/EmptyState', () => {
  const { Text: T } = require('react-native');
  return { EmptyState: ({ title }: any) => <T testID="empty-state">{title}</T> };
});

// Skeleton min-display timer would otherwise gate rendering — make it pass through.
jest.mock('../../src/hooks/useMinLoadingTime', () => ({
  useMinLoadingTime: (isLoading: boolean) => isLoading,
}));

import { MyBookingsScreen } from '../../src/screens/customer/MyBookingsScreen';

const testQueryClients: QueryClient[] = [];

function renderScreen() {
  const queryClient = createTestQueryClient();
  testQueryClients.push(queryClient);
  const navigation = { navigate: jest.fn() } as any;
  const metrics = initialWindowMetrics ?? {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  };
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MyBookingsScreen
            navigation={navigation}
            route={{ key: 'k', name: 'Bookings' } as any}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
  testQueryClients.splice(0).forEach((client) => client.clear());
});

it('always renders the screen title', async () => {
  mockGetMyBookings.mockResolvedValue([]);
  renderScreen();
  expect(screen.getByText('My Bookings')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
});

it('renders the empty state when there are no bookings', async () => {
  mockGetMyBookings.mockResolvedValue([]);
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
});

it('renders a card per booking once loaded', async () => {
  mockGetMyBookings.mockResolvedValue([
    { id: 'b1', status: 'pending' },
    { id: 'b2', status: 'completed' },
  ]);
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('booking-b1')).toBeTruthy());
  expect(screen.getByTestId('booking-b2')).toBeTruthy();
});

it('syncs the Supabase JWT before opening the realtime channel', async () => {
  mockGetMyBookings.mockResolvedValue([]);
  renderScreen();

  await waitFor(() =>
    expect(mockSubscribeToUserBookings).toHaveBeenCalledWith(
      'u1',
      expect.any(Function),
    ),
  );
  expect(mockSyncSupabaseAuthSession).toHaveBeenCalledWith(
    'access-token',
    'refresh-token',
  );
  expect(mockSyncSupabaseAuthSession.mock.invocationCallOrder[0]).toBeLessThan(
    mockSubscribeToUserBookings.mock.invocationCallOrder[0],
  );
});

it('removes the realtime channel on unmount', async () => {
  mockGetMyBookings.mockResolvedValue([]);
  const { unmount } = renderScreen();
  await waitFor(() => expect(mockSubscribeToUserBookings).toHaveBeenCalled());

  unmount();
  expect(mockUnsubscribeFromBookings).toHaveBeenCalledTimes(1);
});

it('shows the error state with retry when the query fails', async () => {
  mockGetMyBookings.mockRejectedValue(new Error('boom'));
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());

  // Retrying re-invokes the gateway.
  mockGetMyBookings.mockResolvedValue([]);
  fireEvent.press(screen.getByTestId('error-state'));
  await waitFor(() =>
    expect(mockGetMyBookings.mock.calls.length).toBeGreaterThan(1),
  );
});
