/**
 * Post-build: snapshot marketing routes to dist/<route>/index.html for crawlers.
 * Requires: npm run build first, then node scripts/prerender-routes.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
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

const distDir = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error('[prerender] Run vite build first — dist/index.html missing.');
  process.exit(1);
}

const routes = PRERENDER_ROUTES.filter((r) => r !== '/');

function serveDist(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
      if (!filePath.includes(distDir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      fs.createReadStream(indexHtml).pipe(res);
    });
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

async function prerender() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.warn('[prerender] puppeteer not installed — skipping SSG (SPA only).');
    console.warn('[prerender] Install with: npm i -D puppeteer');
    process.exit(0);
  }

  const port = 4173;
  const server = await serveDist(port);
  const browser = await puppeteer.launch({ headless: true });
  const base = `http://127.0.0.1:${port}`;

  for (const route of routes) {
    const page = await browser.newPage();
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle0', timeout: 60000 });
    const html = await page.content();
    const outDir = path.join(distDir, route.replace(/^\//, ''));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    await page.close();
    console.log(`[prerender] ${route}`);
  }

  await browser.close();
  server.close();
  console.log('[prerender] Done.');
}

prerender().catch((err) => {
  console.warn('[prerender] Skipped — deploy continues as SPA:', err.message || err);
  process.exit(0);
});
