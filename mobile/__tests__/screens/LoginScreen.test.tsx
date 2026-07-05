import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';

const mockSendOtp = jest.fn();
const mockLogin = jest.fn();
const mockClearError = jest.fn();
const mockResendConfirmation = jest.fn();

const mockStore = {
  login: mockLogin,
  sendOtp: mockSendOtp,
  resendConfirmation: mockResendConfirmation,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
  requiresEmailConfirmation: false,
  isAuthenticated: false,
  profileComplete: false,
  user: null as any,
  isOnboardingCompleted: true,
};

jest.mock('../../src/config/auth', () => ({
  isGoogleLoginVisible: () => true,
}));

jest.mock('../../src/store/authStore', () => {
  const useAuthStoreMock = (selector?: (s: any) => any) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  };
  (useAuthStoreMock as any).getState = () => mockStore;
  return {
    useAuthStore: useAuthStoreMock,
  };
});

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

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.error = null;
    mockStore.isLoading = false;
    mockStore.requiresEmailConfirmation = false;
    mockSendOtp.mockResolvedValue({ success: true });
    mockLogin.mockResolvedValue({ success: true });
  });

  it('renders in OTP mode by default', () => {
    const navigation = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })) } as any;
    renderScreen(navigation);

    expect(screen.getByText('Sign In with OTP')).toBeTruthy();
    expect(screen.getByText('Send Verification Code')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.queryByPlaceholderText('••••••••')).toBeNull(); // No password field in OTP mode
  });

  it('validates email on Send OTP submit', async () => {
    const navigation = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })) } as any;
    renderScreen(navigation);

    const submitBtn = screen.getByText('Send Verification Code');
    fireEvent.press(submitBtn);

    expect(screen.getByText('Email is required to sign in with OTP.')).toBeTruthy();

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(submitBtn);

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  });

  it('optimistically navigates to VerifyOtp and calls sendOtp in background', async () => {
    const navigation = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [{ name: 'VerifyOtp' }] })) } as any;
    renderScreen(navigation);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.changeText(emailInput, 'test@example.com');

    const submitBtn = screen.getByText('Send Verification Code');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    // Verify optimistic navigation with isPending: true
    expect(navigation.navigate).toHaveBeenCalledWith('VerifyOtp', {
      email: 'test@example.com',
      type: 'magiclink',
      isPending: true,
    });

    // Verify sendOtp called with normalized email
    expect(mockSendOtp).toHaveBeenCalledWith('test@example.com');

    // Verify updating navigation state after background OTP send completes
    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith({
        name: 'VerifyOtp',
        params: {
          email: 'test@example.com',
          type: 'magiclink',
          isPending: false,
          otpSendResult: 'success',
        },
        merge: true,
      });
    });
  });

  it('renders Google sign-in when enabled', () => {
    const navigation = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })) } as any;
    renderScreen(navigation);
    expect(screen.getByTestId('google-signin')).toBeTruthy();
    expect(screen.getByText('Sign in with Google')).toBeTruthy();
  });

  it('toggles to password mode and validates password', () => {
    const navigation = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })) } as any;
    renderScreen(navigation);

    const toggleBtn = screen.getByText('Sign in with Email and Password');
    fireEvent.press(toggleBtn);

    expect(screen.getByText('Welcome Back')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy(); // Password field visible now

    // Click submit with empty fields
    const submitBtn = screen.getByText('Sign In');
    fireEvent.press(submitBtn);

    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
  });
});
