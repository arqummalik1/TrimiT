import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ResetPasswordScreen from '../../src/screens/auth/ResetPasswordScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';

const mockPost = jest.fn();
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();

jest.mock('../../src/lib/api', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('../../src/store/toastStore', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockNavigate.mockReset();
    mockShowToast.mockReset();
    mockPost.mockResolvedValue({ data: { status: 'ok' } });
  });

  it('POSTs /auth/reset-password with password (canonical field)', async () => {
    const navigation = { navigate: mockNavigate, goBack: jest.fn() } as any;
    const route = { params: { token: 'recovery-token' } } as any;

    const { getByText, getAllByPlaceholderText } = render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <ResetPasswordScreen navigation={navigation} route={route} />
        </ThemeProvider>
      </SafeAreaProvider>
    );

    const fields = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(fields[0], 'secret12');
    fireEvent.changeText(fields[1], 'secret12');
    fireEvent.press(getByText('Save New Password'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'recovery-token',
        password: 'secret12',
      });
    });
    expect(mockShowToast).toHaveBeenCalledWith('Password updated successfully', 'success');
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
