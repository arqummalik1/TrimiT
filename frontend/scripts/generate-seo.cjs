/**
 * Writes robots.txt and sitemap.xml into public/ before build.
 * Uses REACT_APP_PUBLIC_SITE_URL or VITE_PUBLIC_SITE_URL.
 */
const fs = require('fs');
const path = require('path');
const seoData = require('../src/config/seo-data.json');

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
const lastmodDate = new Date().toISOString().split('T')[0];

const staticRoutes = seoData.STATIC_ROUTES;

function locFor(routePath) {
  return routePath === '/' ? `${siteUrl}/` : `${siteUrl}${routePath}`;
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();

async function getSalons() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[generate-seo] Supabase credentials missing from env. Skipping dynamic sitemap generation.');
    return [];
  }
  
  // Try querying the dedicated read-only view first (for safety and schema isolation)
  const viewUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/salons_sitemap?select=id,created_at`;
  const tableUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/salons?select=id,created_at`;
  
  try {
    console.log(`[generate-seo] Attempting to fetch dynamic salons from view: ${viewUrl}`);
    const response = await fetch(viewUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[generate-seo] Fetched ${data.length} salons successfully from view.`);
      return data;
    }
    console.warn(`[generate-seo] View fetch failed with status ${response.status}. Falling back to direct table query.`);
  } catch (error) {
    console.warn(`[generate-seo] View fetch failed: ${error.message}. Falling back to direct table query.`);
  }

  // Fallback to querying public.salons table directly if the migration is not yet run
  try {
    console.log(`[generate-seo] Fetching dynamic salons from table fallback: ${tableUrl}`);
    const response = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Supabase API table fallback responded with status ${response.status}`);
    }
    const data = await response.json();
    console.log(`[generate-seo] Fetched ${data.length} salons successfully from table fallback.`);
    return data;
  } catch (error) {
    console.warn(`[generate-seo] Failed to fetch dynamic salons from fallback: ${error.message}. Deferring to static routes.`);
    return [];
  }
}

async function main() {
  const salons = await getSalons();
  const dynamicRoutes = salons.map((salon) => {
    const lastmod = salon.created_at ? salon.created_at.split('T')[0] : lastmodDate;
    return {
      path: `/salon/${salon.id}`,
      changefreq: 'daily',
      priority: '0.80',
      lastmod
    };
  });

  const routes = [
    ...staticRoutes.map(r => ({ ...r, lastmod: lastmodDate })),
    ...dynamicRoutes
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${locFor(r.path)}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  const seoAllowPaths = staticRoutes
    .map((r) => r.path)
    .filter(
      (p) =>
        p !== '/' &&
        !p.startsWith('/login') &&
        !p.startsWith('/signup') &&
        !p.startsWith('/privacy') &&
        !p.startsWith('/terms') &&
        !p.startsWith('/contact') &&
        !p.startsWith('/help/')
    );

  const robots = `# TrimiT (${siteUrl})
User-agent: *
Allow: /
${seoAllowPaths.map((p) => `Allow: ${p}`).join('\n')}
Allow: /salon/
Disallow: /discover
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
}

main().catch(err => {
  console.error('[generate-seo] Error executing main sitemap builder:', err);
  process.exit(1);
});
