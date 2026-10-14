// A local before/after sheet from two folders of shots (scripts/shots.mjs), one PNG per device.
//   node scripts/compare.mjs <before-dir> <after-dir> <out-dir> [tiers=low,medium,high]
// Any other image in <out-dir> (a quality reference the owner dropped in) is shown beside the High shots.
// Everything stays in reports/ (git-ignored): never commit these sheets.
import { chromium } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [before, after, out, tiersArg = 'low,medium,high'] = process.argv.slice(2);
const tiers = tiersArg.split(',');
const stats = dir => (existsSync(`${dir}/stats.json`) ? JSON.parse(readFileSync(`${dir}/stats.json`, 'utf8')) : {});
const sb = stats(before), sa = stats(after);
const refs = readdirSync(out).filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !f.startsWith('compare-')).map(f => resolve(out, f));
const ref = refs[0];
const url = p => pathToFileURL(resolve(p)).href;
const k = n => (n === undefined || n === null ? '—' : `${Math.round(n / 1000)}k`);
const line = s => (s ? `${s.zoom ? `${s.zoom} px/tile · ` : ''}${s.draws} draws · ${k(s.tris)} tris drawn${s.drawsMax && (s.drawsMax !== s.draws || s.trisMax !== s.tris) ? ` (shadow-redraw frames ${s.drawsMax} / ${k(s.trisMax)})` : ''} · ${s.fps ?? '—'} fps${s.gpuMB ? ` · ≈${s.gpuMB} MB GPU · ${s.heapMB} MB JS heap · ${s.programs} shaders` : ''}` : '');
const browser = await chromium.launch();
for (const device of ['phone', 'desktop']) {
  const w = device === 'phone' ? 300 : 620;
  const rows = tiers.map(t => `
    <h2>${t[0].toUpperCase() + t.slice(1)}</h2>
    <div class="row">
      <figure><img src="${url(`${before}/${device}-${t}.png`)}" style="width:${w}px"><figcaption><b>Before</b> · ${line(sb[`${device}-${t}`])}</figcaption></figure>
      <figure><img src="${url(`${after}/${device}-${t}.png`)}" style="width:${w}px"><figcaption><b>After</b> · ${line(sa[`${device}-${t}`])}<br><b>Zoomed all the way out</b> · ${line(sa[`${device}-${t}-out`])}</figcaption></figure>
      ${existsSync(`${after}/${device}-${t}-out.png`) ? `<figure><img src="${url(`${after}/${device}-${t}-out.png`)}" style="width:${Math.round(w * 0.6)}px"><figcaption>After, zoomed out</figcaption></figure>` : ''}
      ${t === 'high' && refs.length ? `<figure>${refs.map(r => `<img src="${url(r)}" style="width:${device === 'phone' ? 420 : w}px;margin-bottom:8px">`).join('')}<figcaption><b>Quality reference</b> (owner's screenshots, local only, not our art)</figcaption></figure>` : ''}
    </div>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 24px; font: 15px system-ui, sans-serif; background: #f4f1e8; color: #2d3a2a; }
    h1 { margin: 0 0 8px; } h2 { margin: 18px 0 8px; font-size: 18px; }
    .row { display: flex; gap: 18px; align-items: flex-start; }
    figure { margin: 0; } img { display: block; border-radius: 10px; box-shadow: 0 4px 16px #0002; }
    figcaption { margin-top: 6px; font-size: 13px; max-width: ${w}px; }
  </style><h1>Style frame · ${device}</h1>${rows}`;
  const file = resolve(out, `compare-${device}.html`);
  writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width: Math.round((w + 18) * (ref ? 3.6 : 2.6)) + 48, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href);
  await page.waitForLoadState('load');
  await page.screenshot({ path: resolve(out, `compare-${device}.png`), fullPage: true });
  await page.close();
  console.log(resolve(out, `compare-${device}.png`));
}
await browser.close();
