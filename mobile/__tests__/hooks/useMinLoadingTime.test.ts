/**
 * Unit tests for src/hooks/useMinLoadingTime.ts
 * Covers: immediate show, min-time hold, fast-resolve no-flash, cleanup
 */
import { renderHook } from '@testing-library/react-native';
import { useMinLoadingTime } from '../../src/hooks/useMinLoadingTime';

describe('useMinLoadingTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns true initially when isLoading is true', () => {
    const { result } = renderHook(() => useMinLoadingTime(true, 500));
    expect(result.current).toBe(true);
  });

  it('returns false initially when isLoading is false', () => {
    const { result } = renderHook(() => useMinLoadingTime(false, 500));
    expect(result.current).toBe(false);
  });

  it('stays true for minMs even after isLoading becomes false (no-flash)', () => {
    let isLoading = true;
    const { result, rerender } = renderHook(() => useMinLoadingTime(isLoading, 500));

    // isLoading → false immediately (cache hit)
    isLoading = false;
    rerender(undefined as any);

    // Should still show loading because minMs hasn't elapsed
    expect(result.current).toBe(true);

    jest.advanceTimersByTime(499);
    expect(result.current).toBe(true);

    jest.advanceTimersByTime(1);
    expect(result.current).toBe(false);
  });

  it('hides immediately if minMs already elapsed', () => {
    let isLoading = true;
    const { result, rerender } = renderHook(() => useMinLoadingTime(isLoading, 200));

    // Simulate that >200ms passed while loading
    jest.advanceTimersByTime(300);

    isLoading = false;
    rerender(undefined as any);

    expect(result.current).toBe(false);
  });

  it('uses default 500ms when minMs not provided', () => {
    let isLoading = true;
    const { result, rerender } = renderHook(() => useMinLoadingTime(isLoading));

    isLoading = false;
    rerender(undefined as any);

    expect(result.current).toBe(true);
    jest.advanceTimersByTime(499);
    expect(result.current).toBe(true);
    jest.advanceTimersByTime(1);
    expect(result.current).toBe(false);
  });

  it('re-arms when isLoading toggles back to true', () => {
    let isLoading = true;
    const { result, rerender } = renderHook(() => useMinLoadingTime(isLoading, 300));

    // finish first load
    jest.advanceTimersByTime(300);
    isLoading = false;
    rerender(undefined as any);
    expect(result.current).toBe(false);

    // start second load
    isLoading = true;
    rerender(undefined as any);
    expect(result.current).toBe(true);

    isLoading = false;
    rerender(undefined as any);
    expect(result.current).toBe(true); // held for minMs again

    jest.advanceTimersByTime(300);
    expect(result.current).toBe(false);
  });

  it('clears pending hide timer on unmount', () => {
    let isLoading = true;
    const { result, rerender, unmount } = renderHook(() => useMinLoadingTime(isLoading, 500));

    isLoading = false;
    rerender(undefined as any);

    unmount();

    // Advancing timers after unmount must not throw
    expect(() => jest.advanceTimersByTime(500)).not.toThrow();
    expect(result.current).toBe(true); // frozen at last value
  });

  it('handles zero minMs', () => {
    let isLoading = true;
    const { result, rerender } = renderHook(() => useMinLoadingTime(isLoading, 0));

    isLoading = false;
    rerender(undefined as any);

    // remaining = max(0, 0 - elapsed) = 0 → hide immediately
    expect(result.current).toBe(false);
  });

  it('keeps showing loading if isLoading stays true beyond minMs', () => {
    const { result } = renderHook(() => useMinLoadingTime(true, 200));

    jest.advanceTimersByTime(1000);
    expect(result.current).toBe(true); // still loading because isLoading is still true
  });
});
