import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import VerifyOtpScreen from '../../src/screens/auth/VerifyOtpScreen';

const mockVerifyOtp = jest.fn();
const mockSendOtp = jest.fn();
const mockClearError = jest.fn();

const mockStore = {
  verifyOtp: mockVerifyOtp,
  sendOtp: mockSendOtp,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
};

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

function renderScreen(route: any, navigation: any) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <VerifyOtpScreen route={route} navigation={navigation} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('VerifyOtpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.error = null;
    mockStore.isLoading = false;
    mockVerifyOtp.mockResolvedValue({ success: true, session: { user: { id: 'u1' } } });
    mockSendOtp.mockResolvedValue({ success: true });
  });

  it('renders screen with masked email', () => {
    const route = { params: { email: 'john.doe@example.com', type: 'magiclink' } } as any;
    const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
    renderScreen(route, navigation);

    expect(screen.getByText('Enter Verification Code')).toBeTruthy();
    // masked email check (john.doe -> jo***@example.com)
    expect(screen.getByText(/jo\*\*\*@example\.com/)).toBeTruthy();
  });

  it('calls verifyOtp when code is entered and verify button is pressed', async () => {
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
    renderScreen(route, navigation);

    const inputs = screen.UNSAFE_root.findAllByType(require('react-native').TextInput);
    expect(inputs.length).toBe(1);

    // Paste the full 6-digit code into the first input box to trigger the complete code handler atomically
    await act(async () => {
      fireEvent.changeText(inputs[0], '123456');
    });

    const verifyBtn = screen.getByText('Verify & Continue');
    await act(async () => {
      fireEvent.press(verifyBtn);
    });

    expect(mockVerifyOtp).toHaveBeenCalledWith('test@example.com', '123456', 'magiclink');
  });

  it('navigates to ResetPassword if type is recovery', async () => {
    mockVerifyOtp.mockResolvedValue({
      success: true,
      session: { access_token: 'recovery-token' },
    });

    const route = { params: { email: 'test@example.com', type: 'recovery' } } as any;
    const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
    renderScreen(route, navigation);

    const inputs = screen.UNSAFE_root.findAllByType(require('react-native').TextInput);
    await act(async () => {
      fireEvent.changeText(inputs[0], '123456');
    });

    const verifyBtn = screen.getByText('Verify & Continue');
    await act(async () => {
      fireEvent.press(verifyBtn);
    });

    expect(navigation.navigate).toHaveBeenCalledWith('ResetPassword', { token: 'recovery-token' });
  });

  it('disables the verify button if code is incomplete', async () => {
    const route = { params: { email: 'test@example.com', type: 'magiclink' } } as any;
    const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
    renderScreen(route, navigation);

    const inputs = screen.UNSAFE_root.findAllByType(require('react-native').TextInput);
    await act(async () => {
      fireEvent.changeText(inputs[0], '1');
    });

    const verifyBtn = screen.getByText('Verify & Continue');
    // Verify that the button is disabled and pressing it does not call verifyOtp
    expect(verifyBtn).toBeDisabled();

    await act(async () => {
      fireEvent.press(verifyBtn);
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
