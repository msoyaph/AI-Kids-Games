// Visual review: screenshots of every world mid-battle, bosses, HUD, tower
// panel, specialization chooser and menus on desktop + phones →
// docs/screenshots/after/*.jpg. Uses the dev server (window.__game, Vite modules)
// and the autoplay bot to fast-forward each scene.
//   node scripts/review-shots.mjs [filter]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';

const filter = process.argv[2] ?? '';
const OUT = 'docs/screenshots/after';
mkdirSync(OUT, { recursive: true });

const VIEW = {
  desktop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 },
  phone: { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true },
  portrait: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true },
};

/** Runs in the page: fast-forward the match with the bot, then keep it playing live. */
const battle = async (o) => {
  const s = window.__game;
  const g = s.game;
  const { AutoPlayer } = await import('/src/sim/autoplay.ts');
  s.modal?.close();
  s.modal = null;
  s.paused = false;
  const bot = new AutoPlayer(g, {});
  for (let i = 0; g.state === 'playing' && i < 30 * 60 * 45; i++) {
    bot.update();
    g.step();
    g.events.clear();
    if (o.boss ? g.enemies.some((e) => e.def.boss && e.x > 4) && i % 30 === 0 : g.waveNum >= o.wave && g.enemies.length >= 14) break;
  }
  if (!o.spec) s.onFrame(() => bot.update());
  s.speed = 1;
  if (o.panel || o.spec) {
    g.coins = Math.max(g.coins, 5000);
    const t = o.spec ? g.towers.find((x) => x.level <= 2 && x.def.specs) : [...g.towers].sort((a, b) => b.level - a.level)[0];
    if (t && o.spec) while (t.level < 2 && g.upgrade(t)) {}
    if (t) {
      s.selectTower(t);
      if (o.spec) s.upgradeSelected();
    }
  }
  return { wave: g.waveNum, towers: g.towers.length, enemies: g.enemies.length };
};

const SCENES = [
  { name: 'title-desktop', view: 'desktop', url: '/' },
  { name: 'title-phone', view: 'phone', url: '/' },
  ...[1, 2, 3, 4, 5, 6].map((w) => ({ name: `world${w}-desktop`, view: 'desktop', url: `/?map=w${w}m${w % 3 === 0 ? 1 : 2}&diff=normal`, setup: { wave: 12 + w } })),
  { name: 'map-phone', view: 'phone', url: '/?map=w2m2&diff=normal', setup: { wave: 14 } },
  { name: 'map-portrait', view: 'portrait', url: '/?map=w2m2&diff=normal', setup: { wave: 14 } },
  { name: 'tower-panel-desktop', view: 'desktop', url: '/?map=w3m2&diff=normal', setup: { wave: 16, panel: true } },
  { name: 'tower-panel-phone', view: 'phone', url: '/?map=w3m2&diff=normal', setup: { wave: 16, panel: true } },
  { name: 'spec-desktop', view: 'desktop', url: '/?map=w1m2&diff=normal', setup: { wave: 9, spec: true } },
  { name: 'boss1-desktop', view: 'desktop', url: '/?map=w1m3&diff=normal', setup: { boss: true } },
  { name: 'boss4-desktop', view: 'desktop', url: '/?map=w4m3&diff=normal', setup: { boss: true } },
  { name: 'boss-phone', view: 'phone', url: '/?map=w2m3&diff=normal', setup: { boss: true } },
  { name: 'worlds-desktop', view: 'desktop', url: '/?screen=worlds' },
  { name: 'research-desktop', view: 'desktop', url: '/?screen=research' },
  { name: 'codex-phone', view: 'phone', url: '/?screen=encyclopedia' },
  { name: 'workshop-desktop', view: 'desktop', url: '/?screen=workshop' },
  { name: 'briefing-phone', view: 'phone', url: '/?brief=w5m1' },
  { name: 'settings-phone', view: 'phone', url: '/?screen=settings&lang=fil' },
].filter((s) => s.name.includes(filter));

const server = await createServer({ logLevel: 'error', server: { port: 4321, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist'] });
for (const sc of SCENES) {
  const ctx = await browser.newContext({ ...VIEW[sc.view], reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + sc.url);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60_000 });
  let info = '';
  if (sc.setup) {
    await page.waitForFunction(() => !!window.__game?.game, null, { timeout: 30_000 });
    await page.waitForTimeout(600);
    info = JSON.stringify(await page.evaluate(battle, sc.setup));
    // one-time hints and badge banners from the fast-forward are not what the shot is about
    await page.evaluate(() => document.querySelectorAll('.tip-card').forEach((e) => e.remove()));
    await page.waitForFunction(() => !document.querySelector('.banner'), null, { timeout: 15_000 }).catch(() => {});
    if (sc.setup.spec) await page.locator('.tpanel button', { hasText: /Specialize/ }).first().click({ timeout: 5000 }).catch((e) => console.log('spec click:', String(e).slice(0, 120)));
    await page.waitForTimeout(1200);
  } else {
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: `${OUT}/${sc.name}.jpg`, type: 'jpeg', quality: 78 });
  console.log(`${sc.name.padEnd(22)} ${info}${errors.length ? '  ERRORS: ' + errors.join('; ') : ''}`);
  await ctx.close();
}
await browser.close();
await server.close();
