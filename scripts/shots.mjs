// Screenshots of every scene for visual review (and the before/after report).
//
//   node scripts/shots.mjs [--out shots] [--q medium] [--size 1280x720] [--only hub,map,...] [--base http://localhost:5391]
//
// Starts a fresh game in a headless (GPU) Chromium against the dev server (or a built dist served by
// `vite preview`), then visits each shot, closes dialogue/toasts, saves <out>/<shot>_<q>.png and prints
// draw calls, triangles and JS heap. `--q` can list several tiers: low,medium,high.
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const out = arg('out', 'shots');
const tiers = arg('q', 'medium').split(',');
const [W, H] = arg('size', '1280x720').split('x').map(Number);
const base = arg('base', 'http://localhost:5391');
const only = arg('only', '');

const AREAS = ['moon_base', 'mercury_craters', 'venus_surface', 'mars_landing', 'mars_canyon', 'mars_icecap', 'mars_olympus', 'ceres_station', 'europa_ice', 'callisto_crash', 'ganymede_caves', 'titan_lakes', 'miranda_cliffs', 'triton_geysers', 'pluto_heart', 'zephyra_village', 'zephyra_crystal', 'zephyra_bubble', 'zephyra_sky', 'zephyra_beacon'];

/** name → [scene, params, wait ms, optional js run after arriving]. */
const SHOTS = {
  hub: ['hub', {}, 1800],
  board: ['board', {}, 1600],
  codex: ['codex', {}, 1800],
  badges: ['badges', {}, 1600],
  lounge: ['lounge', {}, 1600],
  shop: ['shop', {}, 1800],
  hangar: ['hangar', {}, 1800],
  map: ['map', {}, 2600],
  flight: ['flight', { from: 'earth', to: 'earth' }, 3000],
  flight_belt: ['flight', { from: 'mars', to: 'jupiter' }, 3000, 'beltWarp'],
  race: ['flight', { from: 'saturn', to: 'saturn', course: 'race_ripple' }, 3500],
  landing: ['landing', { body: 'moon' }, 4200],
  ...Object.fromEntries(AREAS.map((a) => [`explore_${a}`, ['explore', { area: a }, 1400]])),
  cutscene_zibbo: ['cutscene', { id: 'zibbo' }, 3000],
  cutscene_starpath: ['cutscene', { id: 'starpath' }, 3000],
  cutscene_wormhole: ['cutscene', { id: 'wormhole' }, 3000],
  cutscene_finale: ['cutscene', { id: 'finale' }, 3800],
  credits: ['credits', {}, 5000],
  complete: ['complete', {}, 2000],
};

const names = only ? only.split(',') : ['title', 'slots', ...Object.keys(SHOTS)];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function skip(page) {
  for (let i = 0; i < 60; i++) {
    const d = page.getByTestId('dialogue');
    if (!(await d.isVisible().catch(() => false))) {
      if (i > 2) break;
      await page.waitForTimeout(150);
      continue;
    }
    await d.click({ force: true }).catch(() => {});
    await page.waitForTimeout(80);
  }
}

const stats = (page) =>
  page.evaluate(() => {
    const S = window.__spacesky;
    // The 2D build (main) has no 3D renderer stats.
    if (!S.game.r3) return '2D build';
    const st = S.game.r3.stats();
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;
    return `${st.calls} calls · ${Math.round(st.triangles / 1000)}k tris · ${st.geometries} geo · ${st.textures} tex · ${mem} MB heap`;
  });

for (const q of tiers) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/?debug&q=${q}`);
  await page.getByTestId('btn-play').waitFor({ timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.waitForTimeout(1200);
  const snap = async (name) => {
    await page.evaluate(() => document.querySelectorAll('.toast, .tip-card, .confetti-layer').forEach((e) => e.remove()));
    await page.screenshot({ path: path.join(out, `${name}_${q}.png`) });
    console.log(`${name}_${q}: ${await stats(page)}`);
  };
  if (names.includes('title')) await snap('title');
  await page.getByTestId('btn-play').click({ force: true });
  await page.getByTestId('slot-0').waitFor();
  await page.waitForTimeout(500);
  if (names.includes('slots')) await snap('slots');
  await page.getByTestId('slot-0').click({ force: true });
  await page.getByTestId('name-input').waitFor();
  await page.getByTestId('name-input').fill('Nova');
  await page.getByTestId('btn-start').click({ force: true });
  await page.getByTestId('hub-banner').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await skip(page);
  // A mid-game feel: some coins, Zibbo on the team, no onboarding tips.
  await page.evaluate(() => {
    const S = window.__spacesky;
    S.settings.tips = false;
    S.state.data.coins = 480;
    S.state.setFlag('zibboJoined');
  });
  for (const name of names) {
    const shot = SHOTS[name];
    if (!shot) continue;
    const [scene, params, wait, extra] = shot;
    await page.evaluate(([s, p]) => {
      const S = window.__spacesky;
      if (s === 'explore') S.state.setFlag(`intro:${p.area}`);
      return S.game.go(s, p);
    }, [scene, params]);
    await page.waitForTimeout(300);
    if (scene !== 'cutscene') await skip(page);
    if (extra === 'beltWarp') {
      // Park the ship in the middle of the asteroid belt.
      await page.evaluate(() => {
        const sc = window.__spacesky.game.current;
        const s = sc.getShip();
        const b = sc.getLayout().world.asteroids?.[0];
        if (b) {
          s.x = b.x - 500;
          s.y = b.y;
          s.h = b.h ?? 0;
        }
      });
    }
    await page.waitForTimeout(wait);
    await snap(name);
  }
  if (errors.length) console.log(`[${q}] console:\n  ${errors.slice(0, 15).join('\n  ')}`);
  await page.close();
}
await browser.close();
