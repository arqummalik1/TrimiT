/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSplashGate } from '../../src/hooks/useSplashGate';
import { computeSplashHideDelayMs } from '../../src/lib/splashBranding';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/lib/splashBranding', () => ({
  computeSplashHideDelayMs: jest.fn(() => 0),
}));

describe('useSplashGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps splash until readyToDismiss then hides native splash', async () => {
    // Explicit Props typing — renderHook defaults props to `unknown` under tsc.
    const { result, rerender } = renderHook(
      (props: { ready: boolean }) => useSplashGate(props.ready),
      { initialProps: { ready: false } },
    );

    expect(result.current).toBe(false);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    rerender({ ready: true });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(computeSplashHideDelayMs).toHaveBeenCalled();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });
});
