// Screenshots of the glass touch controls in a live race on every track, for review.
// Usage (vite preview on :4173): node scripts/captureTouch.mjs --out sim-report/touch/shots [--tracks a,b] [--quality low,medium,high]
//   [--device phone|tablet] [--hc]   (thumb on the stick, a drift tier lit, an item held, DRIFT pressed)
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const out = opt('--out', 'sim-report/touch/shots');
const qualities = opt('--quality', 'low,medium,high').split(',');
const device = opt('--device', 'phone');
const hc = args.includes('--hc');
const dev = device === 'tablet' ? devices['iPad (gen 7) landscape'] : devices['iPhone 13 landscape'];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const tracks = opt('--tracks', '');
if (!tracks) {
  console.log('Usage: node scripts/captureTouch.mjs --tracks a,b,c [--quality low,medium,high] [--device phone|tablet] [--hc] [--out dir]');
  process.exit(1);
}
const list = tracks.split(',');
for (const q of qualities) {
  const ctx = await browser.newContext({ ...dev, defaultBrowserType: undefined });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => !!window.__calex?.app && !!document.querySelector('.big-logo'));
  for (const t of list) {
    const res = await page.evaluate(
      async ({ t, q, hc }) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const a = window.__calex.app;
        if (!a.saves.data) a.saves.create(3, 'Shots');
        a.saves.settings.quality = q;
        a.saves.settings.controlsSeen = { keyboard: true, gamepad: true, touch: true };
        a.saves.settings.touch = { ...a.saves.settings.touch, highContrast: hc };
        a.applySettings();
        a.gr.quality.setSetting(q);
        a.startSession({ mode: 'versus', trackId: t, speedClass: 'pro', mirror: false, items: true, itemSet: 'all', laps: 3,
          players: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'stripes' }, source: { kind: 'any' } }],
          ai: ['pip', 'juno', 'mochi', 'grumbo', 'bo', 'fennel', 'luma'].map((id) => ({ racerId: id, kart: { body: 'bubble', wheels: 'standard', glider: 'kite', paint: 'ocean', decal: 'none' } })), seed: 1234, intro: false }, () => {});
        const s = a.session;
        const k = s.world.karts[0];
        k.player = -1; s.ai.takeOver(k); k.player = 0;
        a.gr.quality.adaptive = false;
        a.loop.timeScale = 4;
        while (s.world.raceTime < 16) await sleep(40);
        a.loop.timeScale = 1;
        a.loop.simPaused = true;
        // the touch state for the shot: thumb pushing right on the stick, tier-2 drift, an item held, DRIFT down
        const tc = a.input.touch;
        const L = tc.layout;
        const stick = document.querySelector('.tc-stick');
        stick.classList.add('active');
        stick.style.left = `${L.stick.x - L.stick.d / 2}px`;
        const knob = document.querySelector('.tc-knob');
        const tr = L.stick.d * 0.3;
        knob.style.transform = `translate(${(tr * 0.7).toFixed(1)}px, ${(-tr * 0.12).toFixed(1)}px)`;
        knob.style.setProperty('--kx', '0.7');
        knob.style.setProperty('--ky', '-0.12');
        tc.setRaceState(2, 'turbo3', false);
        document.querySelector('.tc-drift').classList.add('down');
        await sleep(420);
        return { glass: tc.glass, tier: a.gr.quality.level };
      },
      { t, q, hc },
    );
    await page.screenshot({ path: `${out}/${device}-${t}-${q}${hc ? '-hc' : ''}.png` });
    console.log(`${device}-${t}-${q}`, res.glass, errors.length ? errors : '');
    await page.evaluate(() => window.__calex.app.endSession());
  }
  await ctx.close();
}
await browser.close();
