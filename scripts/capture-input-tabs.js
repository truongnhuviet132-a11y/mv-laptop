const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  await page.goto('http://localhost:3000/input', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Sửa chữa' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'ui-tab-sua-chua.png', fullPage: true });

  await page.getByRole('button', { name: 'Bảo hành' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'ui-tab-bao-hanh.png', fullPage: true });

  await page.getByRole('button', { name: 'Chi phí khác' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'ui-tab-chi-phi-khac.png', fullPage: true });

  await browser.close();
})();
