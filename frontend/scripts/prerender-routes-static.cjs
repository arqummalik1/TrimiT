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

const DEFAULT_SEO = {
  title: 'TrimiT — Book Salons & Saloons in Jammu | Haircut, Beard, Spa',
  description:
    'Book premium salons & hair saloons in Jammu online. Haircuts, beard grooming, spa, and beauty parlour appointments with live slots and instant confirmation. List your salon/saloon free on TrimiT.',
  keywords:
    'salon booking Jammu, saloon booking Jammu, best salons in Jammu, best saloons in Jammu, haircut Jammu, beard grooming Jammu, spa Jammu, saloon near me Jammu, salon near me Jammu, beauty parlour Jammu, TrimiT, trim it',
  robots: 'index, follow',
};

const JAMMU_CITY = {
  label: 'Jammu',
  region: 'Jammu & Kashmir',
};

const HOMEPAGE_FAQ = [
  {
    q: 'How do I book a salon or saloon appointment in Jammu on TrimiT?',
    a: 'Search for a service, salon, or saloon on TrimiT, pick an available time slot, and confirm your booking. You can browse salons and saloons in Jammu without an account; sign up when you are ready to book.',
  },
  {
    q: 'Is TrimiT available for salon/saloon booking near me in Jammu?',
    a: 'Yes. TrimiT lists salons and saloons across Jammu with distance sorting when you allow location, or defaults to central Jammu so you can find premium saloons near you in Jammu quickly.',
  },
  {
    q: 'Can I pay at the salon or saloon?',
    a: 'Many partner salons and saloons support pay-at-salon/cash-at-salon. Service prices are shown before you book so you know what to expect.',
  },
  {
    q: 'How do salon/saloon owners list on TrimiT?',
    a: 'Salon and saloon owners can list for free by signing up as an owner, creating a salon profile, and adding services. You will receive online bookings through your owner dashboard.',
  },
  {
    q: 'What services can I book in Jammu?',
    a: 'Haircuts, beard grooming, spa and wellness, facials, bridal makeup, beauty parlour, and beauty saloon services — all bookable through TrimiT in Jammu.',
  },
  {
    q: 'Do I need the Android app to book a saloon slot?',
    a: 'You can explore salons and saloons on the web. For the best booking experience and notifications, download the TrimiT Android app.',
  },
  {
    q: 'Are salon and saloon listings verified?',
    a: 'Salons and saloons on TrimiT are real businesses with profiles managed by owners. Customer reviews help you choose trusted professionals.',
  },
  {
    q: 'Can I cancel or reschedule a booking?',
    a: 'After signing in, manage your saloon/salon bookings from My Bookings. Cancellation policies may vary by salon.',
  },
];

const SEO_PAGES = [
  {
    path: '/salons-in-jammu',
    title: 'Salons & Saloons in Jammu | Book Online — TrimiT',
    description:
      'Browse salons and hair saloons in Jammu and book haircuts, grooming, spa, and beauty services online. Verified listings with live slots on TrimiT.',
    keywords:
      'salons in Jammu, saloons in Jammu, salon booking Jammu, saloon booking Jammu, best salons Jammu, best saloons Jammu, salon near me Jammu, saloon near me Jammu, TrimiT, trim it',
    h1: 'Salons & Saloons in Jammu — book online',
    faq: HOMEPAGE_FAQ.slice(0, 5),
  },
  {
    path: '/best-haircut-in-jammu',
    title: 'Best Haircut & Hair Saloon in Jammu | Book Salons — TrimiT',
    description:
      "Find the best hair salons & saloons and haircuts in Jammu. Book men's and women's haircut appointments online with live availability.",
    keywords: 'best haircut Jammu, hair salon Jammu, hair saloon Jammu, haircut near me Jammu, saloon near me Jammu, book haircut online, book saloon online',
    h1: 'Best haircut & hair saloon in Jammu',
    faq: [
      {
        q: 'How much does a haircut cost in Jammu?',
        a: 'Prices vary by salon and service. TrimiT shows starting prices on each salon profile before you book.',
      },
      {
        q: 'Can I book a same-day haircut in Jammu?',
        a: 'Yes — check live slots on TrimiT for same-day availability at salons/saloons near you.',
      },
    ],
  },
  {
    path: '/beard-trimming-jammu',
    title: "Beard Trimming Jammu | Men's Grooming Saloon — TrimiT",
    description:
      'Book beard trimming and grooming in Jammu. Expert barbers and gents saloons with online slots and reviews.',
    keywords: 'beard trimming Jammu, beard grooming Jammu, barber Jammu, saloon Jammu, gents saloon Jammu, men grooming Jammu',
    h1: 'Beard trimming & grooming saloon in Jammu',
    faq: [],
  },
  {
    path: '/spa-services-jammu',
    title: 'Spa Services Jammu | Book Spa & Massage Saloon — TrimiT',
    description:
      'Spa booking in Jammu — massages, wellness, and relaxation. Compare beauty salons & wellness saloons and book slots online.',
    keywords: 'spa Jammu, spa booking Jammu, spa services Jammu, massage Jammu, wellness saloon Jammu',
    h1: 'Spa & wellness services in Jammu',
    faq: [],
  },
  {
    path: '/beauty-parlours-jammu',
    title: 'Beauty Parlours Jammu | Book Women Beauty Saloons — TrimiT',
    description:
      "Women's beauty parlours & beauty saloons in Jammu — facials, threading, waxing, and hair. Book online on TrimiT.",
    keywords: 'beauty parlour Jammu, women salon Jammu, beauty saloon Jammu, facial Jammu, beauty services Jammu',
    h1: 'Beauty parlours & women saloons in Jammu',
    faq: [],
  },
  {
    path: '/mens-salon-jammu',
    title: "Men's Salon & Gents Saloon Jammu | Grooming & Haircuts — TrimiT",
    description:
      "Men's salons & gents saloons in Jammu for haircuts, beard care, and grooming packages. Book online with TrimiT.",
    keywords: 'men salon Jammu, gents saloon Jammu, mens grooming Jammu, barber shop Jammu, barber saloon Jammu',
    h1: "Men's salon & gents saloon in Jammu",
    faq: [],
  },
  {
    path: '/bridal-makeup-jammu',
    title: 'Bridal Makeup Jammu | Book Bridal Salons & Artists — TrimiT',
    description:
      'Bridal makeup services in Jammu — book trials and wedding day makeup artists or premium salons/saloons online on TrimiT.',
    keywords: 'bridal makeup Jammu, wedding makeup Jammu, bridal artist Jammu, bridal saloon Jammu',
    h1: 'Bridal makeup & styling in Jammu',
    faq: [],
  },
];

