import { useQuery } from '@tanstack/react-query';
import { serviceabilityService } from '../services/serviceabilityService';

/**
 * Serviceability check for a coordinate. Only runs when coords are provided
 * (i.e. the visitor actually shared their location). Fails open: on error we
 * treat the visitor as serviceable so browsing is never blocked by a blip.
 */
export function useServiceability(coords, { enabled = true } = {}) {
  const hasCoords =
    !!coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';

  return useQuery({
    queryKey: ['serviceability', 'check', coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => serviceabilityService.check(coords),
    enabled: enabled && hasCoords,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}
