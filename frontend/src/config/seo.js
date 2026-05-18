import { PUBLIC_SITE_URL } from './site';

export { PUBLIC_SITE_URL };

/** Default site-wide SEO (landing + fallback). */
export const DEFAULT_SEO = {
  title: 'TrimiT — Book Salon Appointments Online | Hair, Beard & Spa',
  description:
    'TrimiT helps you discover nearby salons and book haircuts, beard trims, facials, and spa appointments in minutes. Download the Android app or sign up on the web.',
  keywords:
    'salon booking app, book haircut online, barber appointment, beard trim booking, facial spa booking, salon near me, TrimiT, trimit.online',
};

/** Per-path overrides for public marketing & auth pages. */
export const SEO_BY_PATH = {
  '/': {
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    keywords: DEFAULT_SEO.keywords,
  },
  '/login': {
    title: 'Sign In | TrimiT Salon Booking',
    description: 'Sign in to your TrimiT account to manage salon bookings and appointments.',
    keywords: 'TrimiT login, salon booking sign in',
  },
  '/signup': {
    title: 'Create Account | TrimiT Salon Booking',
    description: 'Create a free TrimiT account to book salon services and manage your appointments.',
    keywords: 'TrimiT sign up, create salon booking account',
  },
  '/forgot-password': {
    title: 'Reset Password | TrimiT',
    description: 'Reset your TrimiT account password.',
    robots: 'noindex, follow',
  },
  '/reset-password': {
    title: 'Set New Password | TrimiT',
    description: 'Choose a new password for your TrimiT account.',
    robots: 'noindex, nofollow',
  },
  '/auth/email-confirmed': {
    title: 'Email Confirmed | TrimiT',
    description: 'Your TrimiT email address has been confirmed.',
    robots: 'noindex, nofollow',
  },
  '/privacy': {
    title: 'Privacy Policy | TrimiT',
    description: 'TrimiT privacy policy — how we collect, use, and protect your data.',
    keywords: 'TrimiT privacy policy, salon app privacy',
  },
  '/terms': {
    title: 'Terms of Service | TrimiT',
    description: 'TrimiT terms of service for customers and salon owners.',
    keywords: 'TrimiT terms of service, salon booking terms',
  },
  '/contact': {
    title: 'Contact Us | TrimiT',
    description: 'Contact TrimiT support for help with bookings, accounts, and salon listings.',
    keywords: 'TrimiT contact, salon booking support',
  },
};

/** Paths included in sitemap.xml (indexable marketing & legal pages only). */
export const SITEMAP_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/signup', changefreq: 'monthly', priority: '0.8' },
  { path: '/login', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.5' },
];

export function getSeoForPath(pathname) {
  const entry = SEO_BY_PATH[pathname];
  if (entry) {
    return {
      ...DEFAULT_SEO,
      robots: 'index, follow',
      ...entry,
    };
  }
  return {
    ...DEFAULT_SEO,
    robots: 'noindex, nofollow',
  };
}

export function buildCanonicalUrl(pathname) {
  if (pathname === '/') return `${PUBLIC_SITE_URL}/`;
  return `${PUBLIC_SITE_URL}${pathname}`;
}
