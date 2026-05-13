import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const appDir = path.resolve('.next/server/app');
const staticDir = path.resolve('.next/static');
const mime = (p) => p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html';
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/reports/model-supplier-performance') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ rows: [] })); return; }
  if (url.pathname.startsWith('/_next/static/')) { const file = path.join(staticDir, url.pathname.replace('/_next/static/', '')); if (existsSync(file)) { res.writeHead(200, { 'content-type': mime(file) }); res.end(readFileSync(file)); return; } }
  const html = path.join(appDir, url.pathname === '/sales' ? 'sales.html' : 'reports.html');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(readFileSync(html));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const readValues = () => {
  const labels = Array.from(document.querySelectorAll('label'));
  const val = (needle) => labels.find((l) => l.textContent?.includes(needle))?.querySelector('input,select')?.value ?? null;
  return { month: val('Tháng'), model: val('Model'), supplier: val('NCC'), profitMin: val('Lãi từ'), profitMax: val('Lãi đến'), errorMax: val('Tỷ lệ lỗi tối đa'), cfgProfitGood: val('Ngưỡng lãi tốt'), cfgProfitBad: val('Ngưỡng lãi thấp'), cfgErrorGood: val('Ngưỡng lỗi tốt'), cfgErrorBad: val('Ngưỡng lỗi xấu'), cfgTurnoverGood: val('Ngưỡng vòng quay tốt'), saved: localStorage.getItem('mv-laptop:reports:filters:v1'), settings: localStorage.getItem('mvLaptop.app.settings.v1') };
};
const fillLabel = async (label, value) => page.locator('label', { hasText: label }).locator('input,select').fill(String(value));
await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
await fillLabel('Lãi từ', 1111111); await fillLabel('Lãi đến', 8888888); await fillLabel('Tỷ lệ lỗi tối đa', 17);
await fillLabel('Ngưỡng lãi tốt', 3333333); await fillLabel('Ngưỡng lãi thấp', 444444); await fillLabel('Ngưỡng lỗi tốt', 9); await fillLabel('Ngưỡng lỗi xấu', 31); await fillLabel('Ngưỡng vòng quay tốt', 22);
await page.getByRole('button', { name: /ÁP DỤNG/i }).click(); await page.waitForTimeout(300);
const afterApply = await page.evaluate(readValues);
await page.goto(`${base}/sales`, { waitUntil: 'networkidle' }); await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
const restored = await page.evaluate(readValues);
const expected = { profitMin: '1111111', profitMax: '8888888', errorMax: '17', cfgProfitGood: '3333333', cfgProfitBad: '444444', cfgErrorGood: '9', cfgErrorBad: '31', cfgTurnoverGood: '22' };
const failures = Object.entries(expected).filter(([k, v]) => restored[k] !== v).map(([k, v]) => `${k}: expected ${v}, got ${restored[k]}`);
console.log(JSON.stringify({ afterApply, restored, failures }, null, 2));
if (failures.length) throw new Error(`Persistence failed: ${failures.join('; ')}`);
await browser.close(); server.close();
