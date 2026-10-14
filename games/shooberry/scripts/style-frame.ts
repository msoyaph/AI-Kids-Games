// npx tsx scripts/style-frame.ts --before <old dist/index.html> --out <folder> [--headless]
//
// The style frame's evidence for the owner: the built game (dist/index.html, opened from file://)
// on the real GPU, at High, on a phone (844×390 at 3×) and a desktop (1440×900 at 2×), next to the
// previous look; then the squint check in rendered pixels: each unit alone on its tile (?scene=squint)
// against the same board empty, measured at full size and shrunk to 25%: its height against its
// tile's, its contrast with what's behind it, and each plant's main hue. Writes the PNGs, the 25%
// thumbnails, metrics.json and sheet.html (with a slot for a reference image that stays local).
// Heavy (a GPU browser): run it only when no other session is testing (pgrep "[p]laywright test").
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const out = resolve(opt('out') ?? 'captures/style-frame');
const after = pathToFileURL(resolve('dist/index.html')).href;
const before = opt('before') ? pathToFileURL(resolve(opt('before')!)).href : null;
mkdirSync(out, { recursive: true });

const DEVICES = {
  phone: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
} as const;
type DeviceName = keyof typeof DEVICES;

async function open(browser: Browser, device: DeviceName, url: string) {
  const context = await browser.newContext({ ...DEVICES[device], reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __shooberry?: { snapshot(): { screen: string } } }).__shooberry?.snapshot().screen === 'play', null, { timeout: 30_000 });
  await page.waitForTimeout(2600);
  return page;
}

async function shot(browser: Browser, device: DeviceName, url: string, file: string) {
  const page = await open(browser, device, url);
  await page.screenshot({ path: `${out}/${file}` });
  const snap = await page.evaluate(() => (window as unknown as { __shooberry: { snapshot(): Record<string, unknown> } }).__shooberry.snapshot());
  await page.context().close();
  return snap;
}

