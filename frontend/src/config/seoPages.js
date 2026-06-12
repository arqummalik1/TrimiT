import seoData from './seo-data.json';

export const SEO_PAGES = seoData.SEO_PAGES;

export function getSeoPageByPath(pathname) {
  return SEO_PAGES.find((p) => p.path === pathname);
}

export const SEO_PAGE_PATHS = SEO_PAGES.map((p) => p.path);

