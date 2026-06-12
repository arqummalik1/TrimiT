/**
 * Post-build: snapshot marketing routes to dist/<route>/index.html with pre-populated SEO tags.
 * Runs during: npm run build (postbuild) on Vercel or local.
 * Zero external dependencies (no Puppeteer/Chromium required).
 */
const fs = require('fs');
const path = require('path');

const siteUrl = (
  process.env.REACT_APP_PUBLIC_SITE_URL ||
  process.env.VITE_PUBLIC_SITE_URL ||
  'https://trimit.online'
)
  .trim()
  .replace(/\/$/, '');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('[prerender-static] Run vite build first — dist/index.html missing.');
  process.exit(1);
}

// Centralized SEO data loaded directly from JSON config to avoid duplication & drift
const seoData = require('../src/config/seo-data.json');

const DEFAULT_SEO = seoData.DEFAULT_SEO;
const HOMEPAGE_FAQ = seoData.HOMEPAGE_FAQ;
const SEO_PAGES = seoData.SEO_PAGES;
const SEO_BY_PATH = { ...seoData.SEO_BY_PATH };

// Replicate mapping pages to path overrides
SEO_PAGES.forEach((p) => {
  SEO_BY_PATH[p.path] = {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    robots: 'index, follow',
    faq: p.faq,
    h1: p.h1,
  };
});

const JAMMU_CITY = {
  label: 'Jammu',
  region: 'Jammu & Kashmir',
};

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

function buildCanonicalUrl(pathname) {
  if (pathname === '/') return `${siteUrl}/`;
  return `${siteUrl}${pathname}`;
}

const templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const PRERENDER_ROUTES = seoData.STATIC_ROUTES.map((r) => r.path);

console.log('[prerender-static] Starting pre-rendering pass...');

for (const route of PRERENDER_ROUTES) {
  const seo = SEO_BY_PATH[route] || DEFAULT_SEO;
  const canonical = buildCanonicalUrl(route);

  let html = templateHtml;

  // 1. Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${seo.title}</title>`);

  // 2. Replace Meta Description
  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${seo.description}" />`);

  // 3. Inject Keywords
  const keywordsTag = `<meta name="keywords" content="${seo.keywords}" />`;
  if (html.includes('name="keywords"')) {
    html = html.replace(/<meta\s+name="keywords"\s+content=".*?"\s*\/?>/i, keywordsTag);
  } else {
    html = html.replace(/(<meta\s+name="description"\s+content=".*?"\s*\/?>)/i, `$1\n    ${keywordsTag}`);
  }

  // 4. Replace Robots tag
  html = html.replace(/<meta\s+name="robots"\s+content=".*?"\s*\/?>/i, `<meta name="robots" content="${seo.robots}" />`);

  // 5. Inject Canonical Link (Anchored near Title)
  const canonicalTag = `<link rel="canonical" href="${canonical}" />`;
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, canonicalTag);
  } else {
    html = html.replace(/(<\/title>)/i, `$1\n    ${canonicalTag}`);
  }

  // 6. Inject OpenGraph & Twitter Meta Tags (Anchored at </head> to avoid title/canonical regex collisions)
  const ogImage = `${siteUrl}/branding/og-image.png`;
  const socialMetaTags = `
    <meta property="og:title" content="${seo.title}" />
    <meta property="og:description" content="${seo.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TrimiT" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1252" />
    <meta property="og:image:height" content="527" />
    <meta property="og:image:alt" content="TrimiT — salon, spa, barber and beauty booking for Jammu and India" />
    <meta property="og:locale" content="en_IN" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.title}" />
    <meta name="twitter:description" content="${seo.description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="TrimiT — salon, spa, barber and beauty booking for Jammu and India" />
  `.trim();

  html = html.replace(/(<\/head>)/i, `${socialMetaTags}\n$1`);

  // 7. Inject JSON-LD Schema Blocks
  const schemas = [];

  // Common: Organization schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TrimiT',
    url: `${siteUrl}/`,
    logo: `${siteUrl}/branding/logo-horizontal.png`,
    areaServed: { '@type': 'City', name: JAMMU_CITY.label },
  });

  // Home or Explore: WebSite SearchAction schema
  if (route === '/' || route === '/explore') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TrimiT',
      url: `${siteUrl}/`,
      description: seo.description,
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/explore?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }

  // Home Specific: App and Local Service schemas + General FAQ
  if (route === '/') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'TrimiT',
      operatingSystem: 'Android',
      applicationCategory: 'LifestyleApplication',
      description: seo.description,
      url: `${siteUrl}/`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    });
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'TrimiT Salon Booking',
      provider: { '@type': 'Organization', name: 'TrimiT' },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'Jammu & Kashmir',
      },
      serviceType: 'Salon appointment booking',
    });
    schemas.push(faqSchema(HOMEPAGE_FAQ));
  }

  // Category specific FAQ
  if (seo.faq && seo.faq.length > 0) {
    schemas.push(faqSchema(seo.faq));
  }

  // Breadcrumbs for category pages
  if (seo.h1 && route !== '/') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: seo.h1, item: canonical },
      ],
    });
  }

  // Breadcrumbs for blog posts
  if (route.startsWith('/blog/')) {
    const blogTitle = seo.title.replace(' | TrimiT Blog', '');
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
        { '@type': 'ListItem', position: 3, name: blogTitle, item: canonical },
      ],
    });
  }

  const scriptSchemas = schemas
    .map((s) => `\n    <script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('');

  html = html.replace(/(<\/head>)/i, `${scriptSchemas}\n$1`);

  // Write file
  if (route === '/') {
    // Overwrite root index.html in dist
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log(`[prerender-static] Processed: ${route} -> dist/index.html`);
  } else {
    // Create route directory and write index.html
    const outDir = path.join(distDir, route.replace(/^\//, ''));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    console.log(`[prerender-static] Processed: ${route} -> ${route.replace(/^\//, '')}/index.html`);
  }
}

console.log('[prerender-static] All routes pre-rendered successfully.');
