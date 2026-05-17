import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from './contact';

const raw = (process.env.REACT_APP_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');

export const PUBLIC_SITE_URL = raw || 'https://trimi-t.vercel.app';

/** Supabase signup confirmation emails redirect here (allowlist in Supabase Auth → URL config). */
export const EMAIL_CONFIRMED_PATH = '/auth/email-confirmed';
export const emailConfirmedUrl = `${PUBLIC_SITE_URL}${EMAIL_CONFIRMED_PATH}`;

export const legalUrls = {
  privacy: `${PUBLIC_SITE_URL}/privacy`,
  terms: `${PUBLIC_SITE_URL}/terms`,
  contact: `${PUBLIC_SITE_URL}/contact`,
  accountDeletion: `${PUBLIC_SITE_URL}/contact`,
};

export { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY };
