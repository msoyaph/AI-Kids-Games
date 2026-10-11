// Exports a REAL save from the built game (vite preview on :4173) as a test fixture: plays Time Trials with the
// autopilot so genuine ghosts/records are written, adds progress, then dumps every calexcart.* localStorage key.
// Usage: node scripts/makeFixture.mjs [--out tests/fixtures/save-v2.json]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const i = args.indexOf('--out');
const out = i >= 0 ? args[i + 1] : 'tests/fixtures/save-v2.json';

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => !!window.__calex?.app && !!document.querySelector('.big-logo'), null, { timeout: 60000 });
const dump = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const a = window.__calex.app;
  localStorage.clear();
  a.saves.create(1, 'Fixture');
  a.saves.settings.quality = 'low';
  a.saves.settings.steeringAssist = true;
  a.saves.settings.master = 0.55;
  a.saves.settings.cameraDistance = 1.2;
  a.saves.saveSettings();
  a.applySettings();
  const tt = async (trackId) => {
    a.flow.mode = 'timeTrial';
    a.flow.players = 1;
    a.flow.racers = ['calex'];
    a.flow.tt.ghost = 'staff';
    a.screens.startTimeTrial(trackId);
    await sleep(300);
    const s = a.session;
    const k = s.world.karts[0];
    k.player = -1;
    s.ai.takeOver(k);
    k.player = 0;
    a.gr.quality.adaptive = false;
    a.loop.timeScale = 8;
    while (!document.querySelector('.results, .screen.results, [data-screen="results"]') && !(s.world.phase === 'done' && a.ui.current?.classList?.contains('results'))) {
      await sleep(100);
      if (s.world.phase === 'done') {
        await sleep(1500);
        break;
      }
    }
    a.loop.timeScale = 1;
    await sleep(500);
    a.endSession();
  };
  await tt('seashell-boardwalk');
  await tt('frostpeak-pass');
  const d = a.saves.data;
  // progress a typical mid-game player would have
  d.trophies['sunrise:rookie'] = 'gold';
  d.trophies['sunrise:pro'] = 'silver';
  d.trophies['thunder:rookie'] = 'bronze';
  d.unlocks.cups = [...new Set([...d.unlocks.cups, 'galaxy'])];
  d.unlocks.racers = [...new Set([...d.unlocks.racers, 'mochi'])];
  d.unlocks.paints = [...new Set([...d.unlocks.paints, 'gold'])];
  d.stats.races += 12;
  d.stats.wins += 4;
  d.stats.driftSeconds += 321.5;
  d.stats.miniTurbos += 88;
  d.challenges['first-win'] = { done: true, progress: 1 };
  d.newUnlocks = [{ kind: 'paint', id: 'gold' }];
  d.racer = 'mochi';
  a.saves.save();
  // second slot: a fresh save
  a.saves.create(2, 'Sis');
  a.saves.load(1);
  const keys = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('calexcart.')) keys[k] = localStorage.getItem(k);
  }
  return keys;
});
writeFileSync(out, JSON.stringify({ exportedFrom: 'calex-cart main@5ea2ca9 (save v2, settings v1)', keys: dump }, null, 1));
const sizes = Object.entries(dump).map(([k, v]) => `${k}: ${v.length} chars`);
console.log(sizes.join('\n'), errors.length ? errors : '');
await browser.close();
