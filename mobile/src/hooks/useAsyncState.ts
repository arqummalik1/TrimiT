/**
 * useAsyncState.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic typed async state hook for operations that live OUTSIDE of
 * TanStack Query (e.g. form submissions, one-off mutations, imperative calls).
 *
 * For data-fetching, prefer useQuery/useMutation from @tanstack/react-query.
 * Use this hook for manual async flows like: login, signup, profile update.
 *
 * Usage:
 *   const { status, data, error, execute, reset } = useAsyncState(myAsyncFn);
 *   <Button loading={status === 'loading'} onPress={execute} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef } from 'react';
import { handleApiError } from '../lib/errorHandler';
import { AppError } from '../types/error';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: AppError | null;
  /** Convenience booleans */
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseAsyncStateReturn<T, Args extends unknown[]> extends AsyncState<T> {
  /**
   * Execute the async function. Returns the result or null if it fails.
   * Errors are caught and stored in `state.error` — not re-thrown.
   */
  execute: (...args: Args) => Promise<T | null>;
  /** Reset state to idle. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const IDLE_STATE = <T>(): AsyncState<T> => ({
  status: 'idle',
  data: null,
  error: null,
  isIdle: true,
  isLoading: false,
  isSuccess: false,
  isError: false,
});

/**
 * @param asyncFn - The async function to wrap. Must be stable (useCallback or
 *                  defined outside the component, or memoized).
 * @param onSuccess - Optional callback called with result data on success.
 * @param onError   - Optional callback called with AppError on failure.
 */
export function useAsyncState<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: AppError) => void;
  }
): UseAsyncStateReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>(IDLE_STATE<T>());
  // Guard against setting state after unmount
  const mountedRef = useRef(true);
  // Guard against concurrent executions racing
  const executionIdRef = useRef(0);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      const executionId = ++executionIdRef.current;

      setState({
        status: 'loading',
        data: null,
        error: null,
        isIdle: false,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      try {
        const result = await asyncFn(...args);

        // Ignore stale executions
        if (!mountedRef.current || executionId !== executionIdRef.current) {
          return null;
        }

        setState({
          status: 'success',
          data: result,
          error: null,
          isIdle: false,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });

        options?.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        if (!mountedRef.current || executionId !== executionIdRef.current) {
          return null;
        }

        const appError = handleApiError(err);

        setState({
          status: 'error',
          data: null,
          error: appError,
          isIdle: false,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });

        options?.onError?.(appError);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn]
  );

  const reset = useCallback(() => {
    executionIdRef.current++;
    setState(IDLE_STATE<T>());
  }, []);

  return { ...state, execute, reset };
}
