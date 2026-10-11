/**
 * Glass touch-controller design mock-ups: captures real game frames on a phone and a tablet
 * (calm dusk, a big wave, night, bright Rimewood snow), overlays the glass controls from
 * src/ui/glass.css in different states, in fake-glass and real-blur versions, and builds a
 * contact sheet per device plus a close-up sheet of every control state.
 *
 * Usage: npm run build && npx tsx scripts/glass-mockups.ts [outDir=test-results/glass-mockups]
 */
import { chromium, devices, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GLYPHS } from '../src/input/glassGlyphs';
import { buttonSizes, defaultLayout, stickBase, type GlassSize } from '../src/input/glassLayout';

const out = resolve(process.argv[2] ?? 'test-results/glass-mockups');
mkdirSync(out, { recursive: true });
const dist = resolve('dist/index.html');
if (!existsSync(dist)) {
  console.error('dist/index.html missing — run npm run build first');
  process.exit(2);
}
const url = pathToFileURL(dist).href;
const css = readFileSync('src/ui/glass.css', 'utf8');
// the mock hides the phase-8 controls and makes room for Pause in the top-right corner
const mockCss = `.touch-ui,.bench-badge,.toasts{display:none!important}
html.touch .hud-tr{right:calc(max(.8rem, env(safe-area-inset-right)) + 58px)!important}`;

interface State {
  /** Stick: push angle (deg, 0 = up, clockwise) and amount 0..1; null = idle. */
  push: [number, number] | null;
  hurt?: boolean;
  fast?: boolean;
  jumpDown?: boolean;
  slideDown?: boolean;
  latched?: boolean;
  hc?: boolean;
}

const DEVICES = {
  phone: { ...devices['iPhone 15 landscape'], deviceScaleFactor: 2 },
  tablet: { ...devices['iPad Pro 11 landscape'], deviceScaleFactor: 2 },
};

type SceneName = 'dusk-calm' | 'big-wave' | 'night' | 'snow-bright';
const SCENES: Array<{ name: SceneName; label: string; state: State }> = [
  { name: 'dusk-calm', label: 'Calm dusk — idle', state: { push: null } },
  { name: 'big-wave', label: 'Big wave + boss — stick pushed, Jump pressed (ripple)', state: { push: [42, 0.9], jumpDown: true } },
  { name: 'night', label: 'Night — hurt flash on the stick, Slide latched (toggle mode)', state: { push: [-70, 0.75], hurt: true, latched: true } },
  { name: 'snow-bright', label: 'Bright Rimewood snow — fast slide glow, Slide held', state: { push: [8, 1], fast: true, slideDown: true } },
];

async function setScene(page: Page, name: SceneName): Promise<void> {
  const q = name === 'big-wave' ? '?bench=1&seconds=900&map=meadow' : '?seed=7';
  await page.goto(url + q, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown }).__theabonk, null, { timeout: 60_000 });
  await page.evaluate((name) => {
    type W = { time: number; director: { eventIndex: number }; map: { events: Array<{ time: number }> } };
    const g = (window as unknown as { __theabonk: { world: W | null; startRun(c: string, m: string): void; advance(s: number): void } }).__theabonk;
    const at = (t: number): void => {
      const w = g.world!;
      w.time = t;
      // skip the scripted events (bosses) before t so a calm scene stays calm
      w.director.eventIndex = w.map.events.filter((e) => e.time <= t).length;
    };
    if (name === 'big-wave') {
      g.world!.time = 430;
      g.advance(14);
    } else {
      g.startRun('thea', name === 'snow-bright' ? 'rimewood' : 'meadow');
      if (name === 'night') at(650);
      if (name === 'snow-bright') at(1120);
      g.advance(name === 'dusk-calm' ? 5 : 7);
    }
    // freeze the frame: stop the loop, draw once more
    window.requestAnimationFrame = () => 0;
    g.advance(1 / 60);
  }, name);
}

