/**
 * Screenshot review suite: both maps, all six heroes, the four bosses (Grumblecap, Clockjaw,
 * the Gloam Regent, Old Rime), menus, and the HUD at Low / Medium / High (desktop) and the
 * Tablet tier (touch, with the glass controls). Contact sheets per group for a critical look.
 *
 * Usage: npm run build && npx tsx scripts/screenshot-review.ts [outDir=shots/review-final]
 */
import { chromium, devices, type BrowserContextOptions, type Page } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve(process.argv[2] ?? 'shots/review-final');
mkdirSync(out, { recursive: true });
const dist = resolve('dist/index.html');
if (!existsSync(dist)) {
  console.error('dist/index.html missing — run npm run build first');
  process.exit(2);
}
const url = pathToFileURL(dist).href;
const desktop: BrowserContextOptions = { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 };
const { defaultBrowserType: _, ...tablet } = devices['iPad Pro 11 landscape'];

interface Shot {
  group: string;
  name: string;
  label: string;
  context: BrowserContextOptions;
  query: string;
  /** In-page setup (gets `g` = window.__theabonk); null = stay on the title screen. */
  setup: string | null;
  /** Seconds to let the game run after setup. */
  wait: number;
}

const run = (hero: string, map: string, at: number, keepEvents: boolean, extra = ''): string => `
  g.startRun('${hero}', '${map}');
  const w = g.world;
  w.time = ${at};
  ${keepEvents ? '' : 'w.director.eventIndex = w.map.events.filter((e) => e.time <= w.time).length;'}
  ${extra}`;

const SHOTS: Shot[] = [
  { group: 'menus', name: 'title-meadow', label: 'Title (Gloam Meadow backdrop)', context: desktop, query: '?seed=7', setup: null, wait: 1 },
  { group: 'menus', name: 'select', label: 'Hero select', context: desktop, query: '?seed=7', setup: `document.querySelector('.btn.primary')?.click();`, wait: 1 },
];
for (const hero of ['thea', 'pip', 'brindle', 'ottie', 'bramble', 'nova']) {
  SHOTS.push({ group: 'heroes', name: `hero-${hero}`, label: `${hero} — Gloam Meadow, 2:00`, context: desktop, query: '?seed=7&quality=high', setup: run(hero, 'meadow', 120, false), wait: 6 });
}
SHOTS.push(
  { group: 'maps', name: 'meadow-dusk', label: 'Gloam Meadow — dusk (0:20)', context: desktop, query: '?seed=7&quality=high', setup: run('thea', 'meadow', 14, false), wait: 6 },
  { group: 'maps', name: 'meadow-night', label: 'Gloam Meadow — deep night (12:00)', context: desktop, query: '?seed=7&quality=high', setup: run('thea', 'meadow', 714, false), wait: 6 },
  { group: 'maps', name: 'rimewood-dusk', label: 'Rimewood — dusk (0:20)', context: desktop, query: '?seed=7&quality=high', setup: run('thea', 'rimewood', 14, false), wait: 6 },
  { group: 'maps', name: 'rimewood-night', label: 'Rimewood — aurora night (12:00)', context: desktop, query: '?seed=7&quality=high', setup: run('thea', 'rimewood', 714, false), wait: 6 },
  { group: 'bosses', name: 'boss-grumblecap', label: 'Grumblecap (5:00)', context: desktop, query: '?seed=7&quality=high', setup: run('thea', 'meadow', 296, true), wait: 9 },
  { group: 'bosses', name: 'boss-clockjaw', label: 'Clockjaw (10:00)', context: desktop, query: '?seed=7&quality=high', setup: run('brindle', 'meadow', 596, true, 'w.director.eventIndex = w.map.events.filter((e) => e.time < 590).length;'), wait: 9 },
  { group: 'bosses', name: 'boss-regent', label: 'The Gloam Regent (15:00)', context: desktop, query: '?seed=7&quality=high', setup: run('nova', 'meadow', 896, true, 'w.director.eventIndex = w.map.events.filter((e) => e.time < 890).length;'), wait: 10 },
  { group: 'bosses', name: 'boss-oldrime', label: 'Old Rime, the Frost Stag (Rimewood 15:00)', context: desktop, query: '?seed=7&quality=high', setup: run('ottie', 'rimewood', 896, true, 'w.director.eventIndex = w.map.events.filter((e) => e.time < 890).length;'), wait: 10 },
);
for (const q of ['low', 'medium', 'high']) {
  SHOTS.push({ group: 'tiers', name: `hud-${q}`, label: `HUD + wave — ${q}`, context: desktop, query: `?seed=7&quality=${q}&stress=400`, setup: run('thea', 'meadow', 400, true), wait: 8 });
}
SHOTS.push({ group: 'tiers', name: 'hud-tablet', label: 'HUD + wave — Tablet tier (iPad, glass controls)', context: tablet, query: '?seed=7&stress=400', setup: run('thea', 'meadow', 400, true), wait: 8 });

async function capture(page: Page, s: Shot): Promise<void> {
  await page.goto(url + s.query, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown }).__theabonk, null, { timeout: 60_000 });
  if (s.setup) await page.evaluate(`(() => { const g = window.__theabonk; ${s.setup} })()`);
  await page.waitForTimeout(s.wait * 1000);
  // a level-up or chest may have popped up: take it, then let the scene settle
  for (let k = 0; k < 6 && (await page.locator('.screen-levelup .card, .screen-chest .btn').first().isVisible().catch(() => false)); k++) {
    await page.locator('.screen-levelup .card, .screen-chest .btn').first().click().catch(() => undefined);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: `${out}/${s.name}.png` });
}

const browser = await chromium.launch({ args: process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : [] });
for (const s of SHOTS) {
  const ctx = await browser.newContext(s.context);
  const page = await ctx.newPage();
  try {
    await capture(page, s);
    console.log(`✓ ${s.name}`);
  } catch (e) {
    console.log(`✗ ${s.name}: ${(e as Error).message.split('\n')[0]}`);
  }
  await ctx.close();
}
// contact sheets
for (const group of [...new Set(SHOTS.map((s) => s.group))]) {
  const list = SHOTS.filter((s) => s.group === group);
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#17112a;color:#fff8ec;font:600 15px system-ui}
    .grid{display:grid;grid-template-columns:repeat(2,880px);gap:16px}img{width:880px;border-radius:8px;display:block}figure{margin:0}</style>
    <h2>TheaBonk — ${group}</h2><div class="grid">${list.map((s) => `<figure><img src="${s.name}.png"><figcaption>${s.label}</figcaption></figure>`).join('')}</div>`;
  writeFileSync(`${out}/sheet-${group}.html`, html);
  const p = await (await browser.newContext({ viewport: { width: 1820, height: 900 } })).newPage();
  await p.goto(pathToFileURL(`${out}/sheet-${group}.html`).href);
  await p.screenshot({ path: `${out}/sheet-${group}.png`, fullPage: true });
}
await browser.close();
