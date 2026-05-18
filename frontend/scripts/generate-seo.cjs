/**
 * Writes robots.txt and sitemap.xml into public/ before CRA build.
 * Always uses the production marketing domain (not *.vercel.app preview URLs).
 */
const fs = require('fs');
const path = require('path');

/** Public site — must match Search Console property and Play/legal URLs. */
const CANONICAL_SITE_URL = 'https://trimit.online';

const publicDir = path.join(__dirname, '..', 'public');
const lastmod = new Date().toISOString().split('T')[0];

const envUrl = (process.env.REACT_APP_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
if (envUrl && envUrl !== CANONICAL_SITE_URL && /\.vercel\.app$/i.test(envUrl)) {
  console.warn(
    `[generate-seo] Ignoring REACT_APP_PUBLIC_SITE_URL="${envUrl}" for robots/sitemap — using ${CANONICAL_SITE_URL}.`
  );
  console.warn('  Fix Vercel Production env: REACT_APP_PUBLIC_SITE_URL=https://trimit.online');
}

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/signup', changefreq: 'monthly', priority: '0.8' },
  { path: '/login', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.5' },
];

function locFor(routePath) {
  return routePath === '/' ? `${CANONICAL_SITE_URL}/` : `${CANONICAL_SITE_URL}${routePath}`;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${locFor(r.path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const robots = `# TrimiT (${CANONICAL_SITE_URL})
User-agent: *
Allow: /
Disallow: /discover
Disallow: /salon/
Disallow: /booking/
Disallow: /my-bookings
Disallow: /account
Disallow: /owner/
Disallow: /auth/
Disallow: /reset-password

Sitemap: ${CANONICAL_SITE_URL}/sitemap.xml
`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots, 'utf8');

console.log(`[generate-seo] Wrote robots.txt and sitemap.xml for ${CANONICAL_SITE_URL}`);
