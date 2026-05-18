import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  const rootLen = (await page.locator('#root').innerHTML()).length;
  const bodyText = await page.locator('body').innerText();
  console.log('URL:', url);
  console.log('ROOT HTML length:', rootLen);
  console.log('Body text preview:', bodyText.slice(0, 300).replace(/\n/g, ' '));
  console.log('Errors:', errors.length ? errors.join('\n') : '(none)');
} catch (e) {
  console.error('Navigation failed:', e.message);
}
await browser.close();
