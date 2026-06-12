import { PUBLIC_SITE_URL } from './site';
import { SEO_PAGES } from './seoPages';
import { BLOG_POSTS } from '../content/blog/posts';
import seoData from './seo-data.json';

export { PUBLIC_SITE_URL };

export const DEFAULT_SEO = seoData.DEFAULT_SEO;

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
  ...seoData.SEO_BY_PATH,
  ...SEO_PAGE_MAP,
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
  ...seoData.STATIC_ROUTES,
  ...BLOG_POSTS.map((p) => ({
    path: `/blog/${p.slug}`,
    changefreq: 'monthly',
    priority: '0.6',
  })),
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

  // Handle dynamic salon detail paths: /salon/:id
  if (pathname.startsWith('/salon/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2 && segments[0] === 'salon') {
      return {
        ...DEFAULT_SEO,
        title: 'Book Salon | TrimiT',
        robots: 'index, follow',
      };
    }
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
