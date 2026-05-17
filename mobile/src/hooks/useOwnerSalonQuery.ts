import { useQuery } from '@tanstack/react-query';
import { salonRepository } from '../repositories/salonRepository';
import { queryKeys } from '../lib/queryKeys';
import type { Salon } from '../types';

const OWNER_SALON_STALE_MS = 30_000;

export function useOwnerSalonQuery() {
  return useQuery<Salon | null>({
    queryKey: queryKeys.ownerSalon,
    queryFn: () => salonRepository.getOwnerSalon(),
    staleTime: OWNER_SALON_STALE_MS,
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
