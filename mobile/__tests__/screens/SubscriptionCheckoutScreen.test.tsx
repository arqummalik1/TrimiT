import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import SubscriptionCheckoutScreen from '../../src/screens/owner/SubscriptionCheckoutScreen';

const mockCreateMutate = jest.fn();
const mockVerifyMutate = jest.fn();

jest.mock('../../src/hooks/useSubscription', () => ({
  useCreateSubscription: () => ({ mutate: mockCreateMutate, isPending: false }),
  useVerifySubscription: () => ({ mutate: mockVerifyMutate, isPending: false }),
}));

jest.mock('../../src/store/authStore', () => {
  const store = { user: { name: 'Owner', email: 'o@x.com', phone: '9876543210' } };
  const useAuthStore = (selector?: (s: any) => any) =>
    typeof selector === 'function' ? selector(store) : store;
  (useAuthStore as any).getState = () => store;
  return { useAuthStore };
});

jest.mock('../../src/store/toastStore', () => ({ showToast: jest.fn() }));

// Render the checkout modal as nothing so it can't interfere.
jest.mock('../../src/components/RazorpayCheckoutModal', () => () => null);

// Treat the test error object as a structured AppError so the screen reads its
// status/code directly (instead of routing through handleApiError).
jest.mock('../../src/types/error', () => ({
  ...jest.requireActual('../../src/types/error'),
  isAppError: () => true,
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen() {
  const navigation = { goBack: jest.fn() } as never;
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <SubscriptionCheckoutScreen navigation={navigation} route={{ params: {} } as never} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('SubscriptionCheckoutScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the TrimiT Pro plan and the subscribe CTA', () => {
    renderScreen();
    expect(screen.getByText('Subscribe ₹299/month')).toBeTruthy();
    expect(screen.getAllByText('TrimiT Pro').length).toBeGreaterThan(0);
  });

  it('shows a friendly "coming soon" message when the gateway is unavailable (503)', async () => {
    // Simulate the backend 503 SUBSCRIPTION_GATEWAY_UNAVAILABLE path.
    mockCreateMutate.mockImplementation((_arg, opts) => {
      opts.onError({ status: 503, code: 'SUBSCRIPTION_GATEWAY_UNAVAILABLE', message: 'x' });
    });

    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByText('Subscribe ₹299/month'));
    });

    await waitFor(() => {
      expect(screen.getByText(/coming soon/i)).toBeTruthy();
      expect(screen.getByText(/contact TrimiT/i)).toBeTruthy();
    });
  });

  it('opens checkout (no error message) on a launchable order', async () => {
    mockCreateMutate.mockImplementation((_arg, opts) => {
      opts.onSuccess({ subscription_id: 'sub_1', key_id: 'rzp_key', plan_id: 'p', amount: 29900, currency: 'INR' });
    });

    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByText('Subscribe ₹299/month'));
    });

    expect(mockCreateMutate).toHaveBeenCalled();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });
});
