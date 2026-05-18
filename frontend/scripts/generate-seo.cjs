/**
 * Writes robots.txt and sitemap.xml into public/ before CRA build.
 * Uses REACT_APP_PUBLIC_SITE_URL (defaults to https://trimit.online).
 */
const fs = require('fs');
const path = require('path');

let siteUrl = (process.env.REACT_APP_PUBLIC_SITE_URL || 'https://trimit.online')
  .trim()
  .replace(/\/$/, '');

// Production SEO must use the public domain, not a *.vercel.app preview URL.
if (/\.vercel\.app$/i.test(siteUrl) && !/trimit\.online/i.test(siteUrl)) {
  console.warn(
    `[generate-seo] REACT_APP_PUBLIC_SITE_URL is "${siteUrl}" — using https://trimit.online for robots/sitemap.`
  );
  siteUrl = 'https://trimit.online';
}

const publicDir = path.join(__dirname, '..', 'public');
const lastmod = new Date().toISOString().split('T')[0];

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
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
