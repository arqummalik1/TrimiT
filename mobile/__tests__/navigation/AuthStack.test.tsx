import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-navigation/native-stack', () => {
  const ReactActual = require('react');
  const { Text: NativeText } = require('react-native');
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  return {
    createNativeStackNavigator: () => ({
      Navigator: () => {
        const insets = useSafeAreaInsets();
        return ReactActual.createElement(NativeText, { testID: 'auth-measured-top' }, String(insets.top));
      },
      Screen: () => null,
    }),
  };
});

jest.mock('../../src/screens/auth/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('../../src/screens/auth/ForgotPasswordScreen', () => () => null);
jest.mock('../../src/screens/auth/VerifyOtpScreen', () => () => null);
jest.mock('../../src/screens/auth/ResetPasswordScreen', () => () => null);
jest.mock('../../src/screens/legal/PrivacyPolicyScreen', () => () => null);
jest.mock('../../src/screens/legal/TermsScreen', () => () => null);

import AuthStack from '../../src/navigation/AuthStack';

describe('AuthStack safe-area boundary', () => {
  it('owns a full-screen SafeAreaProvider for native modal presentation', () => {
    render(<AuthStack />);

    const boundaryStyle = StyleSheet.flatten(
      screen.getByTestId('auth-modal-safe-area-provider').props.style,
    );
    expect(boundaryStyle.flex).toBe(1);
  });

  it('uses the modal measurement instead of keeping the underlying screen inset', () => {
    const metrics = {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };
    render(<SafeAreaProvider initialMetrics={metrics}><AuthStack /></SafeAreaProvider>);
    expect(screen.getByTestId('auth-measured-top').props.children).toBe('0');

    fireEvent(screen.getByTestId('auth-modal-safe-area-provider'), 'insetsChange', {
      nativeEvent: { ...metrics, insets: { ...metrics.insets, top: 47, bottom: 34 } },
    });
    expect(screen.getByTestId('auth-measured-top').props.children).toBe('47');

    // A new window geometry must be accepted too, not frozen to launch metrics.
    fireEvent(screen.getByTestId('auth-modal-safe-area-provider'), 'insetsChange', {
      nativeEvent: { ...metrics, insets: { ...metrics.insets, top: 24 } },
    });
    expect(screen.getByTestId('auth-measured-top').props.children).toBe('24');
  });
});
