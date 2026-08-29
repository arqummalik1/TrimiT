import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GoogleSignInButton } from '../../src/components/GoogleSignInButton';

const mockGoogleSignIn = jest.fn();

jest.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector: (s: { googleSignIn: typeof mockGoogleSignIn }) => unknown) =>
    selector({ googleSignIn: mockGoogleSignIn }),
}));

jest.mock('../../src/store/toastStore', () => ({
  showToast: jest.fn(),
}));

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders multicolor Google mark and default label', () => {
    const { getByTestId, getByText } = render(<GoogleSignInButton />);
    expect(getByTestId('google-signin')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('uses the requested clean white treatment without a border or shadow', () => {
    const { getByTestId } = render(<GoogleSignInButton />);
    const style = StyleSheet.flatten(getByTestId('google-signin').props.style);
    expect(style.backgroundColor).toBe('#FFFFFF');
    expect(style.borderWidth).toBe(0);
    expect(style.shadowOpacity).toBe(0);
    expect(style.elevation).toBe(0);
  });

  it('calls googleSignIn on press', async () => {
    mockGoogleSignIn.mockResolvedValue({ success: true });
    const { getByTestId } = render(<GoogleSignInButton label="Sign up with Google" />);
    fireEvent.press(getByTestId('google-signin'));
    await waitFor(() => {
      expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
    });
  });
});
