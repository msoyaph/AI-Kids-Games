// Generate the HyperFrames compositions from reel.config.ts: one project per cut and format
// (build/<cut>-<16x9|9x16>/index.html), with the trimmed shots, the mixed sound, the site's
// Nunito font, the brand wordmark and icon (docs/brand) and the game logos copied in. GSAP comes from npm, not a CDN.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import ffprobe from '@ffprobe-installer/ffprobe';
import { at, type Block, type Cut, FORMATS, type Format, game, type Line, root, selectCuts, sizzle, type Shot } from '../reel.config';
import { HANDLE, mixAudio, segments, trim, type Segment } from '../render/media';

const require = createRequire(import.meta.url);
const sizes = new Map<string, [number, number]>();
/** Pixel size of a trimmed clip (phones and tablets are recorded at their own sizes). */
function dims(file: string): [number, number] {
  if (!sizes.has(file)) { const [w, h] = execFileSync(ffprobe.path, ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number); sizes.set(file, [w, h]); }
  return sizes.get(file)!;
}
const INK = '#16191F', PAPER = '#F5F6F8', GO = '#0B7A50', GO_LIGHT = '#3CCB86', SLATE = '#5A6272';
/** The brand (docs/brand): the wordmark, light on video and dark on paper, and the icon. */
const WORDMARK = (light: boolean) => `<img class="wm" src="brand/${light ? 'wordmark-dark' : 'wordmark'}.png" alt="">`;
const ICON = '<img class="icon" src="brand/icon.webp" alt="">';
/** The wordmark pops in (logo sting, end card). */
const popIn = (c: Composition, id: string, t: number) => c.js.push(`tl.fromTo('#${id} .wm', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' }, ${r3(t)});`);
const CHECK = `<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${GO}"/><path d="m7 12.5 3.2 3.2L17.2 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r3 = (n: number) => +n.toFixed(3);
/** Card-grow transition: the next shot opens in a rounded card from the bottom-left (6 frames). */
const GROW = 6 / 60, TEXT_IN = 8 / 60;

/** Track allocator: timed elements on one track never overlap. */
class Tracks {
  private ends: number[] = [];
  constructor(private base: number) {}
  take(start: number, end: number) {
    let i = this.ends.findIndex(e => e <= start + 1e-6);
    if (i < 0) { i = this.ends.length; this.ends.push(0); }
    this.ends[i] = end; return this.base + i;
  }
}

class Composition {
  html: string[] = [];
  js: string[] = [];
  private n = 0;
  readonly video = new Tracks(1);
  readonly over = new Tracks(40);
  /** Stacking base of the current block: each block sits above the one before it. */
  zb = 0;
  /** Seconds a block's pictures stay under the next block's growing card. */
  tail = 0.12;
  constructor(readonly cut: Cut, readonly format: Format, readonly W: number, readonly H: number) {}
  id(prefix: string) { return `${prefix}${++this.n}`; }

  /** A shot in a positioned box: the video is sized to cover the box around the shot's focus. */
  shot(seg: Segment, box: { x: number; y: number; w: number; h: number; r?: number; z: number; blur?: boolean; grow?: boolean; extra?: number }) {
    const file = `media/${seg.key}.mp4`, src = dims(trim(seg));
    const zoom = (seg.shot.zoom ?? 1) * (box.blur ? 1.15 : 1), [fx, fy] = seg.shot.focus ?? [0.5, 0.5];
    const scale = Math.max(box.w / src[0], box.h / src[1]) * zoom, vw = src[0] * scale, vh = src[1] * scale;
    const left = Math.min(0, Math.max(box.w - vw, box.w / 2 - fx * vw)), top = Math.min(0, Math.max(box.h - vh, box.h / 2 - fy * vh));
    const start = seg.start, dur = seg.duration + (box.extra ?? 0), fid = this.id('f'), vid = this.id('v');
    this.html.push(`<div class="frame" id="${fid}" style="left:${r3(box.x)}px;top:${r3(box.y)}px;width:${r3(box.w)}px;height:${r3(box.h)}px;border-radius:${box.r ?? 0}px;z-index:${box.z + this.zb}">` +
      `<video class="clip" id="${vid}" src="${file}" muted playsinline data-start="${r3(start)}" data-duration="${r3(Math.min(dur, seg.duration + HANDLE))}" data-track-index="${this.video.take(start, start + dur)}" style="left:${r3(left)}px;top:${r3(top)}px;width:${r3(vw)}px;height:${r3(vh)}px${box.blur ? ';filter:blur(26px) brightness(.62) saturate(1.15)' : ''}"></video></div>`);
    if (box.grow) this.js.push(`grow('#${fid}', ${r3(start)}, ${box.r ?? 0});`);
    return fid;
  }

  /** A timed overlay (text, cards, backgrounds). */
  layer(start: number, end: number, inner: string, style: string, cls = 'layer', z = 20) {
    const id = this.id('t'), T = at(this.cut.beats);
    end = Math.min(end, T);
    this.html.push(`<div class="clip ${cls}" id="${id}" data-start="${r3(start)}" data-duration="${r3(end - start)}" data-track-index="${this.over.take(start, end)}" style="${style};z-index:${z + this.zb}">${inner}</div>`);
    return id;
  }
  textIn(id: string, t: number) { this.js.push(`tl.fromTo('#${id}', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: ${r3(TEXT_IN)}, ease: 'power2.out' }, ${r3(t)});`); }
  fadeOut(id: string, t: number) { this.js.push(`tl.to('#${id}', { opacity: 0, duration: 0.1, ease: 'power1.in' }, ${r3(t - 0.1)});`); }
}

const portrait = (c: Composition) => c.format === 'portrait';

/** A full-frame paper card (title cards); it grows in like a shot and stays under the next block. */
function paper(c: Composition, block: Block) {
  const start = at(block.start), id = c.layer(start, at(block.end) + c.tail, '', `background:${PAPER}`, 'layer', 5);
  c.js.push(`grow('#${id}', ${r3(start)}, 0);`);
}

/** One timed line of text that lands on its beat and stays until the block ends. */
function text(c: Composition, block: Block, line: Line, style: string, color = INK, inner?: string) {
  const id = c.layer(at(line.at), at(block.end), inner ?? `<p class="${line.size}" style="color:${color}">${esc(line.text)}</p>`, style, 'txt', 20);
  c.textIn(id, at(line.at));
  return id;
}

/** Centered text at a fixed top. */
const centered = (top: number, pad = 60) => `display:flex;justify-content:center;text-align:center;top:${top}px;bottom:auto;padding:0 ${pad}px`;

function build(c: Composition) {
  const { W, H } = c, P = portrait(c), T = at(c.cut.beats);
  c.cut.blocks.forEach((block, index) => {
    c.zb = index * 30;
    const start = at(block.start), end = at(block.end), last = end >= T - 1e-6, tail = last ? 0 : c.tail, segs = segments(block);
    /** A shot filling the frame (and, in portrait, a sharp square over its blurred copy). */
    const show = (seg: Segment, grow: boolean, extra: number) => {
      if (P && (block.kind === 'game' || block.kind === 'montage')) {
        c.shot(seg, { x: 0, y: 0, w: W, h: H, z: 2, blur: true, grow, extra });
        c.shot(seg, { x: 40, y: 400, w: 1000, h: 1000, r: 36, z: 3, grow, extra });
      } else c.shot(seg, { x: 0, y: 0, w: W, h: H, z: 2, grow, extra });
    };
    switch (block.kind) {
      case 'clip': show(segs[0], block.start > 0, tail); break;
      case 'logo': {
        if (segs[0]) c.shot(segs[0], { x: 0, y: 0, w: W, h: H, z: 2, blur: true, extra: tail });
        const id = c.layer(start, end, `<div class="lockup big light">${WORDMARK(true)}</div>`, 'display:flex;align-items:center;justify-content:center', 'txt', 20);
        popIn(c, id, start);
        break;
      }
      case 'tagline': {
        segs.forEach((seg, i) => {
          const lastBg = i === segs.length - 1;
          const fid = c.shot(seg, { x: 0, y: 0, w: W, h: H, z: 2 + i, blur: true, grow: i === 0 && block.start > 0, extra: lastBg ? tail : 0 });
          c.js.push(`tl.fromTo('#${fid}', { scale: 1.02 }, { scale: 1.1, duration: ${r3(seg.duration)}, ease: 'none' }, ${r3(seg.start)});`);
          if (i > 0) c.js.push(`tl.fromTo('#${fid}', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, ${r3(seg.start)});`);
        });
        if (block.logo) { const id = c.layer(start, end, `<div class="lockup light">${WORDMARK(true)}</div>`, centered(P ? 640 : 300), 'txt', 20); c.textIn(id, start); }
        const tops = block.lines.length === 1 ? [P ? 880 : (block.logo ? 520 : 470)] : (P ? [700, 960] : [380, 540]);
        block.lines.forEach((line, i) => text(c, block, line, centered(tops[i], P ? 70 : 120), '#fff'));
        break;
      }
      case 'game': {
        const g = game(block.slug);
        segs.forEach((seg, i) => show(seg, true, i === segs.length - 1 ? tail : 0.12));
        const tIn = at(block.textIn), tOut = at(block.textOut);
        const id = c.layer(tIn, tOut, `<div class="gamecard"><img class="logo" src="logos/${g.slug}.svg" alt=""><p class="pitch">${esc(g.tagline)}</p><span class="age">${esc(g.ages)}</span></div>`, '', 'cardwrap', 20);
        c.textIn(id, tIn); c.fadeOut(id, tOut);
        break;
      }
      case 'montage': {
        segs.forEach((seg, i) => {
          show(seg, true, i === segs.length - 1 ? tail : 0.12);
          const id = c.layer(seg.start, seg.start + seg.duration, `<img class="logo" src="logos/${seg.shot.slug}.svg" alt="">`, '', P ? 'minilogo p' : 'minilogo', 21);
          c.textIn(id, seg.start);
        });
        for (const line of block.lines) text(c, block, line, P ? 'display:flex;justify-content:center;align-items:flex-end;padding-bottom:200px' : 'display:flex;align-items:flex-end;padding:0 0 80px 80px', INK, `<p class="headline chip">${esc(line.text)}</p>`);
        break;
      }
      case 'promise': {
        paper(c, block);
        block.lines.forEach((line, i) => text(c, block, line, `top:${P ? 600 + i * 190 : 220 + i * 165}px;bottom:auto;left:${P ? 110 : 400}px;height:140px`, INK, `<div class="row">${CHECK}<p class="headline">${esc(line.text)}</p></div>`));
        break;
      }
      case 'devices': {
        paper(c, block);
        const [phone, tablet] = segs;
        // Code-drawn generic devices (no brand): rounded bezels around the real touch recordings.
        const ph = P ? { x: 90, y: 560, w: 900, h: 416 } : { x: 110, y: 480, w: 900, h: 416 };
        const tb = P ? { x: 170, y: 1150, w: 740, h: 514 } : { x: 1130, y: 380, w: 680, h: 472 };
        const bezel = (b: typeof ph, pad: number, r: number) => c.layer(start, end + tail, '', `left:${b.x - pad}px;top:${b.y - pad}px;width:${b.w + 2 * pad}px;height:${b.h + 2 * pad}px;right:auto;bottom:auto;border-radius:${r}px;background:${INK};box-shadow:0 30px 60px rgb(22 25 31 / .25)`, 'bezel', 8);
        const b1 = bezel(ph, 22, 58), b2 = bezel(tb, 30, 44);
        const s1 = c.shot(phone, { ...ph, r: 36, z: 9, extra: tail }), s2 = c.shot(tablet, { ...tb, r: 16, z: 9, extra: tail });
        for (const el of [b1, s1, b2, s2]) c.js.push(`tl.fromTo('#${el}', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, ${r3(start + (el === b2 || el === s2 ? 0.12 : 0.04))});`);
        for (const line of block.lines) text(c, block, line, centered(P ? 300 : 130));
        break;
      }
      case 'open': {
        paper(c, block);
        const [l1, l2, ...small] = block.lines;
        text(c, block, l1, centered(P ? 640 : 330)); text(c, block, l2, centered(P ? 880 : 470));
        const id = c.layer(at(small[0].at), end, small.map(l => `<p class="small">${esc(l.text)}</p>`).join(''), `display:flex;flex-direction:column;align-items:center;gap:14px;top:${P ? 1200 : 680}px;bottom:auto`, 'txt', 20);
        c.textIn(id, at(small[0].at));
        const m = c.layer(start, end, ICON, `left:${W / 2 - 60}px;top:${P ? 440 : 150}px;width:120px;height:120px;right:auto;bottom:auto`, 'markbox', 20);
        c.js.push(`tl.fromTo('#${m}', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, ${r3(start + 0.05)});`);
        break;
      }
      case 'end': {
        paper(c, block);
        const lock = c.layer(start, end, `<div class="lockup big">${WORDMARK(false)}</div>`, centered(P ? 560 : 180), 'txt', 20);
        popIn(c, lock, start + 0.05);
        const ys = P ? [860, 1010, 1190] : [470, 590, 760];
        block.lines.forEach((line, i) => {
          const y = ys[block.lines.length === 2 ? i + 1 : i];
          text(c, block, line, centered(y), line.text === 'aikids.games' ? GO : INK, line.text === 'Play free' ? `<span class="pill">${esc(line.text)}</span>` : undefined);
        });
        break;
      }
    }
  });
}

function page(c: Composition) {
  const { W, H } = c, P = portrait(c), T = at(c.cut.beats);
  return `<!doctype html>
