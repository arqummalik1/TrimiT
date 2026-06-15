/**
 * VerifyOtpScreen — extended behavior coverage (complements VerifyOtpScreen.test.tsx).
 *
 * Covers: optimistic send-result params (success/error) updating the subtitle,
 * invalid/expired OTP error toast (items 9,10), incomplete-code guard, verify
 * failure toast (item 8), new-vs-returning welcome toast, resend OTP (item 11)
 * via the countdown, and the 15s safety timeout. Uses fake timers for the
 * countdown / timeout paths.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import VerifyOtpScreen from '../../src/screens/auth/VerifyOtpScreen';

const mockVerifyOtp = jest.fn();
const mockSendOtp = jest.fn();
const mockClearError = jest.fn();
const mockShowToast = jest.fn();

const mockStore = {
  verifyOtp: mockVerifyOtp,
  sendOtp: mockSendOtp,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
};

jest.mock('../../src/store/authStore', () => {
  const useAuthStoreMock = (selector?: (s: any) => any) =>
    typeof selector === 'function' ? selector(mockStore) : mockStore;
  (useAuthStoreMock as any).getState = () => mockStore;
  return { useAuthStore: useAuthStoreMock };
});

jest.mock('../../src/store/toastStore', () => ({
  showToast: (...a: unknown[]) => mockShowToast(...a),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(route: any, navigation: any) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <VerifyOtpScreen route={route} navigation={navigation} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const RN = require('react-native');
const inputs = () => screen.UNSAFE_root.findAllByType(RN.TextInput);
const enterCode = async (code: string) => {
  await act(async () => {
    fireEvent.changeText(inputs()[0], code);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.error = null;
  mockStore.isLoading = false;
  mockVerifyOtp.mockResolvedValue({ success: true, session: { user: { id: 'u1' } } });
  mockSendOtp.mockResolvedValue({ success: true });
});

describe('VerifyOtpScreen — optimistic send-result params', () => {
  it('shows "Sending verification code..." while isPending is true', () => {
    const route = { params: { email: 'test@example.com', type: 'magiclink', isPending: true } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });
    expect(screen.getByText('Sending verification code...')).toBeTruthy();
  });

  it('toasts success and reveals the masked email when otpSendResult=success', async () => {
    const route = {
      params: { email: 'test@example.com', type: 'magiclink', isPending: false, otpSendResult: 'success' },
    } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Verification code sent to your email.', 'success');
    });
    expect(screen.getByText(/te\*\*\*@example\.com/)).toBeTruthy();
  });

  it('shows the failure subtitle when otpSendResult=error', async () => {
    const route = {
      params: { email: 'test@example.com', type: 'magiclink', isPending: false, otpSendResult: 'error' },
    } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Unable to send code. Please try resending below.')).toBeTruthy();
    });
  });
});

describe('VerifyOtpScreen — verify failures (items 8, 9, 10)', () => {
  it('toasts the friendly invalid/expired-OTP message on verify failure', async () => {
    mockVerifyOtp.mockResolvedValue({
      success: false,
      error: 'The verification code you entered is invalid or has expired. Please check the code or request a new one.',
    });
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await enterCode('000000');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify & Continue'));
    });

    expect(mockVerifyOtp).toHaveBeenCalledWith('test@example.com', '000000', 'magiclink');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/invalid or has expired/i),
      'error'
    );
  });

  it('falls back to a generic toast when verify fails without an error message', async () => {
    mockVerifyOtp.mockResolvedValue({ success: false });
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await enterCode('123456');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify & Continue'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Verification failed. Please try again.', 'error');
  });

  it('shows a local error and does not call verifyOtp for an incomplete code', async () => {
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    // type a single digit into the first box, then the button is disabled —
    // assert verifyOtp is never reached.
    await enterCode('1');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify & Continue'));
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});

describe('VerifyOtpScreen — welcome toasts (items 7, 18, 19)', () => {
  it('welcomes a new user when session.is_new_user is true', async () => {
    mockVerifyOtp.mockResolvedValue({ success: true, session: { is_new_user: true } });
    const route = { params: { email: 'new@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await enterCode('123456');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify & Continue'));
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      "Welcome to TrimiT! Let's set up your profile.",
      'success'
    );
  });

  it('welcomes a returning user back by profile name', async () => {
    mockVerifyOtp.mockResolvedValue({
      success: true,
      session: { is_new_user: false, profile: { name: 'Alice' } },
    });
    const route = { params: { email: 'alice@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await enterCode('123456');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify & Continue'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Welcome back, Alice!', 'success');
  });

  it('toasts an error when a recovery verification has no token', async () => {
    mockVerifyOtp.mockResolvedValue({ success: true, session: {} });
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const route = { params: { email: 'r@example.com', type: 'recovery' } } as any;
    renderScreen(route, navigation);

    await enterCode('123456');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify & Continue'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Failed to retrieve recovery session.', 'error');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('VerifyOtpScreen — resend OTP (item 11)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows the countdown, then enables and triggers Resend Code', async () => {
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    // Countdown starts at 30s.
    expect(screen.getByText(/Resend code in/)).toBeTruthy();

    // Advance the full countdown to expose the Resend Code button.
    await act(async () => {
      jest.advanceTimersByTime(31000);
    });

    const resendBtn = screen.getByText('Resend Code');
    await act(async () => {
      fireEvent.press(resendBtn);
    });

    expect(mockSendOtp).toHaveBeenCalledWith('test@example.com');
    expect(mockShowToast).toHaveBeenCalledWith('A new code has been sent to your email.', 'success');
  });

  it('toasts an error when the resend fails', async () => {
    mockSendOtp.mockResolvedValue({ success: false, error: 'resend boom' });
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    await act(async () => {
      jest.advanceTimersByTime(31000);
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Resend Code'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('resend boom', 'error');
  });
});

describe('VerifyOtpScreen — 15s safety timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('unblocks the UI with a warning if still pending after 15s', async () => {
    const route = { params: { email: 'test@example.com', type: 'magiclink', isPending: true } } as any;
    renderScreen(route, { goBack: jest.fn(), navigate: jest.fn() });

    expect(screen.getByText('Sending verification code...')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(15001);
    });

    expect(
      screen.getByText(/delivery is taking longer than expected/i)
    ).toBeTruthy();
  });
});
