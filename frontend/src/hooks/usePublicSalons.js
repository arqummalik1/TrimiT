import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { JAMMU_CITY } from '../config/jammu';

async function fetchSalons({ search, lat, lng, radius, limit }) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('lat', String(lat ?? JAMMU_CITY.lat));
  params.append('lng', String(lng ?? JAMMU_CITY.lng));
  params.append('radius', String(radius ?? JAMMU_CITY.defaultRadiusKm));
  params.append('limit', String(limit ?? 20));
  const response = await api.get(`/salons/?${params.toString()}`);
  const body = response.data;
  return Array.isArray(body) ? body : body?.data ?? [];
}

export function usePublicSalons({
  search = '',
  lat,
  lng,
  radius,
  limit = 8,
  enabled = true,
} = {}) {
  return useQuery({
    queryKey: ['publicSalons', search, lat, lng, radius, limit],
    queryFn: () => fetchSalons({ search, lat, lng, radius, limit }),
    enabled,
    staleTime: 1000 * 60 * 3,
  });
}

export function sortSalonsByRating(salons) {
  return [...(salons || [])].sort(
    (a, b) => (b.avg_rating || 0) - (a.avg_rating || 0) || (a.distance || 99) - (b.distance || 99)
  );
}
