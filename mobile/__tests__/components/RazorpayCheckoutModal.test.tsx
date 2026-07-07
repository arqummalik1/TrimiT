import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { RazorpayCheckoutModal } from '../../src/components/RazorpayCheckoutModal';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const order = {
  subscription_id: 'sub_1',
  key_id: 'rzp_key',
  plan_id: 'plan_1',
  amount: 29900,
  currency: 'INR',
};

function renderModal(verifying = false) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <RazorpayCheckoutModal
          visible
          order={order}
          verifying={verifying}
          onSuccess={jest.fn()}
          onDismiss={jest.fn()}
          onError={jest.fn()}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('RazorpayCheckoutModal', () => {
  it('shows secure checkout header while payment is in progress', () => {
    renderModal(false);
    expect(screen.getByText('Secure checkout')).toBeTruthy();
  });

  it('locks navigation and shows verifying copy after payment succeeds', () => {
    renderModal(true);
    expect(screen.getByText('Confirming payment')).toBeTruthy();
    expect(screen.getByText(/don't go back/i)).toBeTruthy();
    expect(screen.queryByLabelText('Close checkout')).toBeNull();
  });
});
