/**
 * Serviceability API (web) — city coverage check + waitlist join.
 * Public endpoints; no auth. Mirrors the mobile serviceabilityService.
 */
import api from '../lib/api';

export const serviceabilityService = {
  /** Is this point inside a city TrimiT serves? Fails open server-side. */
  check: async (coords) => {
    const params = new URLSearchParams();
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      params.append('lat', String(coords.lat));
      params.append('lng', String(coords.lng));
    }
    const qs = params.toString();
    const res = await api.get(`/serviceability/check${qs ? `?${qs}` : ''}`);
    return res.data; // { serviceable, nearest_area, nearest_distance_km, active_areas, ... }
  },

  /** Out-of-area user asks to be notified at launch. */
  joinWaitlist: async (payload) => {
    const res = await api.post('/serviceability/waitlist', { source: 'web', ...payload });
    return res.data; // { message, code }
  },
};

export default serviceabilityService;