async function overlay(page: Page, state: State, blur: boolean, size: GlassSize = 'm'): Promise<void> {
  const vp = page.viewportSize()!;
  const layout = defaultLayout(vp.width, vp.height, size, { l: 0, r: 0, t: 0, b: 0 });
  const base = stickBase(vp.width, vp.height, size);
  const btn = buttonSizes(base);
  await page.evaluate(
    ({ g, layout, base, btn, state, blur, size }) => {
      document.querySelector('.glass-ui')?.remove();
      const travel = base * 0.3;
      const [ang, mag] = state.push ?? [0, 0];
      const r = (ang * Math.PI) / 180;
      const kx = Math.sin(r) * mag * travel;
      const ky = -Math.cos(r) * mag * travel;
      const hx = 38 - Math.sin(r) * mag * 12;
      const hy = 30 + Math.cos(r) * mag * 12;
      const stickCls = ['glass', 'gstick', state.push ? 'active' : 'idle', state.hurt ? 'hurt' : '', state.fast ? 'fast' : ''].join(' ');
      const ripple = '<span class="g-ripple" style="left:42%;top:46%;animation-delay:-0.17s;animation-play-state:paused"></span>';
      const root = document.createElement('div');
      root.className = ['glass-ui', blur ? 'blur-layer blur-on' : '', state.hc ? 'hc' : ''].join(' ');
      root.dataset.size = size;
      root.innerHTML = `
        <div class="${stickCls}" style="--sx:${layout.stick.x}px;--sy:${layout.stick.y}px;--ang:${ang}deg;--mag:${mag};--mang:${ang}deg">
          ${g.stickChevrons}<div class="gstick-ring"></div><div class="gstick-halo"></div>${g.speed}
          <div class="glass gstick-knob" style="--kx:${kx}px;--ky:${ky}px;--hx:${hx}%;--hy:${hy}%"></div>
        </div>
        <button class="glass gbtn gbtn-jump${state.jumpDown ? ' down' : ''}" style="--x:${layout.jump.x}px;--y:${layout.jump.y}px;--d:${btn.jump}px" aria-label="Jump">
          <div class="g-clip">${state.jumpDown ? ripple : ''}</div>${g.jump}<span>JUMP</span></button>
        <button class="glass gbtn gbtn-slide${state.slideDown ? ' down' : ''}${state.latched ? ' latched' : ''}" style="--x:${layout.slide.x}px;--y:${layout.slide.y}px;--d:${btn.slide}px" aria-label="Slide">
          <div class="g-clip">${state.slideDown ? ripple : ''}</div><i class="g-dot"></i>${g.slide}<span>SLIDE</span></button>
        <button class="glass gbtn gbtn-pause" style="--x:${layout.pause.x}px;--y:${layout.pause.y}px" aria-label="Pause">${g.pause}</button>`;
      document.getElementById('ui')!.append(root);
    },
    { g: GLYPHS, layout, base, btn, state, blur, size },
  );
  // let the blur layer / ripple settle
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ args: process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : [] });
const sheets: string[] = [];
for (const [dev, opts] of Object.entries(DEVICES)) {
  const context = await browser.newContext(opts);
  // tsx (esbuild keepNames) wraps named inner functions in __name(); give the page one
  await context.addInitScript('window.__name = (f) => f');
  const page = await context.newPage();
  const tiles: Array<{ file: string; label: string }> = [];
  for (const sc of SCENES) {
    await setScene(page, sc.name);
    await page.addStyleTag({ content: css + mockCss });
    for (const blur of [false, true]) {
      await overlay(page, sc.state, blur);
      const file = `${dev}-${sc.name}-${blur ? 'blur' : 'fake'}.png`;
      await page.screenshot({ path: `${out}/${file}` });
      tiles.push({ file, label: `${sc.label} · ${blur ? 'real blur' : 'fake glass'}` });
      console.log(`${dev} ${sc.name} ${blur ? 'blur' : 'fake'}`);
    }
  }
  // close-ups of every state (tablet only: biggest controls), over the calm and the snow frames
  if (dev === 'tablet') {
    const states: Array<[string, State]> = [
      ['Idle (fixed stick)', { push: null }],
      ['Pushing + Jump pressed', { push: [42, 0.9], jumpDown: true }],
      ['Hurt flash', { push: [-70, 0.75], hurt: true }],
      ['Fast slide + Slide held', { push: [8, 1], fast: true, slideDown: true }],
      ['Slide latched (toggle)', { push: [0, 0.4], latched: true }],
      ['High-contrast controls', { push: [42, 0.9], jumpDown: true, hc: true }],
    ];
    const vp = page.viewportSize()!;
    for (const scene of ['dusk-calm', 'snow-bright'] as const) {
      await setScene(page, scene);
      await page.addStyleTag({ content: css + mockCss });
      for (const [k, [label, st]] of states.entries()) {
        for (const blur of [false, true]) {
          await overlay(page, st, blur);
          const file = `states-${scene}-${k}-${blur ? 'blur' : 'fake'}.png`;
          await page.screenshot({ path: `${out}/${file}`, clip: { x: 0, y: vp.height * 0.6, width: vp.width, height: vp.height * 0.4 } });
          tiles.push({ file, label: `${label} · ${scene === 'dusk-calm' ? 'dusk' : 'snow'} · ${blur ? 'real blur' : 'fake glass'}` });
        }
      }
    }
  }
  await context.close();
  // contact sheets: fake | blur side by side
  const mk = (name: string, list: typeof tiles, width: number): void => {
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:24px;background:#17112a;color:#fff8ec;font:600 15px 'Trebuchet MS',system-ui,sans-serif}
      h1{font-size:22px;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(2,${width}px);gap:18px 18px}
      figure{margin:0}img{width:${width}px;display:block;border-radius:10px}figcaption{margin-top:6px;opacity:.85}</style>
      <h1>TheaBonk glass controller — ${name}</h1><div class="grid">${list.map((t) => `<figure><img src="${t.file}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`;
    const file = `${out}/sheet-${name}.html`;
    writeFileSync(file, html);
    sheets.push(file);
  };
  mk(dev, tiles.filter((t) => !t.file.startsWith('states-')), dev === 'phone' ? 852 : 900);
  if (dev === 'tablet') mk('states', tiles.filter((t) => t.file.startsWith('states-')), 900);
}
// render the sheets to PNG
const ctx = await browser.newContext({ viewport: { width: 1900, height: 1000 }, deviceScaleFactor: 1 });
const sp = await ctx.newPage();
for (const f of sheets) {
  await sp.goto(pathToFileURL(f).href);
  await sp.waitForLoadState('load');
  await sp.screenshot({ path: f.replace(/\.html$/, '.png'), fullPage: true });
  console.log(`sheet → ${f.replace(/\.html$/, '.png')}`);
}
await browser.close();
