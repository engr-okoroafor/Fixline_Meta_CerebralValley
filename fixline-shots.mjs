import { chromium } from 'playwright';
import fs from 'fs';
const out = '/workspace/fixline/shots/submit-v2';
fs.mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(name, setup) {
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  if (setup) await setup(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  console.log('saved', name);
}

const clickNav = async (page, label) => {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  if (await btn.count()) { await btn.click(); return; }
  const any = page.locator(`text=${label}`).first();
  await any.click({ timeout: 8000 }).catch(() => {});
};

await shot('01-home-benefits');
await shot('02-voice-igbo', async (p) => { await clickNav(p, 'Voice'); });
await shot('03-repair-upload', async (p) => { await clickNav(p, 'Repair'); });
await shot('04-ask-ai', async (p) => { await clickNav(p, 'Ask'); });
await shot('05-safety-docs', async (p) => { await clickNav(p, 'Safety'); });
await shot('06-scada', async (p) => { await clickNav(p, 'SCADA'); });
await shot('07-engineering', async (p) => { await clickNav(p, 'Engineering'); });
await shot('08-quality', async (p) => { await clickNav(p, 'Quality'); });
await shot('09-settings', async (p) => { await clickNav(p, 'Settings'); });
await page.goto(base + '/glasses', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/10-glasses.png`, fullPage: false });
console.log('saved 10-glasses');
await page.goto(base + '/xr', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/11-xr.png`, fullPage: false });
console.log('saved 11-xr');
await browser.close();
console.log('done');
