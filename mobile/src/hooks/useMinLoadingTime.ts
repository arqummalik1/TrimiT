/**
 * useMinLoadingTime.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Prevents skeleton flash by enforcing a minimum display duration.
 *
 * Problem: When API responds from cache in <100ms, the skeleton appears and
 * immediately disappears, causing an unpleasant flash/flicker.
 *
 * Solution: This hook returns `true` for at least `minMs` milliseconds after
 * `isLoading` first becomes true, even if the data arrives faster.
 *
 * Usage:
 *   const showSkeleton = useMinLoadingTime(isLoading, 500);
 *   {showSkeleton ? <Skeleton /> : <Content />}
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';

/**
 * @param isLoading - The raw loading boolean from useQuery or useMutation.
 * @param minMs     - Minimum time in ms to show the loading state. Default 500.
 * @returns boolean - True if we should still show the loading UI.
 */
export function useMinLoadingTime(isLoading: boolean, minMs: number = 500): boolean {
  const [showLoading, setShowLoading] = useState(isLoading);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Loading started — record start time and show loading state
      startTimeRef.current = Date.now();
      setShowLoading(true);

      // Clear any pending hide timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Loading finished — only hide after minMs has elapsed
      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : minMs;
      const remaining = Math.max(0, minMs - elapsed);

      if (remaining > 0) {
        timerRef.current = setTimeout(() => {
          setShowLoading(false);
        }, remaining);
      } else {
        setShowLoading(false);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, minMs]);

  return showLoading;
}
