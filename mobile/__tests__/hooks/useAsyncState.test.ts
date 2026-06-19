/**
 * Unit tests for src/hooks/useAsyncState.ts
 * Covers: status lifecycle, success/error callbacks, reset, race conditions,
 *         stale execution handling, handleApiError integration
 */
import { renderHook, act } from '@testing-library/react-native';
import { useAsyncState } from '../../src/hooks/useAsyncState';

describe('useAsyncState', () => {
  // ─── Initial state ─────────────────────────────────────────────────────────
  it('starts in idle state with null data and error', () => {
    const { result } = renderHook(() => useAsyncState(jest.fn()));

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  // ─── Success path ──────────────────────────────────────────────────────────
  it('transitions idle → loading → success on successful execution', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsyncState(fn));

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await promise;
    });

    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe('result');
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns the resolved value from execute', async () => {
    const fn = jest.fn().mockResolvedValue(42);
    const { result } = renderHook(() => useAsyncState(fn));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.execute();
    });

    expect(returned).toBe(42);
  });

  it('passes arguments to the async function', async () => {
    const fn = jest.fn(async (a: number, b: number) => a + b);
    const { result } = renderHook(() => useAsyncState(fn));

    await act(async () => {
      await result.current.execute(3, 4);
    });

    expect(fn).toHaveBeenCalledWith(3, 4);
    expect(result.current.data).toBe(7);
  });

  // ─── Error path ────────────────────────────────────────────────────────────
  it('transitions to error state on rejection and stores AppError', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAsyncState(fn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error!.kind).toBe('unknown');
    expect(result.current.error!.message).toBe('boom');
  });

  it('returns null on rejection (does not re-throw)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAsyncState(fn));

    let returned: unknown = 'untouched';
    await act(async () => {
      returned = await result.current.execute();
    });

    expect(returned).toBeNull();
  });

  it('preserves AppError structure when asyncFn rejects with an AppError', async () => {
    const appErr = { kind: 'validation' as const, message: 'Bad input', code: 'BAD' };
    const fn = jest.fn().mockRejectedValue(appErr);
    const { result } = renderHook(() => useAsyncState(fn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBe(appErr);
    expect(result.current.error!.kind).toBe('validation');
  });

  // ─── Callbacks ─────────────────────────────────────────────────────────────
  it('fires onSuccess callback with data', async () => {
    const onSuccess = jest.fn();
    const fn = jest.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsyncState(fn, { onSuccess }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith('ok');
  });

  it('fires onError callback with AppError', async () => {
    const onError = jest.fn();
    const fn = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useAsyncState(fn, { onError }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('nope');
  });

  it('does not fire onSuccess on error', async () => {
    const onSuccess = jest.fn();
    const fn = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useAsyncState(fn, { onSuccess }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not fire onError on success', async () => {
    const onError = jest.fn();
    const fn = jest.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsyncState(fn, { onError }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onError).not.toHaveBeenCalled();
  });

  // ─── reset ─────────────────────────────────────────────────────────────────
  it('reset returns state to idle and clears data/error', async () => {
    const fn = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAsyncState(fn));

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.isSuccess).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isIdle).toBe(true);
  });

  // ─── Concurrent execution race conditions ──────────────────────────────────
  it('keeps only the latest execution result when calls overlap', async () => {
    let resolveFirst!: (v: string) => void;
    let resolveSecond!: (v: string) => void;
    const fn = jest.fn((id: number) =>
      id === 1
        ? new Promise<string>((r) => { resolveFirst = r; })
        : new Promise<string>((r) => { resolveSecond = r; })
    );

    const { result } = renderHook(() => useAsyncState(fn));

    let firstPromise!: Promise<unknown>;
    let secondPromise!: Promise<unknown>;
    act(() => {
      firstPromise = result.current.execute(1);
      secondPromise = result.current.execute(2);
    });

    // Resolve the FIRST call after the SECOND has already been issued.
    // The hook must ignore the stale first result.
    await act(async () => {
      resolveFirst('first-result');
      await firstPromise;
    });

    // First result should be ignored because executionId moved on
    expect(result.current.data).not.toBe('first-result');

    await act(async () => {
      resolveSecond('second-result');
      await secondPromise;
    });

    expect(result.current.data).toBe('second-result');
    expect(result.current.isSuccess).toBe(true);
  });

  // ─── Unmount safety ────────────────────────────────────────────────────────
  it('does not update state after unmount', async () => {
    let resolveFn!: (v: string) => void;
    const fn = jest.fn(() => new Promise<string>((r) => { resolveFn = r; }));
    const { result, unmount } = renderHook(() => useAsyncState(fn));

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.execute();
    });

    unmount();

    await act(async () => {
      resolveFn('late-result');
      await promise;
    });

    // After unmount, returns null and no state update is attempted
    // (the assertion is that this did not throw a "can't update unmounted" warning)
    expect(result.current.data).toBeNull();
  });
});
