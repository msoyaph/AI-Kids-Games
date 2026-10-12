// Runs the in-game performance test (?bench=1) in headless Chromium against the BUILT game (vite preview :4173)
// and prints the results card.  npm run bench -- [--quality low|medium|high|auto] [--seconds 60]
//   [--profile desktop|tablet|phone] (tablet = 1024×768 DPR 2 touch + 4× CPU throttle; phone = 844×390 DPR 3 + 4×)
//   [--shot out.png] [--json out.json] [--swiftshader]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const quality = opt('--quality', 'auto');
const seconds = opt('--seconds', '60');
const profile = opt('--profile', 'desktop');
const shot = opt('--shot', null);
const json = opt('--json', null);
const controls = opt('--controls', null); // none | fake | blur (touch controls on screen during the run)
const swift = args.includes('--swiftshader');
const PROFILES = {
  desktop: { viewport: { width: 1280, height: 720 } },
  tablet: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
  phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' },
};
const browser = await chromium.launch({ args: swift ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(PROFILES[profile] ?? PROFILES.desktop);
const page = await ctx.newPage();
if (profile !== 'desktop') {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://localhost:4173/?bench=1&seconds=${seconds}&quality=${quality}${controls ? `&controls=${controls}` : ''}`);
await page.waitForSelector('.bench-card', { timeout: (Number(seconds) + 90) * 1000 });
const text = await page.evaluate(() => document.querySelector('.bench-card').innerText);
if (shot) await page.screenshot({ path: shot });
const result = await page.evaluate(() => window.__calex.lastBench ?? null);
if (json && result) writeFileSync(json, JSON.stringify({ profile, ...result }, null, 1));
console.log(`[${profile} · ${quality}${controls ? ` · controls ${controls}` : ''}]\n${text}${errors.length ? `\nERRORS: ${errors.join(' | ')}` : ''}`);
await browser.close();