const SEO_BY_PATH = {
  '/': DEFAULT_SEO,
  '/explore': {
    title: 'Explore Salons & Saloons in Jammu | TrimiT',
    description:
      'Search and book premium salons and saloons in Jammu. Compare ratings, services, and live appointment slots on TrimiT.',
    keywords: 'explore salons Jammu, explore saloons Jammu, salon near me Jammu, saloon near me Jammu, book salon Jammu, book saloon Jammu',
    robots: 'index, follow',
  },
  '/for-salons': {
    title: 'List Your Salon & Saloon Free | TrimiT for Owners',
    description:
      'Take your salon or saloon online with TrimiT. Get more bookings, manage your calendar, and grow your business in Jammu.',
    keywords: 'salon software India, list saloon online, list salon online, salon booking system Jammu',
    robots: 'index, follow',
  },
  '/blog': {
    title: 'Salon & Saloon Booking Guides Jammu | TrimiT Blog',
    description: 'Tips for booking salons, grooming, and spa services in Jammu.',
    keywords: 'salon tips Jammu, saloon tips Jammu, grooming guide, TrimiT blog',
    robots: 'index, follow',
  },
  '/blog/best-salon-booking-tips-jammu': {
    title: 'Best Salon Booking Tips in Jammu | TrimiT Blog',
    description: 'Tips for booking salons, grooming, and spa services in Jammu.',
    keywords: 'salon booking Jammu, TrimiT blog',
    robots: 'index, follow',
  },
  '/blog/mens-grooming-guide-jammu': {
    title: "Men's Grooming Guide Jammu | TrimiT Blog",
    description: "Ultimate men's hair, beard, and skin care tips for Jammu climate.",
    keywords: 'salon booking Jammu, TrimiT blog',
    robots: 'index, follow',
  },
  '/blog/spa-wellness-jammu': {
    title: 'Spa & Wellness Guide Jammu | TrimiT Blog',
    description: 'Relaxation, massage, and spa therapies guide in Jammu.',
    keywords: 'salon booking Jammu, TrimiT blog',
    robots: 'index, follow',
  },
  '/signup': {
    title: 'Create Account | TrimiT Salon Booking',
    description: 'Create a free TrimiT account to book salon services and manage your appointments.',
    keywords: 'TrimiT sign up, create salon booking account',
    robots: 'index, follow',
  },
  '/login': {
    title: 'Sign In | TrimiT Salon Booking',
    description: 'Sign in to your TrimiT account to manage salon bookings and appointments.',
    keywords: 'TrimiT login, salon booking sign in',
    robots: 'index, follow',
  },
  '/contact': {
    title: 'Contact Us | TrimiT',
    description: 'Contact TrimiT support for help with bookings, accounts, and salon listings.',
    keywords: 'TrimiT contact, salon booking support',
    robots: 'index, follow',
  },
  '/privacy': {
    title: 'Privacy Policy | TrimiT',
    description: 'TrimiT privacy policy — how we collect, use, and protect your data.',
    keywords: 'TrimiT privacy policy, salon app privacy',
    robots: 'index, follow',
  },
  '/terms': {
    title: 'Terms of Service | TrimiT',
    description: 'TrimiT terms of service for customers and salon owners.',
    keywords: 'TrimiT terms of service, salon booking terms',
    robots: 'index, follow',
  },
};

// Map custom SEO Pages to SEO_BY_PATH
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

const PRERENDER_ROUTES = [
  '/',
  '/explore',
  '/for-salons',
  '/blog',
  '/salons-in-jammu',
  '/best-haircut-in-jammu',
  '/beard-trimming-jammu',
  '/spa-services-jammu',
  '/beauty-parlours-jammu',
  '/mens-salon-jammu',
  '/bridal-makeup-jammu',
  '/blog/best-salon-booking-tips-jammu',
  '/blog/mens-grooming-guide-jammu',
  '/blog/spa-wellness-jammu',
  '/signup',
  '/login',
  '/contact',
  '/privacy',
  '/terms',
];

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

  // 5. Inject Canonical Link
  const canonicalTag = `<link rel="canonical" href="${canonical}" />`;
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, canonicalTag);
  } else {
    html = html.replace(/(<\/title>)/i, `$1\n    ${canonicalTag}`);
  }

  // 6. Inject OpenGraph & Twitter Meta Tags
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

  html = html.replace(/(<\/title>)/i, `$1\n    ${socialMetaTags}`);

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
