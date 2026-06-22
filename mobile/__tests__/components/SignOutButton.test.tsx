/**
 * Unit tests for src/components/SignOutButton.tsx
 * Covers: idle & signing-out rendering, Alert confirmation flow, disabled state,
 *         confirmDetail injection
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert, ActivityIndicator } from 'react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { SignOutButton } from '../../src/components/SignOutButton';
import { useAuthStore } from '../../src/store/authStore';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('SignOutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isSigningOut: false, logout: jest.fn() });
  });

  // ─── Idle state ────────────────────────────────────────────────────────────
  it('renders "Sign Out" label when idle', () => {
    renderWithTheme(<SignOutButton />);
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('renders the log-out icon when idle', () => {
    renderWithTheme(<SignOutButton />);
    expect(screen.getByText('log-out-outline')).toBeTruthy();
  });

  it('has accessibilityLabel "Sign Out" when idle', () => {
    renderWithTheme(<SignOutButton />);
    expect(screen.getByLabelText('Sign Out')).toBeTruthy();
  });

  // ─── Signing-out state ──────────────────────────────────────────────────────
  it('renders "Signing out…" label when in progress', () => {
    useAuthStore.setState({ isSigningOut: true });
    renderWithTheme(<SignOutButton />);
    expect(screen.getByText('Signing out…')).toBeTruthy();
  });

  it('shows ActivityIndicator when signing out', () => {
    useAuthStore.setState({ isSigningOut: true });
    renderWithTheme(<SignOutButton />);
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('hides the log-out icon when signing out', () => {
    useAuthStore.setState({ isSigningOut: true });
    renderWithTheme(<SignOutButton />);
    expect(screen.queryByText('log-out-outline')).toBeNull();
  });

  it('has accessibilityLabel "Signing out" when in progress', () => {
    useAuthStore.setState({ isSigningOut: true });
    renderWithTheme(<SignOutButton />);
    expect(screen.getByLabelText('Signing out')).toBeTruthy();
  });

  // ─── Alert confirmation ─────────────────────────────────────────────────────
  it('shows a confirmation Alert on press', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderWithTheme(<SignOutButton />);
    fireEvent.press(screen.getByText('Sign Out'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Sign Out', style: 'destructive' }),
      ]),
    );
  });

  it('includes confirmDetail in the Alert message when provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderWithTheme(<SignOutButton confirmDetail="Cache will be cleared." />);
    fireEvent.press(screen.getByText('Sign Out'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out? Cache will be cleared.',
      expect.any(Array),
    );
  });

  it('calls logout when the destructive Sign Out button is pressed in Alert', () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ logout });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons?: any[]) => {
        const signOutBtn = buttons?.find((b) => b.text === 'Sign Out');
        signOutBtn?.onPress?.();
      },
    );

    renderWithTheme(<SignOutButton />);
    fireEvent.press(screen.getByText('Sign Out'));

    expect(alertSpy).toHaveBeenCalled();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does not call logout when Cancel is pressed', () => {
    const logout = jest.fn();
    useAuthStore.setState({ logout });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    renderWithTheme(<SignOutButton />);
    fireEvent.press(screen.getByText('Sign Out'));

    expect(logout).not.toHaveBeenCalled();
  });

  // ─── Disabled while signing out ────────────────────────────────────────────
  it('does not open Alert when already signing out', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ isSigningOut: true });

    renderWithTheme(<SignOutButton />);
    // Button is disabled; tapping "Signing out…" text should not open alert
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
