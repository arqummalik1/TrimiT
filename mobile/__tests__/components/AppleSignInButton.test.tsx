import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppleSignInButton } from '../../src/components/AppleSignInButton';

const mockAppleSignIn = jest.fn();
const mockIsAvailable = jest.fn();

jest.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector: (s: { appleSignIn: typeof mockAppleSignIn }) => unknown) =>
    selector({ appleSignIn: mockAppleSignIn }),
}));

jest.mock('../../src/store/toastStore', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../src/config/auth', () => ({
  isAppleLoginVisible: () => true,
}));

jest.mock('../../src/services/appleAuthService', () => ({
  isAppleSignInAvailable: (...a: unknown[]) => mockIsAvailable(...a),
}));

jest.mock('expo-apple-authentication', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => (
      <TouchableOpacity testID="native-apple-btn" onPress={onPress}>
        <Text>Sign in with Apple</Text>
      </TouchableOpacity>
    ),
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { BLACK: 0 },
  };
});

describe('AppleSignInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable.mockResolvedValue(true);
  });

  it('renders when Apple is available and calls appleSignIn', async () => {
    mockAppleSignIn.mockResolvedValue({ success: true });
    const { getByTestId, findByTestId } = render(<AppleSignInButton />);
    await findByTestId('apple-signin');
    await act(async () => {
      fireEvent.press(getByTestId('native-apple-btn'));
    });
    await waitFor(() => {
      expect(mockAppleSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it('hides when device does not support Apple sign-in', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { queryByTestId } = render(<AppleSignInButton />);
    await waitFor(() => {
      expect(queryByTestId('apple-signin')).toBeNull();
    });
  });
});
