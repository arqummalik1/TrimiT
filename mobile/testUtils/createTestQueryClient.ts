import { QueryClient } from '@tanstack/react-query';

/**
 * A fresh React Query client for each rendered test.
 *
 * Production keeps inactive queries cached for reuse. Tests must not retain
 * those cache timers after unmount, so both query and mutation garbage
 * collection are immediate here.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}
