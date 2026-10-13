// Screenshots of the menus and the dialogue box, by clicking through a test adventure (review
// helper, not a test): node scripts/menu-shots.mjs <outDir> [width] [height]
// Run `npm run build` first, through `sh scripts/when-quiet.sh` rules (check quiet first).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [out = 'reports/tmp/menus', width = '1280', height = '720'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const snap = () => page.evaluate(() => window.__agentmon?.snapshot());
const shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name); };
const click = (name) => page.getByRole('button', { name }).first().click();

const team = 'spinnet:14,lullatee:15,druzling:12,puffbit:10';
const flags = 'got-partner,mission-1,beacon-lighthouse,beacon-canopy,sq-relay-done,sq-tea-done';
const items = 'berry-bun:3,honey-drop:2,moon-melon:1,pep-berry:2,swift-ribbon:1';
await page.goto(`${url}?quickstart&at=home,6,4&flags=${flags}&team=${team}&items=${items}&coins=900`);
await page.waitForFunction(() => window.__agentmon?.snapshot().scene === 'overworld', null, { timeout: 20000 });
await page.waitForTimeout(1200);
// talk to Gran (one step up faces her; A talks)
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(400);
await page.keyboard.press('KeyZ');
await page.waitForFunction(() => window.__agentmon?.snapshot().dialogue === true, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1500);
await shot('dialogue');
for (let i = 0; i < 12 && (await snap())?.dialogue; i++) { await page.keyboard.press('KeyZ'); await page.waitForTimeout(350); }
await page.keyboard.press('KeyM');
await page.waitForTimeout(600);
await shot('menu');
await click(/Team/); await shot('team');
await page.locator('.friend-btn').first().click(); await shot('friend');
await click(/Care/); await shot('care');
await click(/Pet/); await page.waitForTimeout(150); await shot('care-pet');
await click(/Dress up/); await shot('dress');
await page.locator('.acc-btn:not(.locked)').nth(1).click(); await shot('dress-hat');
await page.getByRole('button', { name: 'Back', exact: true }).first().click();
await click(/Play/); await page.waitForTimeout(4200); await shot('bubbles');
await page.getByRole('button', { name: 'Done' }).click({ timeout: 40000 });
await page.waitForTimeout(600);
await shot('care-after-play');
for (let i = 0; i < 4; i++) { const back = page.getByRole('button', { name: 'Back', exact: true }); if (await back.count()) await back.first().click(); await page.waitForTimeout(250); }
await click(/Bag/); await shot('bag');
await page.getByRole('button', { name: 'Back', exact: true }).first().click();
await click(/Field Guide/); await shot('guide');
await page.locator('.guide-btn:not([disabled])').first().click(); await shot('guide-entry');
console.log(errors.length ? `errors: ${errors.join(' | ')}` : 'no errors');
await browser.close();
