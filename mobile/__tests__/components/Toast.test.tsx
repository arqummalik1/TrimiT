/**
 * Unit tests for src/components/Toast.tsx
 * Covers: visibility, message rendering, type-based icon mapping, auto-dismiss,
 *         tap-to-dismiss, queue promotion
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import Toast from '../../src/components/Toast';
import { useToastStore, showToast, clearAllToasts } from '../../src/store/toastStore';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text testID={`icon-${name}`}>{name}</Text>,
  };
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider
      initialSafeAreaInsets={{ top: 47, bottom: 34, left: 0, right: 0 }}
    >
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );

describe('Toast', () => {
  beforeEach(() => {
    clearAllToasts();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      clearAllToasts();
    });
    jest.useRealTimers();
  });

  it('renders nothing when no current toast exists', () => {
    renderWithProviders(<Toast />);
    expect(screen.queryByText('Hello')).toBeNull();
  });

  it('renders the toast message when one is shown', () => {
    showToast('Saved successfully', 'success');
    renderWithProviders(<Toast />);
    expect(screen.getByText('Saved successfully')).toBeTruthy();
  });

  // ─── Type → icon mapping ──────────────────────────────────────────────────
  it('shows checkmark-circle icon for success type', () => {
    showToast('ok', 'success');
    renderWithProviders(<Toast />);
    expect(screen.getByTestId('icon-checkmark-circle')).toBeTruthy();
  });

  it('shows close-circle icon for error type', () => {
    showToast('bad', 'error');
    renderWithProviders(<Toast />);
    expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
  });

  it('shows warning icon for warning type', () => {
    showToast('careful', 'warning');
    renderWithProviders(<Toast />);
    expect(screen.getByTestId('icon-warning')).toBeTruthy();
  });

  it('shows information-circle icon for info type', () => {
    showToast('note', 'info');
    renderWithProviders(<Toast />);
    expect(screen.getByTestId('icon-information-circle')).toBeTruthy();
  });

  it('defaults to info icon when type not specified', () => {
    showToast('default');
    renderWithProviders(<Toast />);
    expect(screen.getByTestId('icon-information-circle')).toBeTruthy();
  });

  // ─── Auto-dismiss ──────────────────────────────────────────────────────────
  it('auto-dismisses after AUTO_DISMISS_MS (3000ms)', () => {
    showToast('temporary');
    renderWithProviders(<Toast />);

    act(() => {
      jest.advanceTimersByTime(2999);
    });
    // Still visible right before the timeout
    expect(useToastStore.getState().current).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    // The animation fires; once finished, dismiss() is called.
    // advance past the 200ms hide animation
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(useToastStore.getState().current).toBeNull();
  });

  // ─── Tap to dismiss ────────────────────────────────────────────────────────
  it('dismisses on tap', () => {
    showToast('tap me');
    renderWithProviders(<Toast />);

    fireEvent.press(screen.getByText('tap me'));

    act(() => {
      jest.advanceTimersByTime(300); // past hide animation
    });

    expect(useToastStore.getState().current).toBeNull();
  });

  // ─── Queue promotion ───────────────────────────────────────────────────────
  it('promotes the next queued toast after current is dismissed', () => {
    showToast('first');
    showToast('second');

    renderWithProviders(<Toast />);
    expect(screen.getByText('first')).toBeTruthy();

    // Dismiss the first
    fireEvent.press(screen.getByText('first'));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Second should now be visible
    expect(useToastStore.getState().current?.message).toBe('second');
  });

  // ─── New toast replaces rendered content ──────────────────────────────────
  it('updates rendered message when current toast changes', () => {
    showToast('first');
    showToast('second');
    const { rerender } = renderWithProviders(<Toast />);
    expect(screen.getByText('first')).toBeTruthy();

    // Dismiss first and show second
    fireEvent.press(screen.getByText('first'));
    act(() => {
      jest.advanceTimersByTime(300);
    });
    // second was queued, now current
    rerender(
      <SafeAreaProvider
        initialSafeAreaInsets={{ top: 47, bottom: 34, left: 0, right: 0 }}
      >
        <ThemeProvider>
          <Toast />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('second')).toBeTruthy();
  });
});
