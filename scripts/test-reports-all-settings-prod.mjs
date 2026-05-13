import { chromium } from 'playwright';

const base = process.env.MV_BASE || 'https://mvlaptop.tail37d548.ts.net';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

async function login() {
  await page.goto(`${base}/login?next=%2Freports`, { waitUntil: 'networkidle' });
  if (!page.url().includes('/login')) return;
  await page.locator('input').first().fill('admin');
  await page.locator('input').nth(1).fill('1234');
  await page.locator('button').first().click();
  await page.waitForTimeout(1500);
}

function jsReadValues() {
  const labels = Array.from(document.querySelectorAll('label'));
  const val = (needle) => labels.find((l) => l.textContent?.includes(needle))?.querySelector('input,select')?.value ?? null;
  return {
    url: location.href,
    month: val('Tháng'),
    model: val('Model'),
    supplier: val('NCC'),
    profitMin: val('Lãi từ'),
    profitMax: val('Lãi đến'),
    errorMax: val('Tỷ lệ lỗi tối đa'),
    cfgProfitGood: val('Ngưỡng lãi tốt'),
    cfgProfitBad: val('Ngưỡng lãi thấp'),
    cfgErrorGood: val('Ngưỡng lỗi tốt'),
    cfgErrorBad: val('Ngưỡng lỗi xấu'),
    cfgTurnoverGood: val('Ngưỡng vòng quay tốt'),
    reportFiltersStorage: localStorage.getItem('mv-laptop:reports:filters:v1'),
    appSettingsStorage: localStorage.getItem('mv-laptop:settings:v1'),
  };
}

async function fillLabel(label, value) {
  const control = page.locator('label', { hasText: label }).locator('input,select');
  await control.fill(String(value));
}

await login();
await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
if (page.url().includes('/login')) throw new Error('Login failed');

const before = await page.evaluate(jsReadValues);
await fillLabel('Lãi từ', 1111111);
await fillLabel('Lãi đến', 8888888);
await fillLabel('Tỷ lệ lỗi tối đa', 17);
await fillLabel('Ngưỡng lãi tốt', 3333333);
await fillLabel('Ngưỡng lãi thấp', 444444);
await fillLabel('Ngưỡng lỗi tốt', 9);
await fillLabel('Ngưỡng lỗi xấu', 31);
await fillLabel('Ngưỡng vòng quay tốt', 22);
await page.getByRole('button', { name: /ÁP DỤNG/i }).click();
await page.waitForTimeout(500);
const afterApply = await page.evaluate(jsReadValues);

await page.goto(`${base}/sales`, { waitUntil: 'networkidle' });
await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
const restored = await page.evaluate(jsReadValues);

const expected = {
  profitMin: '1111111',
  profitMax: '8888888',
  errorMax: '17',
  cfgProfitGood: '3333333',
  cfgProfitBad: '444444',
  cfgErrorGood: '9',
  cfgErrorBad: '31',
  cfgTurnoverGood: '22',
};
const failures = Object.entries(expected).filter(([k, v]) => restored[k] !== v).map(([k, v]) => `${k}: expected ${v}, got ${restored[k]}`);
console.log(JSON.stringify({ before, afterApply, restored, failures }, null, 2));
if (failures.length) throw new Error(`Persistence failed: ${failures.join('; ')}`);
await browser.close();
