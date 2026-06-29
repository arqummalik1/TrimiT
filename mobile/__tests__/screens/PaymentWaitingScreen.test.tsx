import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import PaymentWaitingScreen from '../../src/screens/customer/PaymentWaitingScreen';

const mockUsePaymentStatus = jest.fn();

jest.mock('../../src/hooks/usePayment', () => ({
  usePaymentStatus: (...args: unknown[]) => mockUsePaymentStatus(...args),
  useMarkAwaitingVerification: () => ({ mutate: jest.fn(), isPending: false }),
  useInitiateUpi: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('../../src/services/upiIntentService', () => ({
  upiIntentService: { launchUpiApp: jest.fn().mockResolvedValue({ launched: true }) },
}));

jest.mock('../../src/store/toastStore', () => ({ showToast: jest.fn() }));
jest.mock('../../src/lib/navigationHelpers', () => ({ navigateToCustomerBookings: jest.fn() }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const params = {
  bookingId: 'b1',
  bookingReference: 'TRM-2026-7F3A91',
  salonName: 'Glow Salon',
  serviceName: 'Haircut',
  upiId: 'glow@okaxis',
  payeeName: 'Glow Salon',
  amount: 499,
  intentUri: 'upi://pay?pa=glow%40okaxis',
};

function renderWith(verification?: string, isLoading = false) {
  mockUsePaymentStatus.mockReturnValue({
    data: verification ? { payment_verification_status: verification } : undefined,
    isLoading,
  });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <PaymentWaitingScreen route={{ params } as never} navigation={{} as never} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('PaymentWaitingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the waiting message and NEVER claims payment success', () => {
    renderWith('waiting_verification');
    expect(screen.getByText('Waiting for the salon to verify')).toBeTruthy();
    expect(
      screen.getByText(/We are waiting for the salon to verify your payment/i)
    ).toBeTruthy();
    // Core business rule: never show "Payment Successful".
    expect(screen.queryByText(/Payment Successful/i)).toBeNull();
    // Shows the booking reference so the salon can match the UPI transfer.
    expect(screen.getByText('TRM-2026-7F3A91')).toBeTruthy();
  });

  it('shows confirmed only after the salon verifies', () => {
    renderWith('verified');
    expect(screen.getByText('Booking confirmed')).toBeTruthy();
  });

  it('shows the could-not-verify message on rejection', () => {
    renderWith('rejected');
    expect(
      screen.getByText(/We could not verify your payment\. Please try again or contact the salon/i)
    ).toBeTruthy();
  });

  it('shows the timeout state', () => {
    renderWith('timeout');
    expect(
      screen.getByText(/You may wait, contact the salon, or cancel/i)
    ).toBeTruthy();
  });

  it('shows skeletons (no success) while the first status loads', () => {
    renderWith(undefined, true);
    expect(screen.queryByText(/Payment Successful/i)).toBeNull();
    expect(screen.queryByText('Booking confirmed')).toBeNull();
  });
});
