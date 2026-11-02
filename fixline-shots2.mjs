import { chromium } from 'playwright';
import fs from 'fs';
const out = '/workspace/fixline/shots/submit-v2';
fs.mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const clickNav = async (label) => {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  if (await btn.count()) { await btn.click(); return; }
  await page.locator(`text=${label}`).first().click({ timeout: 8000 }).catch(()=>{});
};
async function shot(name, setup) {
  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
  if (setup) await setup();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  console.log('saved', name);
}
await shot('06-scada', async () => clickNav('SCADA'));
await shot('07-engineering', async () => clickNav('Engineering'));
await shot('08-quality', async () => clickNav('Quality'));
await shot('09-settings', async () => clickNav('Settings'));
await page.goto(base + '/glasses', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/10-glasses.png`, fullPage: false });
console.log('saved 10-glasses');
await page.goto(base + '/xr', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/11-xr.png`, fullPage: false });
console.log('saved 11-xr');
await browser.close();