<html lang="en" data-resolution="${P ? 'portrait' : 'landscape'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${W}, height=${H}">
<title>AI Kids Games ${c.cut.id} (${FORMATS[c.format].id})</title>
<script src="gsap.min.js"></script>
<style>
@font-face { font-family: "Nunito"; src: url(fonts/nunito.woff2) format("woff2"); font-weight: 200 1000; font-display: block; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #0F1115; }
#root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; font-family: "Nunito", sans-serif; color: ${INK}; -webkit-font-smoothing: antialiased; }
.frame { position: absolute; overflow: hidden; }
.frame video { position: absolute; max-width: none; }
.layer, .txt, .cardwrap, .bezel, .markbox, .minilogo { position: absolute; inset: 0; }
.headline { font-weight: 900; font-size: ${P ? 92 : 112}px; line-height: 1.08; letter-spacing: -0.02em; }
.line { font-weight: 800; font-size: ${P ? 60 : 64}px; line-height: 1.15; }
.small { font-weight: 700; font-size: ${P ? 40 : 42}px; color: ${SLATE}; }
.txt p { text-wrap: balance; }
.txt p[style*="#fff"] { text-shadow: 0 4px 28px rgb(0 0 0 / .5); }
.lockup { display: inline-flex; align-items: center; gap: ${P ? 26 : 30}px; }
.lockup .wm { height: ${P ? 150 : 160}px; width: auto; }
.lockup.big .wm { height: ${P ? 190 : 210}px; }
.lockup.light .wm { filter: drop-shadow(0 4px 24px rgb(0 0 0 / .45)); }
.markbox .icon { width: 100%; height: 100%; }
.chip { display: inline-block; padding: 18px 40px 22px; border-radius: 28px; background: rgb(255 255 255 / .96); color: ${INK}; box-shadow: 0 20px 50px rgb(0 0 0 / .3); }
.row { display: flex; align-items: center; gap: 36px; }
.row .check { width: ${P ? 84 : 92}px; height: ${P ? 84 : 92}px; flex: none; }
.gamecard { position: absolute; ${P ? 'left: 40px; right: 40px; top: 1440px; align-items: center; text-align: center;' : 'left: 72px; bottom: 72px; max-width: 1180px;'} display: flex; flex-direction: column; gap: 18px; padding: 34px 44px 38px; border-radius: 32px; background: rgb(255 255 255 / .96); box-shadow: 0 24px 60px rgb(0 0 0 / .28); }
.gamecard .logo { height: ${P ? 120 : 112}px; width: auto; max-width: 100%; object-fit: contain; ${P ? '' : 'align-self: flex-start;'} }
.gamecard .pitch { font-weight: 900; font-size: 64px; line-height: 1.1; letter-spacing: -0.015em; color: ${INK}; text-wrap: balance; }
.gamecard .age, .pill { align-self: ${P ? 'center' : 'flex-start'}; display: inline-block; padding: 8px 26px 10px; border-radius: 999px; background: ${GO}; color: #fff; font-weight: 800; font-size: 40px; }
.pill { font-size: 56px; padding: 14px 48px 18px; }
.minilogo { display: flex; justify-content: flex-end; align-items: flex-start; padding: 64px 72px; }
.minilogo.p { justify-content: center; padding: 170px 0 0; }
.minilogo .logo { height: ${P ? 150 : 120}px; padding: 18px 28px; border-radius: 26px; background: rgb(255 255 255 / .95); box-shadow: 0 16px 40px rgb(0 0 0 / .25); }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${r3(T)}" data-width="${W}" data-height="${H}" data-fps="60">
${c.html.join('\n')}
<audio id="mix" class="clip" src="audio/mix.wav" data-start="0" data-duration="${r3(T)}" data-track-index="90"></audio>
</div>
<script>
(function () {
  const tl = gsap.timeline({ paused: true });
  // The signature transition: the next shot opens in a rounded card growing from the bottom-left.
  function grow(sel, t, r) {
    tl.fromTo(sel, { clipPath: 'inset(62% 66% 0% 0% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + 'px)', duration: ${r3(GROW)}, ease: 'power2.out' }, t);
  }
  ${c.js.join('\n  ')}
  tl.set({}, {}, ${r3(T)});
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
})();
</script>
</body>
</html>
`;
}

const link = (from: string, to: string) => { mkdirSync(dirname(to), { recursive: true }); if (existsSync(to)) rmSync(to); try { linkSync(from, to); } catch { copyFileSync(from, to); } };

export function compose(cut: Cut, format: Format) {
  const f = FORMATS[format], dir = join(sizzle, 'build', `${cut.id}-${f.id}`);
  const c = new Composition(cut, format, f.width, f.height);
  build(c);
  mkdirSync(dir, { recursive: true });
  for (const seg of cut.blocks.flatMap(segments)) link(trim(seg), join(dir, 'media', `${seg.key}.mp4`));
  link(join(sizzle, 'build/media', `${cut.id}-mix.wav`), join(dir, 'audio/mix.wav'));
  link(join(root, 'apps/site/src/assets/fonts/nunito-latin-wght.woff2'), join(dir, 'fonts/nunito.woff2'));
  link(join(dirname(require.resolve('gsap/package.json')), 'dist/gsap.min.js'), join(dir, 'gsap.min.js'));
  for (const [from, to] of [['wordmark.png', 'wordmark.png'], ['wordmark-dark.png', 'wordmark-dark.png'], ['icon-source.webp', 'icon.webp']]) link(join(root, 'docs/brand', from), join(dir, 'brand', to));
  for (const slug of new Set(cut.blocks.flatMap(b => b.kind === 'game' ? [b.slug] : b.kind === 'montage' ? b.shots.map((s: Shot) => s.slug) : []))) link(game(slug).logo, join(dir, 'logos', `${slug}.svg`));
  writeFileSync(join(dir, 'index.html'), page(c));
  writeFileSync(join(dir, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', paths: { assets: '.' } }, null, 2) + '\n');
  return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Usage: npm run compose [-- <cut>, <cut>-<16x9|9x16> or a prefix such as game- ...]
  const only = process.argv.slice(2);
  for (const cut of selectCuts(only)) {
    mixAudio(cut);
    for (const format of Object.keys(FORMATS) as Format[]) {
      const name = `${cut.id}-${FORMATS[format].id}`;
      if (only.length && !only.some(o => cut.id === o || name === o || cut.id.startsWith(o))) continue;
      console.log(`composed ${compose(cut, format)}`);
    }
  }
}
