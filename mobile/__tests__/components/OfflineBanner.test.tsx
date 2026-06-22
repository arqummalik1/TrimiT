/**
 * Unit tests for src/components/OfflineBanner.tsx
 * Covers: hidden by default, shows offline message, shows "Back online",
 *         NetInfo subscription, cleanup
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import OfflineBanner from '../../src/components/OfflineBanner';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
  };
});

// ─── NetInfo mock with event emitter ─────────────────────────────────────────
type NetInfoCb = (state: any) => void;
let subscribers: NetInfoCb[] = [];

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((cb: NetInfoCb) => {
    subscribers.push(cb);
    return () => {
      subscribers = subscribers.filter((s) => s !== cb);
    };
  }),
}));

const emitNetInfoState = (state: any) => {
  act(() => {
    subscribers.forEach((cb) => cb(state));
  });
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider
      initialSafeAreaInsets={{ top: 47, bottom: 34, left: 0, right: 0 }}
    >
      {ui}
    </SafeAreaProvider>,
  );

describe('OfflineBanner', () => {
  beforeEach(() => {
    subscribers = [];
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when initially online', () => {
    renderWithProviders(<OfflineBanner />);
    expect(screen.queryByText('No internet connection')).toBeNull();
  });

  it('renders "No internet connection" when offline', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: false, isInternetReachable: false });
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  it('shows cloud-offline icon when offline', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: false, isInternetReachable: false });
    expect(screen.getByText('cloud-offline')).toBeTruthy();
  });

  it('shows "Back online" message when connection is restored', () => {
    renderWithProviders(<OfflineBanner />);
    // Go offline first
    emitNetInfoState({ isConnected: false, isInternetReachable: false });
    // Then come back online
    emitNetInfoState({ isConnected: true, isInternetReachable: true });
    expect(screen.getByText('Back online')).toBeTruthy();
  });

  it('shows cloud-done icon when back online', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: false, isInternetReachable: false });
    emitNetInfoState({ isConnected: true, isInternetReachable: true });
    expect(screen.getByText('cloud-done')).toBeTruthy();
  });

  it('hides banner 2 seconds after coming back online', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: false, isInternetReachable: false });
    emitNetInfoState({ isConnected: true, isInternetReachable: true });
    expect(screen.getByText('Back online')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000); // hide delay
      jest.advanceTimersByTime(300); // hide animation
    });

    expect(screen.queryByText('Back online')).toBeNull();
  });

  it('stays offline if connection never recovers', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: false, isInternetReachable: false });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  it('does not show banner if online the whole time', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: true, isInternetReachable: true });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Back online')).toBeNull();
    expect(screen.queryByText('No internet connection')).toBeNull();
  });

  it('treats isInternetReachable=false as offline even if isConnected=true', () => {
    renderWithProviders(<OfflineBanner />);
    emitNetInfoState({ isConnected: true, isInternetReachable: false });
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  it('subscribes to NetInfo on mount and unsubscribes on unmount', () => {
    const { unmount } = renderWithProviders(<OfflineBanner />);
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(subscribers.length).toBe(1);

    unmount();
    expect(subscribers.length).toBe(0);
  });
});
