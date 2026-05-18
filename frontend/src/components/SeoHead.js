import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PUBLIC_SITE_URL,
  buildCanonicalUrl,
  getSeoForPath,
} from '../config/seo';

const OG_IMAGE = `${PUBLIC_SITE_URL}/branding/logo-horizontal.png`;

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeJsonLd(id) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
}

function injectJsonLd(id, data) {
  removeJsonLd(id);
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Updates document title, meta tags, canonical URL, and optional JSON-LD per route.
 * Safe for SPA — does not affect routing or auth.
 */
export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(pathname);
    const canonical = buildCanonicalUrl(pathname);

    document.title = seo.title;
    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.robots);
    if (seo.keywords) {
      upsertMeta('name', 'keywords', seo.keywords);
    }

    const verification = (process.env.REACT_APP_GOOGLE_SITE_VERIFICATION || '').trim();
    if (verification) {
      upsertMeta('name', 'google-site-verification', verification);
    }

    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'TrimiT');
    upsertMeta('property', 'og:image', OG_IMAGE);
    upsertMeta('property', 'og:locale', 'en_IN');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', OG_IMAGE);

    upsertLink('canonical', canonical);

    if (pathname === '/') {
      injectJsonLd('trimit-jsonld-website', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'TrimiT',
        url: `${PUBLIC_SITE_URL}/`,
        description: seo.description,
        inLanguage: 'en-IN',
      });
      injectJsonLd('trimit-jsonld-org', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'TrimiT',
        url: `${PUBLIC_SITE_URL}/`,
        logo: OG_IMAGE,
      });
      injectJsonLd('trimit-jsonld-app', {
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        name: 'TrimiT',
        operatingSystem: 'Android',
        applicationCategory: 'LifestyleApplication',
        description: seo.description,
        url: `${PUBLIC_SITE_URL}/`,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
      });
    } else {
      removeJsonLd('trimit-jsonld-website');
      removeJsonLd('trimit-jsonld-org');
      removeJsonLd('trimit-jsonld-app');
    }

    return () => {
      removeJsonLd('trimit-jsonld-website');
      removeJsonLd('trimit-jsonld-org');
      removeJsonLd('trimit-jsonld-app');
    };
  }, [pathname]);

  return null;
}
