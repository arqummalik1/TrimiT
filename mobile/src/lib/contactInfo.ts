/** Public support contact (Play Store, legal, in-app links). */
export const SUPPORT_PHONE = '+917006082958';
export const SUPPORT_PHONE_DISPLAY = '+91 70060 82958';
export const SUPPORT_EMAIL = 'hello@trimit.online';

export const PUBLIC_SITE_URL =
  process.env.EXPO_PUBLIC_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ||
  'https://trimit.online';

export const LEGAL_URLS = {
  privacy: `${PUBLIC_SITE_URL}/privacy`,
  terms: `${PUBLIC_SITE_URL}/terms`,
  contact: `${PUBLIC_SITE_URL}/contact`,
  accountDeletion: `${PUBLIC_SITE_URL}/contact`,
} as const;
