/**
 * Normalize booking payloads from PostgREST / Realtime for UI (embed shape varies).
 */

import type { Booking, Service } from '../types';
import { resolveServiceImage } from './serviceImage';

/** PostgREST sometimes returns `services` as an object or a single-element array. */
export function getEmbeddedService(booking: Booking): Service | undefined {
  const raw = booking.services as unknown;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw[0] as Service;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Service;
  }
  const salon = booking.salons as (typeof booking.salons & { services?: Service[] }) | undefined;
  if (booking.service_id && salon?.services?.length) {
    return salon.services.find((s) => s.id === booking.service_id);
  }
  return undefined;
}

export function getServiceDisplayName(booking: Booking): string {
  return getEmbeddedService(booking)?.name || 'Service';
}

/** Same image rules as ServiceCard: owner `image_url`, else category stock, else salon hero, else default. */
export function getBookingServiceImageUri(booking: Booking): string {
  const service = getEmbeddedService(booking);
  if (service) {
    return resolveServiceImage(service);
  }
  const salonFirst = booking.salons?.images?.[0];
  if (salonFirst) {
    return salonFirst;
  }
  return resolveServiceImage({ name: getServiceDisplayName(booking), image_url: null });
}
