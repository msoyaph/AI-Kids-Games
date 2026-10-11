// Dev tool: CPU-profile the stress test and print the hottest functions (self time).
//   node scripts/cpuprofile.mjs [cpuThrottle=4] [seconds=5]
import { chromium } from '@playwright/test';
const [rate = '4', secs = '5'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chromium' });
const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
await page.goto('file://' + process.cwd() + '/dist/index.html?stress=300&quality=high');
await page.waitForFunction(() => !!window.__perf);
await page.waitForTimeout(3000);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
await page.waitForTimeout(Number(secs) * 1000);
const { profile } = await cdp.send('Profiler.stop');
await browser.close();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const counts = new Map();
for (const id of profile.samples) counts.set(id, (counts.get(id) ?? 0) + 1);
let total = 0;
for (const [id, c] of counts) {
  const n = byId.get(id);
  const f = n.callFrame;
  const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop().slice(0, 20)}:${f.lineNumber}`;
  self.set(key, (self.get(key) ?? 0) + c);
  total += c;
}
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [k, c] of top) console.log(((c / total) * 100).toFixed(1).padStart(5) + '%  ' + k);
