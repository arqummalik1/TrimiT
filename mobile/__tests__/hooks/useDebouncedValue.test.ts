/**
 * Unit tests for src/hooks/useDebouncedValue.ts
 * Covers: initial render, debounce delay, rapid changes, unmount cleanup
 *
 * Note: under React 19 + RTL, state updates driven by timers must be flushed
 * inside `act(...)`, so every `jest.advanceTimersByTime` is wrapped in act.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';

const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update value before delay elapses', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    // Before timer fires, value is still 'a'
    expect(result.current).toBe('a');

    advance(299);
    expect(result.current).toBe('a');
  });

  it('updates value after delay elapses', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    advance(300);

    expect(result.current).toBe('b');
  });

  it('resets the timer on rapid changes (true debounce)', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    advance(200); // 200ms elapsed

    rerender({ value: 'c' }); // reset timer
    advance(200); // only 200ms since 'c', total 400 since 'b'
    expect(result.current).toBe('a'); // still 'a' — timer was reset

    advance(100); // 300ms since 'c'
    expect(result.current).toBe('c');
  });

  it('debounces multiple rapid changes to the last value', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 200), {
      initialProps: { value: 'start' },
    });

    rerender({ value: '1' });
    rerender({ value: '2' });
    rerender({ value: '3' });
    rerender({ value: 'final' });

    advance(200);
    expect(result.current).toBe('final');
  });

  it('supports numeric values', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 100), {
      initialProps: { value: 0 },
    });

    rerender({ value: 42 });
    advance(100);
    expect(result.current).toBe(42);
  });

  it('supports object values', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 100), {
      initialProps: { value: { a: 1 } },
    });

    rerender({ value: { a: 2 } });
    advance(100);
    expect(result.current).toEqual({ a: 2 });
  });

  it('clears pending timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }: any) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    unmount();

    // Advancing timers after unmount should not throw
    expect(() => advance(300)).not.toThrow();
    expect(result.current).toBe('a');
  });

  it('respects a zero delay', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 0), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    // setTimeout(fn, 0) — needs to advance at least 0ms via macro task queue
    advance(0);
    expect(result.current).toBe('b');
  });

  it('does not update when value is unchanged on rerender', () => {
    const { result, rerender } = renderHook(({ value }: any) => useDebouncedValue(value, 100), {
      initialProps: { value: 'same' },
    });

    rerender({ value: 'same' });
    advance(100);
    expect(result.current).toBe('same');
  });
});
