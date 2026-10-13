/**
 * Audio report: renders every sound effect and song offline (Web Audio OfflineAudioContext
 * in headless Chromium, through the game's real mix chain) and prints loudness + peaks
 * against the targets in src/audio/mix.ts. Exits 1 if anything is out of range or clips.
 *
 * Usage: npm run audio-report   (builds first; nothing is played aloud)
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const file = resolve('dist/index.html');
if (!existsSync(file)) {
  console.error('dist/index.html missing — run npm run build first');
  process.exit(2);
}
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.goto(`${pathToFileURL(file).href}?audioreport=1`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => typeof (window as unknown as { __audioReport?: unknown }).__audioReport === 'function', null, { timeout: 120_000 });
  const res = await page.evaluate(() => (window as unknown as { __audioReport: () => Promise<{ rows: Array<{ ok: boolean }>; text: string }> }).__audioReport());
  if (process.argv.includes('--json')) console.log(JSON.stringify(res.rows));
  else console.log(res.text);
  process.exitCode = res.rows.every((r) => r.ok) ? 0 : 1;
} finally {
  await browser.close();
}
