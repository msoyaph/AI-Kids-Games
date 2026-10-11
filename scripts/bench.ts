// Run the in-game performance benchmark headlessly (GPU Chromium on macOS) and save the results.
//
//   npm run bench                      → Low, Medium and High at 1280×800 on a 2× (Retina) screen,
//                                        frame rate uncapped, writes bench-results.json
//   npm run bench -- --size 1024x768 --dpr 1 --vsync --out my-results.json
//
// Uses the built single file (npm run build first), served by vite preview.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { appendFileSync, writeFileSync } from 'node:fs';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1]! : d;
};
const [w, h] = arg('--size', '1280x800').split('x').map(Number) as [number, number];
const out = arg('--out', 'bench-results.json');
const dpr = Number(arg('--dpr', '2'));
// headless Chromium is capped at 60 fps by vsync; uncapped shows how much headroom each tier has
const vsync = process.argv.includes('--vsync');

const server = await preview({ preview: { port: 0, host: '127.0.0.1' } });
const url = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4173/';
const args = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--ignore-gpu-blocklist'];
if (!vsync) args.push('--disable-gpu-vsync', '--disable-frame-rate-limit');
const browser = await chromium.launch({ channel: 'chromium', args });
try {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.goto(`${url}?bench=all`);
  console.log(`benchmarking at ${w}×${h} @${dpr}x, ${vsync ? 'vsync on' : 'uncapped'} (about 2 minutes)…`);
  await page.waitForFunction(() => !!(window as unknown as { __benchResults?: unknown }).__benchResults, null, { timeout: 15 * 60_000, polling: 1000 });
  const results = await page.evaluate(() => (window as unknown as { __benchResults: unknown }).__benchResults);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return dbg ? String(gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  const report = { date: new Date().toISOString().slice(0, 10), viewport: `${w}×${h}`, deviceScaleFactor: dpr, vsync, gpu, results };
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.table(results);
  // CI: show the table on the run's summary page
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary && Array.isArray(results)) {
    const rows = (results as Record<string, unknown>[]).map((r) => `| ${r.tier} | ${r.avgFps} | ${r.low1Fps} | ${r.drawCalls} | ${r.triangles} | ${r.size} |`);
    appendFileSync(summary, [`### Benchmark (${w}×${h} @${dpr}x, ${vsync ? 'vsync' : 'uncapped'}, ${gpu})`, '', '| Tier | Avg FPS | 1% low | Draw calls | Triangles | Canvas |', '|---|---|---|---|---|---|', ...rows, ''].join('\n'));
  }
  console.log(`saved ${out} (GPU: ${gpu})`);
} finally {
  await browser.close();
  server.httpServer.close();
}
