/**
 * Unit tests for src/components/ErrorState.tsx
 * Covers: 3 variants (fullscreen, card, inline), default props,
 *         error-kind → icon mapping, retry callback
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorState } from '../../src/components/ErrorState';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

describe('ErrorState', () => {
  // ─── Defaults ─────────────────────────────────────────────────────────────
  it('uses default title when none provided', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('uses default message when none provided', () => {
    render(<ErrorState />);
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
  });

  it('uses default "unknown" icon when kind not provided', () => {
    render(<ErrorState />);
    expect(screen.getByText('help-circle-outline')).toBeTruthy();
  });

  it('uses default "Try Again" retry label', () => {
    render(<ErrorState onRetry={jest.fn()} />);
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  // ─── Custom props ─────────────────────────────────────────────────────────
  it('renders custom title and message', () => {
    render(<ErrorState title="Oops" message="Custom message" />);
    expect(screen.getByText('Oops')).toBeTruthy();
    expect(screen.getByText('Custom message')).toBeTruthy();
  });

  // ─── Error-kind → icon mapping ────────────────────────────────────────────
  it.each([
    ['network', 'cloud-offline-outline'],
    ['server', 'warning-outline'],
    ['unauthorized', 'lock-closed-outline'],
    ['validation', 'alert-circle-outline'],
    ['conflict', 'git-compare-outline'],
    ['rate_limit', 'speedometer-outline'],
    ['unknown', 'help-circle-outline'],
  ] as const)('renders "%s" icon for kind="%s"', (kind, expectedIcon) => {
    const { unmount } = render(<ErrorState kind={kind} />);
    expect(screen.getByText(expectedIcon)).toBeTruthy();
    unmount();
  });

  // ─── Retry (fullscreen variant) ───────────────────────────────────────────
  it('fires onRetry when "Try Again" tapped (fullscreen)', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry not provided', () => {
    render(<ErrorState />);
    expect(screen.queryByText('Try Again')).toBeNull();
  });

  // ─── Inline variant ───────────────────────────────────────────────────────
  it('renders inline variant without a title', () => {
    render(<ErrorState variant="inline" message="Inline error" />);
    expect(screen.getByText('Inline error')).toBeTruthy();
    // default title should not appear in inline mode
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('renders inline retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    render(<ErrorState variant="inline" message="bad" onRetry={onRetry} retryLabel="Retry" />);
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render inline retry when onRetry missing', () => {
    render(<ErrorState variant="inline" message="bad" retryLabel="Retry" />);
    expect(screen.queryByText('Retry')).toBeNull();
  });

  // ─── Card variant ─────────────────────────────────────────────────────────
  it('renders card variant with title and message', () => {
    render(<ErrorState variant="card" title="Card Title" message="Card msg" />);
    expect(screen.getByText('Card Title')).toBeTruthy();
    expect(screen.getByText('Card msg')).toBeTruthy();
  });

  it('renders card retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    render(<ErrorState variant="card" onRetry={onRetry} retryLabel="Reload" />);
    fireEvent.press(screen.getByText('Reload'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render card retry when onRetry missing', () => {
    render(<ErrorState variant="card" retryLabel="Reload" />);
    expect(screen.queryByText('Reload')).toBeNull();
  });

  // ─── Custom retryLabel ────────────────────────────────────────────────────
  it('uses custom retryLabel text', () => {
    render(<ErrorState onRetry={jest.fn()} retryLabel="Reconnect" />);
    expect(screen.getByText('Reconnect')).toBeTruthy();
    expect(screen.queryByText('Try Again')).toBeNull();
  });
});
