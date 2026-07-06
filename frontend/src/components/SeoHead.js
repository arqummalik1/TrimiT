import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PUBLIC_SITE_URL,
  buildCanonicalUrl,
  getSeoForPath,
} from '../config/seo';
import { getEnv } from '../config/env';
import { HOMEPAGE_FAQ } from '../config/faq';
import { getSeoPageByPath } from '../config/seoPages';
import { getPostBySlug } from '../content/blog/posts';
import { JAMMU_CITY } from '../config/jammu';

const OG_IMAGE = `${PUBLIC_SITE_URL}/branding/og-image.png`;

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

function faqSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/**
 * Updates document title, meta tags, canonical URL, and JSON-LD per route.
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

    const verification = getEnv('GOOGLE_SITE_VERIFICATION').trim();
    if (verification) {
      upsertMeta('name', 'google-site-verification', verification);
    }

    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'TrimiT');
    upsertMeta('property', 'og:image', OG_IMAGE);
    upsertMeta('property', 'og:image:width', '1252');
    upsertMeta('property', 'og:image:height', '527');
    upsertMeta(
      'property',
      'og:image:alt',
      'TrimiT — salon, spa, barber and beauty booking for Jammu and India'
    );
    upsertMeta('property', 'og:locale', 'en_IN');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', OG_IMAGE);
    upsertMeta(
      'name',
      'twitter:image:alt',
      'TrimiT — salon, spa, barber and beauty booking for Jammu and India'
    );

    upsertLink('canonical', canonical);

    const jsonLdIds = [
      'trimit-jsonld-website',
      'trimit-jsonld-org',
      'trimit-jsonld-app',
      'trimit-jsonld-local',
      'trimit-jsonld-faq',
      'trimit-jsonld-breadcrumb',
    ];
    jsonLdIds.forEach(removeJsonLd);

    injectJsonLd('trimit-jsonld-org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'TrimiT',
      url: `${PUBLIC_SITE_URL}/`,
      logo: `${PUBLIC_SITE_URL}/branding/logo-horizontal.png`,
      areaServed: { '@type': 'City', name: JAMMU_CITY.label },
    });

    if (pathname === '/' || pathname === '/explore') {
      injectJsonLd('trimit-jsonld-website', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'TrimiT',
        url: `${PUBLIC_SITE_URL}/`,
        description: seo.description,
        inLanguage: 'en-IN',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${PUBLIC_SITE_URL}/explore?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });
    }

    if (pathname === '/') {
      injectJsonLd('trimit-jsonld-app', {
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        name: 'TrimiT',
        operatingSystem: 'Android',
        applicationCategory: 'LifestyleApplication',
        description: seo.description,
        url: `${PUBLIC_SITE_URL}/`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      });
      injectJsonLd('trimit-jsonld-local', {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'TrimiT Salon Booking',
        provider: { '@type': 'Organization', name: 'TrimiT' },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: JAMMU_CITY.region,
        },
        serviceType: 'Salon appointment booking',
      });
      injectJsonLd('trimit-jsonld-faq', faqSchema(HOMEPAGE_FAQ));
    }

    const seoPage = getSeoPageByPath(pathname);
    if (seoPage) {
      const pageFaq =
        seoPage.faq?.length > 0
          ? seoPage.faq
          : seoPage.faqIndexStart != null && seoPage.faqIndexEnd != null
            ? HOMEPAGE_FAQ.slice(seoPage.faqIndexStart, seoPage.faqIndexEnd)
            : [];
      if (pageFaq.length) {
        injectJsonLd('trimit-jsonld-faq', faqSchema(pageFaq));
      }
      injectJsonLd('trimit-jsonld-local', {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: seoPage.h1,
        description: seoPage.description || seo.description,
        url: canonical,
        inLanguage: 'en-IN',
        isPartOf: { '@type': 'WebSite', name: 'TrimiT', url: `${PUBLIC_SITE_URL}/` },
        about: {
          '@type': 'Service',
          name: seoPage.h1,
          areaServed: { '@type': 'City', name: JAMMU_CITY.label },
          provider: { '@type': 'Organization', name: 'TrimiT' },
        },
      });
    }

    const blogSlug = pathname.startsWith('/blog/') ? pathname.replace('/blog/', '') : null;
    const blogPost = blogSlug ? getPostBySlug(blogSlug) : null;
    if (blogPost) {
      injectJsonLd('trimit-jsonld-breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${PUBLIC_SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${PUBLIC_SITE_URL}/blog` },
          {
            '@type': 'ListItem',
            position: 3,
            name: blogPost.title,
            item: canonical,
          },
        ],
      });
    } else if (seoPage) {
      injectJsonLd('trimit-jsonld-breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${PUBLIC_SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: seoPage.h1, item: canonical },
        ],
      });
    }

    return () => jsonLdIds.forEach(removeJsonLd);
  }, [pathname]);

  return null;
}
