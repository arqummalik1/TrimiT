/**
 * Public site URL for legal links (Play Console, emails in UI).
 * Set REACT_APP_PUBLIC_SITE_URL in Vercel → Project → Settings → Environment Variables
 * after your first deploy (e.g. https://trimit-web.vercel.app). No trailing slash.
 */
const raw = (process.env.REACT_APP_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');

export const PUBLIC_SITE_URL = raw || 'https://trimit.app';

export const legalUrls = {
  privacy: `${PUBLIC_SITE_URL}/privacy`,
  terms: `${PUBLIC_SITE_URL}/terms`,
  contact: `${PUBLIC_SITE_URL}/contact`,
  accountDeletion: `${PUBLIC_SITE_URL}/contact`,
};
