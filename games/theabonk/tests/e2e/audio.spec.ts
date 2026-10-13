import { expect, test } from '@playwright/test';

/**
 * Every sound and song, rendered offline through the real mix chain, must sit inside its
 * loudness window, and nothing may pass the limiter ceiling (src/audio/mix.ts). Same check
 * as `npm run audio-report`. Chromium only (compressor implementations differ slightly).
 */
test('mix: every sound and song within its loudness target, nothing clips', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'measured on Chromium');
  test.setTimeout(240_000);
  await page.goto('/?audioreport=1');
  await page.waitForFunction(() => typeof (window as unknown as { __audioReport?: unknown }).__audioReport === 'function', null, { timeout: 60_000 });
  const res = await page.evaluate(() => (window as unknown as { __audioReport: () => Promise<{ rows: Array<{ name: string; ok: boolean; peak: number }>; text: string }> }).__audioReport());
  const bad = res.rows.filter((r) => !r.ok);
  expect(bad, res.text).toEqual([]);
  expect(Math.max(...res.rows.map((r) => r.peak))).toBeLessThanOrEqual(-0.95);
});
