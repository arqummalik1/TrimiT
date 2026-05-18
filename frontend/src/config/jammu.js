/** Default discovery center for Jammu & Kashmir launch market */
export const JAMMU_CITY = {
  label: 'Jammu',
  region: 'Jammu & Kashmir',
  lat: 32.7266,
  lng: 74.857,
  defaultRadiusKm: 25,
  neighborhoods: [
    'Gandhinagar',
    'Trikuta Nagar',
    'Channi Himmat',
    'Narwal',
    'Rehari',
    'Bathindi',
  ],
};

export function buildExploreSearchParams({ q = '', lat, lng, radius } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('lat', String(lat ?? JAMMU_CITY.lat));
  params.set('lng', String(lng ?? JAMMU_CITY.lng));
  if (radius) params.set('radius', String(radius));
  return params;
}

export function explorePath(options) {
  const qs = buildExploreSearchParams(options).toString();
  return qs ? `/explore?${qs}` : '/explore';
}
