import { getSeoPageByPath } from '../config/seoPages';
import { getPostBySlug } from '../content/blog/posts';

const STATIC_LABELS = {
  explore: 'Explore',
  'for-salons': 'For Salons',
  login: 'Sign in',
  signup: 'Sign up',
  'forgot-password': 'Forgot password',
  'reset-password': 'Reset password',
  privacy: 'Privacy',
  terms: 'Terms',
  contact: 'Contact',
  blog: 'Blog',
  salon: 'Salon',
  booking: 'Book',
  'my-bookings': 'My bookings',
  account: 'Account',
  owner: 'Owner',
  dashboard: 'Dashboard',
  services: 'Services',
  bookings: 'Bookings',
  settings: 'Settings',
};

function titleCase(segment) {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Build breadcrumb trail from pathname (for UI + JSON-LD).
 * @returns {{ label: string, to?: string }[] | null}
 */
export function getBreadcrumbsForPath(pathname) {
  if (!pathname || pathname === '/') return null;

  const authOnly =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/');

  if (authOnly) return null;

  const crumbs = [{ label: 'Home', to: '/' }];
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) return null;

  const seoPage = getSeoPageByPath(pathname);
  if (seoPage) {
    crumbs.push({ label: seoPage.h1 });
    return crumbs;
  }

  if (parts[0] === 'owner' && parts.length > 1) {
    crumbs.push({ label: 'Dashboard', to: '/owner/dashboard' });
    const leaf = parts[parts.length - 1];
    crumbs.push({ label: STATIC_LABELS[leaf] || titleCase(leaf) });
    return crumbs;
  }

  let pathAcc = '';
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    pathAcc += `/${part}`;
    const isLast = i === parts.length - 1;

    if (part === 'owner') continue;

    if (parts[0] === 'blog' && part !== 'blog' && i === 1) {
      const post = getPostBySlug(part);
      crumbs.push({ label: 'Blog', to: '/blog' });
      crumbs.push({ label: post?.title || titleCase(part) });
      break;
    }

    if (parts[0] === 'salon' && part !== 'salon' && i === 1) {
      crumbs.push({ label: 'Explore', to: '/explore' });
      crumbs.push({ label: 'Salon' });
      break;
    }

    if (parts[0] === 'booking' && i === 0) {
      crumbs.push({ label: 'Explore', to: '/explore' });
      crumbs.push({ label: 'Book appointment' });
      break;
    }

    const label = STATIC_LABELS[part] || titleCase(part);
    crumbs.push(isLast ? { label } : { label, to: pathAcc });
  }

  if (crumbs.length <= 1) return null;
  return crumbs;
}
