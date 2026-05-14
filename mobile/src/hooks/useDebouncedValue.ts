import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delayMs`.
 * Useful for search/filter to avoid recomputing on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
