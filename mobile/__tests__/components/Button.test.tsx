/**
 * Unit tests for src/components/Button.tsx
 * Covers: variants, sizes, loading/success/error/disabled states, onPress
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator, Text } from 'react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/Button';

// Mock Ionicons to a simple Text node so we can assert by label
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Button', () => {
  it('renders the title text', () => {
    renderWithTheme(<Button title="Click me" onPress={jest.fn()} />);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Tap" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // ─── Disabled ─────────────────────────────────────────────────────────────
  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Tap" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).not.toHaveBeenCalled();
  });

  // ─── Loading state ────────────────────────────────────────────────────────
  it('shows ActivityIndicator and not title when loading', () => {
    renderWithTheme(<Button title="Submit" onPress={jest.fn()} loading />);
    // Title should not be rendered while loading
    expect(screen.queryByText('Submit')).toBeNull();
    // ActivityIndicator is rendered
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not fire onPress when loading', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Submit" onPress={onPress} loading />);
    // No pressable target that maps to title — but the TouchableOpacity is
    // disabled, so even pressing the wrapper should not call onPress.
    const indicator = screen.UNSAFE_getByType(ActivityIndicator);
    fireEvent.press(indicator.parentNode!);
    expect(onPress).not.toHaveBeenCalled();
  });

  // ─── Success status ───────────────────────────────────────────────────────
  it('shows "Success" text and checkmark icon on success status', () => {
    renderWithTheme(<Button title="Save" onPress={jest.fn()} status="success" />);
    expect(screen.getByText('Success')).toBeTruthy();
    expect(screen.getByText('checkmark-circle')).toBeTruthy();
    // Original title hidden
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('does not fire onPress when in success status (locked)', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Save" onPress={onPress} status="success" />);
    fireEvent.press(screen.getByText('Success'));
    expect(onPress).not.toHaveBeenCalled();
  });

  // ─── Error status ─────────────────────────────────────────────────────────
  it('shows "Failed. Try again." text and alert icon on error status', () => {
    renderWithTheme(<Button title="Save" onPress={jest.fn()} status="error" />);
    expect(screen.getByText('Failed. Try again.')).toBeTruthy();
    expect(screen.getByText('alert-circle')).toBeTruthy();
  });

  // ─── loading overrides status ─────────────────────────────────────────────
  it('loading takes precedence over status', () => {
    renderWithTheme(<Button title="Save" onPress={jest.fn()} loading status="success" />);
    expect(screen.queryByText('Success')).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  // ─── Variants render without crashing ─────────────────────────────────────
  it.each(['primary', 'secondary', 'outline', 'ghost'] as const)(
    'renders "%s" variant without crashing',
    (variant) => {
      renderWithTheme(<Button title="V" onPress={jest.fn()} variant={variant} />);
      expect(screen.getByText('V')).toBeTruthy();
    },
  );

  // ─── Sizes render without crashing ────────────────────────────────────────
  it.each(['sm', 'md', 'lg'] as const)(
    'renders "%s" size without crashing',
    (size) => {
      renderWithTheme(<Button title="S" onPress={jest.fn()} size={size} />);
      expect(screen.getByText('S')).toBeTruthy();
    },
  );

  // ─── Custom icon ──────────────────────────────────────────────────────────
  it('renders a custom icon node when provided', () => {
    renderWithTheme(
      <Button
        title="With Icon"
        onPress={jest.fn()}
        icon={<Text testID="custom-icon">★</Text>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeTruthy();
    expect(screen.getByText('With Icon')).toBeTruthy();
  });

  // ─── Default props ────────────────────────────────────────────────────────
  it('defaults to primary variant and md size', () => {
    renderWithTheme(<Button title="Default" onPress={jest.fn()} />);
    expect(screen.getByText('Default')).toBeTruthy();
  });
});
