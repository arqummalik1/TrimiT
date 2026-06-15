/**
 * LoginScreen — extended behavior coverage (complements LoginScreen.test.tsx).
 *
 * Covers: loading-disabled inputs, inline authError banner, password-mode login
 * success + failure (items 3,4 from the UI side), resend-confirmation row, and
 * the optimistic-navigation OTP send-FAILURE path (item 6). authStore + toast
 * are mocked at the module boundary.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';

const mockSendOtp = jest.fn();
const mockLogin = jest.fn();
const mockClearError = jest.fn();
const mockResendConfirmation = jest.fn();
const mockShowToast = jest.fn();

const mockStore = {
  login: mockLogin,
  sendOtp: mockSendOtp,
  resendConfirmation: mockResendConfirmation,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
  requiresEmailConfirmation: false,
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

function renderScreen(navigation: any) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <LoginScreen navigation={navigation} route={{ key: 'k', name: 'Login' } as any} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const nav = () => ({
  navigate: jest.fn(),
  getState: jest.fn(() => ({ routes: [{ name: 'VerifyOtp' }] })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.error = null;
  mockStore.isLoading = false;
  mockStore.requiresEmailConfirmation = false;
  mockSendOtp.mockResolvedValue({ success: true });
  mockLogin.mockResolvedValue({ success: true });
  mockResendConfirmation.mockResolvedValue({ success: true });
});

describe('LoginScreen — loading state', () => {
  it('disables the email input while loading', () => {
    mockStore.isLoading = true;
    renderScreen(nav());
    expect(screen.getByPlaceholderText('you@example.com')).toBeDisabled();
  });
});

describe('LoginScreen — inline API error banner', () => {
  it('renders the stored authError as an inline banner', () => {
    mockStore.error = 'The email address or password you entered is incorrect.';
    renderScreen(nav());
    expect(
      screen.getByText('The email address or password you entered is incorrect.')
    ).toBeTruthy();
  });
});

describe('LoginScreen — password login (items 3, 4)', () => {
  it('calls login with trimmed email + password on submit', async () => {
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.press(screen.getByText('Sign in with Email and Password'));
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '  user@example.com  ');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'secret1');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret1');
  });

  it('shows a generic toast when login fails without a stored error', async () => {
    mockLogin.mockResolvedValue({ success: false });
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.press(screen.getByText('Sign in with Email and Password'));
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'secret1');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Sign in failed. Please try again.', 'error');
  });

  it('does NOT toast when login fails WITH a stored error (shown inline instead)', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'bad creds' });
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.press(screen.getByText('Sign in with Email and Password'));
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'secret1');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('blocks login and shows field errors for a too-short password', async () => {
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.press(screen.getByText('Sign in with Email and Password'));
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), '123');

    fireEvent.press(screen.getByText('Sign In'));

    expect(screen.getByText('Password must be at least 6 characters.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('LoginScreen — resend confirmation row', () => {
  it('shows the resend row when requiresEmailConfirmation is true and resends', async () => {
    mockStore.requiresEmailConfirmation = true;
    mockResendConfirmation.mockResolvedValue({ success: true, accountReadyForLogin: false });
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    const resendRow = screen.getByText('Resend confirmation email');
    await act(async () => {
      fireEvent.press(resendRow);
    });

    expect(mockResendConfirmation).toHaveBeenCalledWith('user@example.com');
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Confirmation email sent — check your inbox',
        'success'
      );
    });
  });

  it('toasts the ready-to-sign-in message when the account is already active', async () => {
    mockStore.requiresEmailConfirmation = true;
    mockResendConfirmation.mockResolvedValue({ success: true, accountReadyForLogin: true });
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await act(async () => {
      fireEvent.press(screen.getByText('Resend confirmation email'));
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Account is ready — you can sign in now',
        'success'
      );
    });
  });
});

describe('LoginScreen — OTP send failure path (item 6)', () => {
  it('re-navigates with otpSendResult=error when the background send fails', async () => {
    mockSendOtp.mockResolvedValue({ success: false, error: 'send failed' });
    const navigation = nav();
    renderScreen(navigation);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await act(async () => {
      fireEvent.press(screen.getByText('Send Verification Code'));
    });

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith({
        name: 'VerifyOtp',
        params: {
          email: 'user@example.com',
          type: 'magiclink',
          isPending: false,
          otpSendResult: 'error',
        },
        merge: true,
      });
    });
  });

  it('does NOT re-navigate if the user left the OTP flow before send resolved', async () => {
    const navigation = {
      navigate: jest.fn(),
      getState: jest.fn(() => ({ routes: [{ name: 'Login' }] })),
    };
    renderScreen(navigation);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await act(async () => {
      fireEvent.press(screen.getByText('Send Verification Code'));
    });

    // First navigate (optimistic) happened; the merge re-navigation must NOT.
    await waitFor(() => expect(mockSendOtp).toHaveBeenCalled());
    const mergeCalls = navigation.navigate.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'object' && c[0]?.merge === true
    );
    expect(mergeCalls).toHaveLength(0);
  });
});
