import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const appDir = path.resolve('.next/server/app');
const staticDir = path.resolve('.next/static');
const mime = (p) => p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.json') ? 'application/json' : 'text/html';

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/reports/model-supplier-performance') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ rows: [] }));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    const file = path.join(staticDir, url.pathname.replace('/_next/static/', ''));
    if (existsSync(file)) { res.writeHead(200, { 'content-type': mime(file) }); res.end(readFileSync(file)); return; }
  }
  const html = path.join(appDir, url.pathname === '/sales' ? 'sales.html' : 'reports.html');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(readFileSync(html));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
await page.locator('label', { hasText: 'Lãi từ' }).locator('input').fill('1234567');
await page.locator('label', { hasText: 'Tỷ lệ lỗi tối đa' }).locator('input').fill('12');
await page.getByRole('button', { name: /ÁP DỤNG/i }).click();
await page.waitForTimeout(300);
const afterApply = await page.evaluate(() => ({ url: location.href, saved: localStorage.getItem('mv-laptop:reports:filters:v1') }));
await page.goto(`${base}/sales`, { waitUntil: 'networkidle' });
await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
const restored = await page.evaluate(() => {
  const labels = Array.from(document.querySelectorAll('label'));
  const val = (needle) => labels.find((l) => l.textContent?.includes(needle))?.querySelector('input,select')?.value;
  return { url: location.href, profitMin: val('Lãi từ'), errorMax: val('Tỷ lệ lỗi tối đa'), saved: localStorage.getItem('mv-laptop:reports:filters:v1') };
});
console.log(JSON.stringify({ afterApply, restored }, null, 2));
if (!afterApply.saved) throw new Error('Apply did not write saved filters');
if (restored.profitMin !== '1234567' || restored.errorMax !== '12') throw new Error('Report filters did not persist after tab navigation');
await browser.close();
server.close();
