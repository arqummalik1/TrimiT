/**
 * Writes robots.txt and sitemap.xml into public/ before build.
 * Uses REACT_APP_PUBLIC_SITE_URL or VITE_PUBLIC_SITE_URL.
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

if (!siteUrl) {
  console.error('[generate-seo] PUBLIC_SITE_URL is empty.');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const lastmod = new Date().toISOString().split('T')[0];

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/explore', changefreq: 'daily', priority: '0.95' },
  { path: '/for-salons', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/salons-in-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/best-haircut-in-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/beard-trimming-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/spa-services-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/beauty-parlours-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/mens-salon-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/bridal-makeup-jammu', changefreq: 'weekly', priority: '0.85' },
  { path: '/blog/best-salon-booking-tips-jammu', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog/mens-grooming-guide-jammu', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog/spa-wellness-jammu', changefreq: 'monthly', priority: '0.6' },
  { path: '/signup', changefreq: 'monthly', priority: '0.8' },
  { path: '/login', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.5' },
];

function locFor(routePath) {
  return routePath === '/' ? `${siteUrl}/` : `${siteUrl}${routePath}`;
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

const robots = `# TrimiT (${siteUrl})
User-agent: *
Allow: /
Allow: /explore
Allow: /for-salons
Allow: /blog
Allow: /salons-in-jammu
Allow: /best-haircut-in-jammu
Allow: /beard-trimming-jammu
Allow: /spa-services-jammu
Allow: /beauty-parlours-jammu
Allow: /mens-salon-jammu
Allow: /bridal-makeup-jammu
Disallow: /discover
Disallow: /salon/
Disallow: /booking/
Disallow: /my-bookings
Disallow: /account
Disallow: /owner/
Disallow: /auth/
Disallow: /reset-password

Sitemap: ${siteUrl}/sitemap.xml
`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots, 'utf8');

console.log(`[generate-seo] Wrote robots.txt and sitemap.xml for ${siteUrl}`);
