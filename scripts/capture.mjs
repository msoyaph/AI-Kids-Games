// Deterministic race screenshots from the BUILT game (vite preview on :4173).
// Usage: node scripts/capture.mjs --out docs/upgrade/before --tracks a,b,c [--quality low,medium,high] [--time 14] [--size 1280x720]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const out = opt('--out', 'sim-report/shots');
const tracks = opt('--tracks', 'seashell-boardwalk').split(',');
const qualities = opt('--quality', 'high').split(',');
const raceTime = Number(opt('--time', '14'));
const [w, h] = opt('--size', '1280x720').split('x').map(Number);
const url = opt('--url', 'http://localhost:4173/');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const q of qualities) {
  for (const t of tracks) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => !!window.__calex?.app && !!document.querySelector('.big-logo'), null, { timeout: 60000 });
    const ok = await page.evaluate(
      async ({ t, q, raceTime }) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const a = window.__calex.app;
        a.saves.create(3, 'Shots');
        a.saves.settings.quality = q;
        a.saves.settings.showFps = false;
        a.applySettings();
        // lock the tier so Auto doesn't adapt during the capture
        a.gr.quality.setSetting(q);
        const { pickOpponents } = window.__calex.dev ?? {};
        void pickOpponents;
        a.startSession(
          {
            mode: 'versus',
            trackId: t,
            speedClass: 'pro',
            mirror: false,
            items: true,
            itemSet: 'all',
            laps: 3,
            players: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'stripes' }, source: { kind: 'any' } }],
            ai: ['pip', 'juno', 'mochi', 'grumbo', 'bo', 'fennel', 'luma'].map((id, i) => ({ racerId: id, kart: { body: ['bubble', 'zoomster', 'bubble', 'brick', 'pickup', 'scooter', 'royal'][i], wheels: 'standard', glider: 'kite', paint: ['ocean', 'grape', 'bubblegum', 'lime', 'sunny', 'tangerine', 'gold'][i], decal: 'none' } })),
            seed: 1234,
            intro: false,
          },
          () => {},
        );
        const s = a.session;
        if (!s) return false;
        const k = s.world.karts[0];
        k.player = -1;
        s.ai?.takeOver(k);
        k.player = 0;
        a.gr.quality.adaptive = false;
        a.loop.timeScale = 4;
        while (s.world.raceTime < raceTime) await sleep(50);
        a.loop.timeScale = 1;
        a.loop.simPaused = true;
        await sleep(400);
        return true;
      },
      { t, q, raceTime },
    );
    const file = `${out}/${t}-${q}.png`;
    if (ok) await page.screenshot({ path: file });
    console.log(ok ? file : `FAILED ${t}`, errors.length ? errors : '');
    await page.close();
  }
}
await browser.close();
