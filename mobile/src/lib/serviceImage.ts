/**
 * Shared service thumbnail resolution — must match ServiceCard so booking rows
 * show the same image as salon service lists (owner upload, then category fallback).
 */

import type { Service } from '../types';

const CATEGORY_IMAGES: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['hair', 'cut', 'trim', 'style', 'blow'], url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600' },
  { keywords: ['beard', 'shave', 'facial hair'], url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600' },
  { keywords: ['facial', 'skin', 'glow', 'face', 'clean', 'peel'], url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600' },
  { keywords: ['manicure', 'pedicure', 'nail', 'nails'], url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600' },
  { keywords: ['massage', 'spa', 'relax', 'therapy'], url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600' },
  { keywords: ['colour', 'color', 'highlight', 'bleach', 'dye'], url: 'https://images.unsplash.com/photo-1612526737988-60d35f7a1e57?w=600' },
  { keywords: ['wax', 'threading', 'eyebrow', 'brow'], url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600' },
];

export const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600';

export function resolveServiceImage(service: Pick<Service, 'name' | 'image_url'>): string {
  if (service.image_url) {
    return service.image_url;
  }
  const name = (service.name ?? '').toString().toLowerCase();
  for (const cat of CATEGORY_IMAGES) {
    if (cat.keywords.some((k) => name.includes(k))) {
      return cat.url;
    }
  }
  return DEFAULT_SERVICE_IMAGE;
}
