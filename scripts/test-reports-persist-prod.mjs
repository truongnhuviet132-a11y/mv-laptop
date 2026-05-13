import { chromium } from 'playwright';

const base = process.env.MV_BASE || 'https://mvlaptop.tail37d548.ts.net';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${base}/login?next=%2Freports`, { waitUntil: 'networkidle' });
if (page.url().includes('/login')) {
  await page.locator('input').first().fill('admin');
  await page.locator('input').nth(1).fill('1234');
  await page.locator('button').first().click();
  await page.waitForTimeout(1500);
}
await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
if (page.url().includes('/login')) throw new Error('Login failed');
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
