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
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';

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

// useFocusEffect needs a NavigationContainer; we don't test focus behaviour here.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// Realtime is a side effect we don't exercise here — no-op the channel lifecycle.
jest.mock('../../src/lib/supabase', () => ({
  subscribeToUserBookings: jest.fn(() => ({ unsubscribe: jest.fn() })),
  unsubscribeFromBookings: jest.fn(),
}));

// Reminder scheduling is a side effect (dynamically imported); no-op it here.
jest.mock('../../src/lib/notifications', () => ({
  scheduleBookingReminder: jest.fn().mockResolvedValue(undefined),
  cancelBookingReminder: jest.fn().mockResolvedValue(undefined),
}));

// Keep the user id stable so the realtime effect path is deterministic.
jest.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector: (s: any) => unknown) => selector({ user: { id: 'u1' } }),
}));

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

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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
