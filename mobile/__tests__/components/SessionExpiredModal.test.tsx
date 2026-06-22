/**
 * Unit tests for src/components/SessionExpiredModal.tsx
 * Covers: visibility bound to authStore.sessionExpired, dismiss action,
 *         title/message text, Sign In button
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SessionExpiredModal } from '../../src/components/SessionExpiredModal';
import { useAuthStore } from '../../src/store/authStore';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('SessionExpiredModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ sessionExpired: false });
  });

  it('is hidden when sessionExpired is false', () => {
    renderWithTheme(<SessionExpiredModal />);
    expect(screen.queryByText('Session expired')).toBeNull();
  });

  it('is visible when sessionExpired is true', () => {
    useAuthStore.setState({ sessionExpired: true });
    renderWithTheme(<SessionExpiredModal />);
    expect(screen.getByText('Session expired')).toBeTruthy();
  });

  it('renders the explanation message', () => {
    useAuthStore.setState({ sessionExpired: true });
    renderWithTheme(<SessionExpiredModal />);
    expect(
      screen.getByText('Your session has expired. Please sign in again to continue.'),
    ).toBeTruthy();
  });

  it('renders the time-outline icon', () => {
    useAuthStore.setState({ sessionExpired: true });
    renderWithTheme(<SessionExpiredModal />);
    expect(screen.getByText('time-outline')).toBeTruthy();
  });

  it('renders the "Sign In" button', () => {
    useAuthStore.setState({ sessionExpired: true });
    renderWithTheme(<SessionExpiredModal />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('calls dismissSessionExpired when "Sign In" tapped', () => {
    const dismiss = jest.fn();
    useAuthStore.setState({ sessionExpired: true, dismissSessionExpired: dismiss });
    renderWithTheme(<SessionExpiredModal />);
    fireEvent.press(screen.getByText('Sign In'));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label on the button', () => {
    useAuthStore.setState({ sessionExpired: true });
    renderWithTheme(<SessionExpiredModal />);
    const btn = screen.getByLabelText('Sign in again');
    expect(btn).toBeTruthy();
  });
});
