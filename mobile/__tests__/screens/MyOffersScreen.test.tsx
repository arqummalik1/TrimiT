/**
 * Render/behavior tests for MyOffersScreen.
 *
 * The screen previously had no error branch and a bare text empty state, so
 * these tests pin the three states it now has to render: skeleton while
 * loading, ErrorState + retry on failure, and an EmptyState with a CTA when
 * the customer has no grants yet.
 */

import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { createTestQueryClient } from '../../testUtils/createTestQueryClient';

const mockGetMyGrants = jest.fn();

jest.mock('../../src/repositories/promotionRepository', () => ({
  promotionRepository: {
    getMyGrants: (...a: unknown[]) => mockGetMyGrants(...a),
  },
}));

jest.mock('../../src/lib/errorHandler', () => ({
  handleApiError: (err: any) => ({ kind: 'network', message: err?.message ?? 'error' }),
}));

const mockResetToCustomerDiscover = jest.fn();
jest.mock('../../src/lib/navigationHelpers', () => ({
  resetToCustomerDiscover: (...a: unknown[]) => mockResetToCustomerDiscover(...a),
}));

jest.mock('../../src/components/skeletons/OfferListSkeleton', () => {
  const { Text: T } = require('react-native');
  return { OfferListSkeleton: () => <T testID="skeleton">loading</T> };
});
jest.mock('../../src/components/ErrorState', () => {
  const { Text: T } = require('react-native');
  return {
    ErrorState: ({ title, onRetry }: any) => (
      <T testID="error-state" onPress={onRetry}>
        {title}
      </T>
    ),
  };
});
jest.mock('../../src/components/EmptyState', () => {
  const { Text: T } = require('react-native');
  return {
    EmptyState: ({ title, action }: any) => (
      <T testID="empty-state" onPress={action?.onPress}>
        {`${title}|${action?.label ?? ''}`}
      </T>
    ),
  };
});

// The min-display timer would otherwise hold the skeleton past waitFor.
jest.mock('../../src/hooks/useMinLoadingTime', () => ({
  useMinLoadingTime: (isLoading: boolean) => isLoading,
}));

import MyOffersScreen from '../../src/screens/customer/MyOffersScreen';

const goBack = jest.fn();
const testQueryClients: QueryClient[] = [];

function renderScreen() {
  const queryClient = createTestQueryClient();
  testQueryClients.push(queryClient);
  const navigation = { goBack, navigate: jest.fn(), getParent: () => null } as any;
  const metrics = initialWindowMetrics ?? {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  };
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MyOffersScreen
            navigation={navigation}
            route={{ key: 'k', name: 'MyOffers' } as any}
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

const grant = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  code: 'TRIMIT50',
  campaign_name: 'Welcome offer',
  discount_type: 'flat',
  discount_value: 50,
  min_order_value: 149,
  expires_at: '2099-01-01T00:00:00Z',
  redeemed_at: null,
  ...over,
});

it('shows the header on every state', async () => {
  mockGetMyGrants.mockResolvedValue([]);
  renderScreen();
  expect(screen.getByText('My offers')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
});

it('uses one fixed-height header below the ScreenWrapper safe area', async () => {
  mockGetMyGrants.mockResolvedValue([]);
  renderScreen();

  const headerStyle = StyleSheet.flatten(screen.getByTestId('my-offers-header').props.style);
  expect(headerStyle.minHeight).toBe(54);
  expect(headerStyle.paddingTop).toBeUndefined();
  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
});

it('shows a skeleton instead of a bare spinner while loading', () => {
  mockGetMyGrants.mockReturnValue(new Promise(() => {}));
  renderScreen();
  expect(screen.getByTestId('skeleton')).toBeTruthy();
});

it('renders a card per grant once loaded', async () => {
  mockGetMyGrants.mockResolvedValue([
    grant({ id: 'g1', code: 'TRIMIT50' }),
    grant({ id: 'g2', code: 'CUT20', discount_type: 'percent', discount_value: 20 }),
  ]);
  renderScreen();

  await waitFor(() => expect(screen.getByText('TRIMIT50')).toBeTruthy());
  expect(screen.getByText('CUT20')).toBeTruthy();
  expect(screen.getByText('20%')).toBeTruthy();
});

it('marks an unexpired, unredeemed grant as Active', async () => {
  mockGetMyGrants.mockResolvedValue([grant()]);
  renderScreen();
  await waitFor(() => expect(screen.getByText('Active')).toBeTruthy());
});

it('does not mark a redeemed grant as Active', async () => {
  mockGetMyGrants.mockResolvedValue([
    grant({ redeemed_at: '2024-01-01T00:00:00Z' }),
  ]);
  renderScreen();

  await waitFor(() => expect(screen.getByText('TRIMIT50')).toBeTruthy());
  expect(screen.queryByText('Active')).toBeNull();
});

it('teaches the empty state with a CTA instead of a dead-end line', async () => {
  mockGetMyGrants.mockResolvedValue([]);
  renderScreen();

  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
  expect(screen.getByTestId('empty-state').props.children).toBe(
    'No offers yet|Explore salons',
  );
});

it('sends the customer to Discover from the empty-state CTA', async () => {
  mockGetMyGrants.mockResolvedValue([]);
  renderScreen();

  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
  fireEvent.press(screen.getByTestId('empty-state'));
  expect(mockResetToCustomerDiscover).toHaveBeenCalledTimes(1);
});

it('shows an error state when the grants query fails', async () => {
  mockGetMyGrants.mockRejectedValue(new Error('offline'));
  renderScreen();

  await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());
  expect(screen.queryByTestId('empty-state')).toBeNull();
});

it('refetches from the error state retry', async () => {
  mockGetMyGrants.mockRejectedValue(new Error('offline'));
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('error-state')).toBeTruthy());

  mockGetMyGrants.mockResolvedValue([grant()]);
  fireEvent.press(screen.getByTestId('error-state'));
  await waitFor(() => expect(screen.getByText('TRIMIT50')).toBeTruthy());
});

it('goes back from the header button', async () => {
  mockGetMyGrants.mockResolvedValue([]);
  renderScreen();

  fireEvent.press(screen.getByTestId('header-back-button'));
  expect(goBack).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
});
