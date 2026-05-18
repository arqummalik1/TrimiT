import { PUBLIC_SITE_URL } from './site';
import { SEO_PAGES } from './seoPages';
import { BLOG_POSTS } from '../content/blog/posts';

export { PUBLIC_SITE_URL };

export const DEFAULT_SEO = {
  title: 'TrimiT — Book Salons in Jammu | Haircut, Beard, Spa & Bridal',
  description:
    'Book premium salons in Jammu online. Haircuts, beard grooming, spa, and beauty parlour appointments with live slots and instant confirmation. List your salon free on TrimiT.',
  keywords:
    'salon booking Jammu, best salons in Jammu, haircut Jammu, beard grooming Jammu, spa Jammu, salon near me Jammu, beauty parlour Jammu, TrimiT',
};

const SEO_PAGE_MAP = Object.fromEntries(
  SEO_PAGES.map((p) => [
    p.path,
    {
      title: p.title,
      description: p.description,
      keywords: p.keywords,
    },
  ])
);

/** Per-path overrides for public marketing & auth pages. */
export const SEO_BY_PATH = {
  '/': {
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    keywords: DEFAULT_SEO.keywords,
  },
  '/explore': {
    title: 'Explore Salons in Jammu | TrimiT',
    description:
      'Search and book salons in Jammu. Compare ratings, services, and live appointment slots on TrimiT.',
    keywords: 'explore salons Jammu, salon near me Jammu, book salon Jammu',
  },
  '/for-salons': {
    title: 'List Your Salon Free | TrimiT for Owners',
    description:
      'Take your salon online with TrimiT. Get more bookings, manage your calendar, and grow your salon business in Jammu.',
    keywords: 'salon software India, list salon online, salon booking system Jammu',
  },
  '/blog': {
    title: 'Salon Booking Guides Jammu | TrimiT Blog',
    description: 'Tips for booking salons, grooming, and spa services in Jammu.',
    keywords: 'salon tips Jammu, grooming guide, TrimiT blog',
  },
  ...SEO_PAGE_MAP,
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

BLOG_POSTS.forEach((post) => {
  SEO_BY_PATH[`/blog/${post.slug}`] = {
    title: `${post.title} | TrimiT Blog`,
    description: post.excerpt,
    keywords: 'salon booking Jammu, TrimiT blog',
  };
});

/** Paths included in sitemap.xml */
export const SITEMAP_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/explore', changefreq: 'daily', priority: '0.95' },
  { path: '/for-salons', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  ...SEO_PAGES.map((p) => ({ path: p.path, changefreq: 'weekly', priority: '0.85' })),
  ...BLOG_POSTS.map((p) => ({
    path: `/blog/${p.slug}`,
    changefreq: 'monthly',
    priority: '0.6',
  })),
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
