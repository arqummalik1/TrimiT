import type { Coordinates } from '../../lib/maps';

/** Nearby salons API search radius (km). */
export const DISCOVER_NEARBY_RADIUS_KM = 50;

/** Debounce for client-side salon name/address filter (ms). */
export const DISCOVER_SEARCH_DEBOUNCE_MS = 250;

/** Use ClusteredMapView when marker count is at least this (plain MapView below). */
export const DISCOVER_CLUSTERING_MIN_MARKERS = 60;

/** Max salons included in automatic fit-to-bounds on map open. */
export const DISCOVER_FIT_MAX_MARKERS = 40;

/** Skip auto fit when lat/lng span exceeds this (km) to avoid absurd zoom-out. */
export const DISCOVER_FIT_MAX_SPAN_KM = 200;

/** Supercluster radius passed to ClusteredMapView (screen-relative clustering). */
export const DISCOVER_CLUSTER_RADIUS = 48;

/**
 * Approximate max axis span in km for a set of lat/lng points (bounding box).
 */
export function computeApproxMaxSpanKm(points: Coordinates[]): number {
  if (points.length < 2) return 0;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  const midLat = (minLat + maxLat) / 2;
  const latKm = (maxLat - minLat) * 111;
  const lngKm = (maxLng - minLng) * 111 * Math.cos((midLat * Math.PI) / 180);
  return Math.max(latKm, lngKm);
}