interface Tile { lane: number; col: number; x: number; y: number }
/** Measures each unit in the squint scene against the empty board, in the page (no image libraries). */
async function squint(browser: Browser, device: DeviceName) {
  const page = await open(browser, device, `${after}?scene=squint&quality=high`);
  const full = (await page.screenshot()).toString('base64');
  const snap = await page.evaluate(() => (window as unknown as { __shooberry: { snapshot(): { tiles: Tile[] } } }).__shooberry.snapshot());
  await page.context().close();
  const emptyPage = await open(browser, device, `${after}?scene=squint&empty=1&quality=high`);
  const empty = (await emptyPage.screenshot()).toString('base64');
  await emptyPage.context().close();
  const scale = DEVICES[device].deviceScaleFactor;
  const units = [
    { id: 'comfrey', lane: 1, col: 1, plant: true }, { id: 'rowan', lane: 1, col: 4, plant: true }, { id: 'boxwood', lane: 1, col: 7, plant: true },
    { id: 'snail', lane: 3, col: 1 }, { id: 'ant', lane: 3, col: 4 }, { id: 'magpie', lane: 3, col: 7 },
  ];
  const tile = (lane: number, col: number) => snap.tiles.find(t => t.lane === lane && t.col === col)!;
  const tw = tile(2, 5).x - tile(2, 4).x, td = tile(3, 4).y - tile(2, 4).y;
  const page2 = await browser.newPage();
  const result = await page2.evaluate(async ({ full, empty, units, tw, td, scale, tiles }) => {
    const load = async (b64: string) => { const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob()); const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d')!; g.drawImage(img, 0, 0); return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data }; };
    const shrink = (im: { w: number; h: number; d: Uint8ClampedArray }) => { const w = Math.floor(im.w / 4), h = Math.floor(im.h / 4), d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) { let s = 0; for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) s += im.d[((y * 4 + dy) * im.w + x * 4 + dx) * 4 + k]!; d[(y * w + x) * 4 + k] = s / 16; } return { w, h, d }; };
    const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (d: Uint8ClampedArray, i: number) => 0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!);
    const hueOf = (d: Uint8ClampedArray, i: number) => { const r = d[i]! / 255, g = d[i + 1]! / 255, b = d[i + 2]! / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; if (dd < 0.25 || mx < 0.35) return null; const h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; return (h * 60 + 360) % 360; };
    const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : 0; };
    const A = await load(full), B = await load(empty), a4 = shrink(A), b4 = shrink(B);
    const measure = (a: { w: number; d: Uint8ClampedArray }, b: { d: Uint8ClampedArray }, k: number, u: { lane: number; col: number }) => {
      const t = tiles.find((x: { lane: number; col: number }) => x.lane === u.lane && x.col === u.col)!;
      const x0 = Math.round((t.x - tw * 0.55) * k), x1 = Math.round((t.x + tw * 0.55) * k), y0 = Math.round((t.y - td * 1.9) * k), y1 = Math.round((t.y + td * 0.55) * k);
      let top = Infinity, bottom = -Infinity; const fg: number[] = [], bg: number[] = [], hues: number[] = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * a.w + x) * 4, diff = Math.abs(a.d[i]! - b.d[i]!) + Math.abs(a.d[i + 1]! - b.d[i + 1]!) + Math.abs(a.d[i + 2]! - b.d[i + 2]!);
        if (diff < 60) continue;
        top = Math.min(top, y); bottom = Math.max(bottom, y);
        fg.push(lum(a.d, i)); bg.push(lum(b.d, i));
        const h = hueOf(a.d, i); if (h !== null) hues.push(h);
      }
      // main hue: the fullest 20° bin
      const bins = new Array(18).fill(0); for (const h of hues) bins[Math.floor(h / 20) % 18]++;
      const best = bins.indexOf(Math.max(...bins));
      const lf = median(fg), lb = median(bg);
      return { heightPx: bottom - top + 1, contrast: (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05), hue: best * 20 + 10 };
    };
    return units.map(u => {
      const big = measure(A, B, scale, u), small = measure(a4, b4, scale / 4, u);
      return { id: u.id, plant: !!(u as { plant?: boolean }).plant, tileHeightPx: td * scale, heightOfTile: big.heightPx / (td * scale), heightAt25: small.heightPx, contrast: big.contrast, hue: big.hue };
    });
  }, { full, empty, units, tw, td, scale, tiles: snap.tiles });
  await page2.close();
  writeFileSync(`${out}/squint-${device}.png`, Buffer.from(full, 'base64'));
  return result;
}

const browser = await chromium.launch({ channel: 'chromium', headless: args.includes('--headless'), args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const metrics: Record<string, unknown> = {};
for (const device of Object.keys(DEVICES) as DeviceName[]) {
  metrics[`after-${device}`] = await shot(browser, device, `${after}?scene=style&quality=high`, `after-${device}.png`);
  if (before) metrics[`before-${device}`] = await shot(browser, device, `${before}?scene=style&quality=high`, `before-${device}.png`);
  for (const tier of ['low', 'medium'] as const) await shot(browser, device, `${after}?scene=style&quality=${tier}`, `after-${device}-${tier}.png`);
  metrics[`squint-${device}`] = await squint(browser, device);
}
// 25% thumbnails for the sheet (the browser does the shrinking)
const thumbs = await browser.newPage();
for (const name of ['after-phone', 'after-desktop', 'squint-phone', 'squint-desktop', ...(before ? ['before-phone', 'before-desktop'] : [])]) {
  const png = (await import('node:fs')).readFileSync(`${out}/${name}.png`).toString('base64');
  const small = await thumbs.evaluate(async b64 => { const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob()); const c = new OffscreenCanvas(Math.round(img.width / 4), Math.round(img.height / 4)); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); const blob = await c.convertToBlob({ type: 'image/png' }); return btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer()))); }, png);
  writeFileSync(`${out}/${name}-25.png`, Buffer.from(small, 'base64'));
}
await browser.close();
writeFileSync(`${out}/metrics.json`, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify({ squintPhone: metrics['squint-phone'], squintDesktop: metrics['squint-desktop'] }, null, 2));
void ({} as Page);
