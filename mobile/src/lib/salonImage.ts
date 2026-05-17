import type { ImageSource } from 'expo-image';
import type { Salon } from '../types';

/** Local TrimiT logo — default salon thumbnail when no upload is available. */
export const TRIMIT_SALON_PLACEHOLDER: number = require('../../assets/logo.png');

/**
 * Normalize Postgres text[] / JSON quirks from Supabase into a string[] of HTTPS URLs.
 */
export function normalizeSalonImages(raw: unknown): string[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((url) => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return [trimmed];
    }
    if (trimmed.startsWith('[')) {
      try {
        return normalizeSalonImages(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }
  }

  return [];
}

export function normalizeSalon<T extends Partial<Salon>>(salon: T): T & Salon {
  const fromImages = normalizeSalonImages(salon.images);
  const fromUrl =
    typeof salon.image_url === 'string' && salon.image_url.trim().length > 0
      ? salon.image_url.trim()
      : undefined;

  const images =
    fromImages.length > 0 ? fromImages : fromUrl ? [fromUrl] : [];

  const image_url = fromUrl ?? images[0];

  return {
    ...salon,
    images,
    image_url,
  } as T & Salon;
}

export function getSalonThumbnailUri(salon: Partial<Salon>): string | null {
  const normalized = normalizeSalon(salon);
  return normalized.images[0] ?? normalized.image_url ?? null;
}

export function getSalonCarouselUris(salon: Partial<Salon>): string[] {
  return normalizeSalon(salon).images;
}

/** expo-image source: remote URI or bundled TrimiT logo. */
export function resolveSalonImageSource(salon: Partial<Salon>): ImageSource {
  const uri = getSalonThumbnailUri(salon);
  if (uri) {
    return { uri };
  }
  return TRIMIT_SALON_PLACEHOLDER as ImageSource;
}

export function resolveSalonCarouselSources(salon: Partial<Salon>): ImageSource[] {
  const uris = getSalonCarouselUris(salon);
  if (uris.length === 0) {
    return [TRIMIT_SALON_PLACEHOLDER as ImageSource];
  }
  return uris.map((uri) => ({ uri }));
}
