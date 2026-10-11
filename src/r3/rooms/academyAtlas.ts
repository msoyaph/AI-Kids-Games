import { CanvasTexture, SRGBColorSpace } from 'three';
import { BADGES } from '../../data/badges';
import { STICKERS } from '../../data/stickers';
import { drawBadge } from '../../gfx/art/badges';
import { drawGlyph, type GlyphId } from '../../gfx/art/glyphs';
import { drawSticker } from '../../gfx/art/stickers';
import { circle, ink, linear, radial, roundRect, softStar, type Ctx } from '../../gfx/canvas';
import { C, shade } from '../../gfx/palette';
import { Rng } from '../../core/rng';
import type { Region } from './academyKit';

/**
 * Every painted surface of the Academy in one canvas (2048² logical px; 0.75× on Medium, 0.5× on Low):
 * glowing screens and signs (drawn by the unlit screen material) and lit posters, stickers, rugs,
 * medal faces (drawn by the lit decal material).
 */

const R = (x: number, y: number, w: number, h: number): Region => ({ x, y, w, h });

export const AT = {
  // glowing
  mission: R(0, 0, 1024, 400),
  sign: R(1024, 0, 1024, 400),
  radar: R(0, 400, 256, 128),
  chart: R(256, 400, 256, 128),
  rocketScreen: R(0, 528, 256, 128),
  wave: R(256, 528, 256, 128),
  window: R(512, 400, 512, 512),
  logo: R(1024, 400, 512, 512),
  shopSign: R(1536, 400, 512, 256),
  welcome: R(1536, 656, 512, 256),
  hangarSign: R(512, 912, 512, 128),
  plaques: R(0, 912, 512, 672),
  // lit
  stickers: R(512, 1040, 512, 512),
  posters: R(1024, 912, 1024, 352),
  chartPoster: R(1024, 1264, 512, 256),
  medals: R(1536, 1264, 512, 256),
  rugStar: R(0, 1600, 448, 448),
  rugRound: R(448, 1600, 448, 448),
  snack: R(1024, 1520, 256, 352),
  padMark: R(1296, 1520, 512, 512),
  doorView: R(1808, 1520, 240, 512),
};

export const PLAQUES: Array<[string, GlyphId, string]> = [
  ['MISSIONS', 'map', C.cyan],
  ['LIBRARY', 'book', C.yellow],
  ['TROPHIES', 'trophy', C.gold],
  ['LOUNGE', 'heart', C.pink],
  ['SHOP', 'coin', C.yellow],
  ['LOBBY', 'star', C.teal],
  ['HANGAR', 'rocket', C.orange],
];

/** Sub-region helpers. */
export function sub(r: Region, i: number, cols: number, rows: number): Region {
  const w = r.w / cols;
  const h = r.h / rows;
  return { x: r.x + (i % cols) * w, y: r.y + Math.floor(i / cols) * h, w, h };
}

const FONT = '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Trebuchet MS", system-ui, sans-serif';

function text(g: Ctx, s: string, x: number, y: number, size: number, fill: string | CanvasGradient, outline: string = C.ink, lw = size * 0.16, align: CanvasTextAlign = 'center'): void {
  g.font = `900 ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  if (lw > 0) {
    g.lineWidth = lw;
    g.strokeStyle = outline;
    g.strokeText(s, x, y);
  }
  g.fillStyle = fill;
  g.fillText(s, x, y);
}

/** Draw into a region with local coordinates (0..w, 0..h), clipped. */
function region(g: Ctx, r: Region, draw: (w: number, h: number) => void, clip = true): void {
  g.save();
  g.translate(r.x, r.y);
  if (clip) {
    g.beginPath();
    g.rect(0, 0, r.w, r.h);
    g.clip();
  }
  draw(r.w, r.h);
  g.restore();
}

function starfield(g: Ctx, w: number, h: number, n: number, seed: string, alpha = 1): void {
  const rng = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const x = rng.next() * w;
    const y = rng.next() * h;
    const s = rng.next() < 0.9 ? rng.range(0.8, 1.8) : rng.range(2.2, 3.4);
    g.fillStyle = `rgba(255,255,255,${(rng.range(0.4, 1) * alpha).toFixed(2)})`;
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fill();
  }
}

function planetBall(g: Ctx, x: number, y: number, r: number, col: string, ring = false, bands = false): void {
  if (ring) {
    g.save();
    g.strokeStyle = shade(col, 0.3);
    g.lineWidth = r * 0.22;
    g.beginPath();
    g.ellipse(x, y, r * 1.75, r * 0.45, -0.25, Math.PI * 0.95, Math.PI * 2.05);
    g.stroke();
    g.restore();
  }
  g.fillStyle = radial(g, x - r * 0.35, y - r * 0.35, r * 0.1, r * 1.2, [[0, shade(col, 0.45)], [0.6, col], [1, shade(col, -0.45)]], x, y);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  if (bands) {
    g.save();
    g.clip(circle(x, y, r));
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = -2; i <= 2; i++) g.fillRect(x - r, y + i * r * 0.32 - r * 0.06, r * 2, r * 0.12);
    g.restore();
  }
  if (ring) {
    g.save();
    g.strokeStyle = shade(col, 0.4);
    g.lineWidth = r * 0.22;
    g.beginPath();
    g.ellipse(x, y, r * 1.75, r * 0.45, -0.25, Math.PI * 0.05, Math.PI * 0.95);
    g.stroke();
    g.restore();
  }
}

// ------------------------------------------------------------------ glowing pieces

function drawMission(g: Ctx, w: number, h: number): void {
  g.fillStyle = linear(g, 0, 0, 0, h, [[0, '#0b1a5a'], [1, '#081040']]);
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,170,255,0.22)';
  g.lineWidth = 2;
  for (let x = 0; x <= w; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y <= h; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  starfield(g, w, h, 160, 'mission', 0.8);
  // Orbits around the Sun on the left.
  const sx = 80;
  const sy = h * 0.55;
  g.strokeStyle = 'rgba(140,210,255,0.45)';
  g.lineWidth = 3;
  const orbits = [120, 210, 300, 420, 560, 700, 830];
  for (const r of orbits) {
    g.beginPath();
    g.ellipse(sx, sy, r, r * 0.42, 0, -Math.PI / 2, Math.PI / 2);
    g.stroke();
  }
  g.fillStyle = radial(g, sx, sy, 0, 70, [[0, '#ffffff'], [0.3, '#ffe066'], [1, 'rgba(255,159,67,0)']]);
  g.beginPath();
  g.arc(sx, sy, 70, 0, Math.PI * 2);
  g.fill();
  const bodies: Array<[number, number, string, boolean, boolean]> = [
    [0.4, 9, '#c9b8a0', false, false],
    [-0.5, 12, '#ffc83d', false, false],
    [0.25, 13, '#4c9dff', false, false],
    [-0.3, 11, '#ff7a4d', false, false],
    [0.55, 26, '#e0a070', false, true],
    [-0.2, 22, '#ffd98a', true, false],
    [0.35, 17, '#7fe0ff', false, false],
  ];
  bodies.forEach(([a, r, col, ring, bands], i) => {
    const R0 = orbits[i];
    planetBall(g, sx + Math.cos(a) * R0, sy + Math.sin(a) * R0 * 0.42, r, col, ring, bands);
  });
  // Mission route and markers.
  g.setLineDash([14, 12]);
  g.strokeStyle = '#ffe066';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(sx + Math.cos(0.25) * 300, sy + Math.sin(0.25) * 126);
  g.bezierCurveTo(500, 60, 700, 80, sx + Math.cos(0.55) * 560, sy + Math.sin(0.55) * 235);
  g.stroke();
  g.setLineDash([]);
  for (const [x, y, glyph, col] of [[560, 90, 'flag', C.yellow], [820, 120, 'star', C.pink], [700, 300, 'beacon', C.lime]] as Array<[number, number, GlyphId, string]>) {
    g.strokeStyle = col;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(x, y, 34, 0, Math.PI * 2);
    g.stroke();
    drawGlyph(g, glyph, x, y, 22, col);
  }
  text(g, 'MISSIONS', w - 24, 40, 40, '#bfe9ff', '#0b1a5a', 0, 'right');
  g.strokeStyle = 'rgba(160,220,255,0.8)';
  g.lineWidth = 8;
  g.strokeRect(4, 4, w - 8, h - 8);
}

function drawSign(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  const grad1 = linear(g, 0, 40, 0, 220, [[0, '#fff6c0'], [0.5, '#ffe066'], [1, '#ff9f43']]);
  text(g, 'SPACE SKY', w / 2, 132, 190, grad1, '#3a1c8a', 30);
  const grad2 = linear(g, 0, 250, 0, 360, [[0, '#e8fffb'], [1, '#2de0c7']]);
  text(g, 'ACADEMY', w / 2, 312, 128, grad2, '#3a1c8a', 24);
  // Tiny stars around.
  for (const [x, y, r] of [[60, 300, 26], [964, 300, 26], [90, 230, 14], [930, 230, 14]] as Array<[number, number, number]>) ink(g, softStar(x, y, 5, r, r * 0.45), '#fff6c0', 0);
}

function drawRadar(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#062a2a';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,255,170,0.6)';
  g.lineWidth = 3;
  for (const r of [18, 36, 54]) {
    g.beginPath();
    g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(w / 2 - 60, h / 2);
  g.lineTo(w / 2 + 60, h / 2);
  g.moveTo(w / 2, h / 2 - 60);
  g.lineTo(w / 2, h / 2 + 60);
  g.stroke();
  for (const [x, y] of [[0.62, 0.3], [0.4, 0.7], [0.57, 0.6]]) {
    g.fillStyle = '#b8ffd8';
    g.beginPath();
    g.arc(x * w, y * h, 5, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#7dffb8';
  g.font = `900 18px ${FONT}`;
  g.textAlign = 'left';
  g.fillText('SCAN', 12, 22);
}

function drawChart(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#20104a';
  g.fillRect(0, 0, w, h);
  const cols = [C.pink, C.yellow, C.teal, C.orange, C.cyan, C.lime];
  const hs = [0.5, 0.75, 0.4, 0.9, 0.6, 0.7];
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i];
    const bh = hs[i] * (h - 30);
    g.fill(roundRect(18 + i * 38, h - 12 - bh, 26, bh, 6));
  }
}

function drawRocketScreen(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#0a1f4a';
  g.fillRect(0, 0, w, h);
  drawGlyph(g, 'rocket', w * 0.3, h / 2, 46, C.orange);
  g.fillStyle = '#4dd4ff';
  for (let i = 0; i < 4; i++) g.fill(roundRect(w * 0.55, 22 + i * 24, (0.3 + ((i * 37) % 30) / 100) * w * 0.6, 12, 6));
}

function drawWave(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#2a0a3a';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#ff7ad9';
  g.lineWidth = 5;
  g.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = h / 2 + Math.sin(x * 0.07) * 26 * Math.sin(x * 0.013 + 1);
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.strokeStyle = '#ffe066';
  g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = h / 2 + Math.cos(x * 0.05) * 18;
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

function drawWindow(g: Ctx, w: number, h: number): void {
  g.fillStyle = linear(g, 0, 0, 0, h, [[0, '#0a0830'], [0.55, '#2a1d78'], [1, '#6b3fa4']]);
  g.fillRect(0, 0, w, h);
  // A soft nebula.
  g.fillStyle = radial(g, w * 0.3, h * 0.35, 0, w * 0.4, [[0, 'rgba(255,122,217,0.45)'], [1, 'rgba(255,122,217,0)']]);
  g.fillRect(0, 0, w, h);
  g.fillStyle = radial(g, w * 0.75, h * 0.6, 0, w * 0.35, [[0, 'rgba(77,212,255,0.35)'], [1, 'rgba(77,212,255,0)']]);
  g.fillRect(0, 0, w, h);
  starfield(g, w, h, 220, 'window');
  planetBall(g, w * 0.7, h * 0.36, 58, '#ffd98a', true);
  planetBall(g, w * 0.26, h * 0.68, 30, '#9b6bff');
  ink(g, softStar(w * 0.2, h * 0.2, 4, 16, 4), '#ffffff', 0);
  ink(g, softStar(w * 0.86, h * 0.8, 4, 12, 3), '#ffffff', 0);
}

function crest(g: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h * 0.44;
  g.fillStyle = radial(g, cx, cy, 0, w * 0.5, [[0, 'rgba(255,224,102,0.45)'], [1, 'rgba(255,224,102,0)']]);
  g.fillRect(0, 0, w, h);
  ink(g, circle(cx, cy, 170), linear(g, 0, cy - 170, 0, cy + 170, [[0, '#7b4ff0'], [1, '#3a1c8a']]), 16, '#fff6e0');
  g.strokeStyle = '#2de0c7';
  g.lineWidth = 12;
  g.beginPath();
  g.ellipse(cx, cy + 10, 200, 70, -0.35, 0, Math.PI * 2);
  g.stroke();
  drawGlyph(g, 'rocket', cx, cy - 6, 110, C.orange);
  for (const [x, y, r] of [[cx - 110, cy - 100, 22], [cx + 120, cy - 80, 16], [cx + 90, cy + 110, 18], [cx - 130, cy + 70, 12]] as Array<[number, number, number]>) {
    ink(g, softStar(x, y, 5, r, r * 0.45), '#ffe066', 0);
  }
}

function drawLogo(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  crest(g, w, h);
  text(g, 'SPACE SKY ACADEMY', w / 2, h - 46, 46, '#fff6c0', '#3a1c8a', 10);
}

function drawShopSign(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#3a1c8a';
  g.fill(roundRect(8, 8, w - 16, h - 16, 60));
  g.strokeStyle = '#ffe066';
  g.lineWidth = 10;
  g.stroke(roundRect(14, 14, w - 28, h - 28, 54));
  drawGlyph(g, 'coin', 110, h / 2, 70, C.gold);
  text(g, 'SHOP', 320, h / 2 + 4, 120, linear(g, 0, 70, 0, 190, [[0, '#fff6c0'], [1, '#ffc83d']]), '#20124d', 16);
}

function drawWelcome(g: Ctx, w: number, h: number): void {
  g.fillStyle = linear(g, 0, 0, w, h, [[0, '#4c2db8'], [1, '#2a1d78']]);
  g.fillRect(0, 0, w, h);
  starfield(g, w, h, 60, 'welcome', 0.6);
  text(g, 'WELCOME', w / 2, 90, 84, '#ffe066', '#20124d', 12);
  text(g, 'CADETS!', w / 2, 180, 72, '#2de0c7', '#20124d', 12);
  g.strokeStyle = '#ff7ad9';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
}

function drawHangarSign(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#20124d';
  g.fillRect(0, 0, w, h);
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  for (let x = -h; x < w + h; x += 48) {
    g.fillStyle = '#ffc83d';
    g.beginPath();
    g.moveTo(x, h);
    g.lineTo(x + 24, h);
    g.lineTo(x + 24 + h * 0.25, h - 18);
    g.lineTo(x + h * 0.25, h - 18);
    g.fill();
    g.beginPath();
    g.moveTo(x, 18);
    g.lineTo(x + 24, 18);
    g.lineTo(x + 24 + h * 0.25, 0);
    g.lineTo(x + h * 0.25, 0);
    g.fill();
  }
  g.restore();
  text(g, 'HANGAR 1', w / 2, h / 2 + 2, 66, '#fff6c0', '#20124d', 0);
}

function drawPlaques(g: Ctx, w: number, h: number): void {
  const ph = h / PLAQUES.length;
  PLAQUES.forEach(([label, glyph, col], i) => {
    const y = i * ph;
    g.fillStyle = '#20124d';
    g.fill(roundRect(4, y + 4, w - 8, ph - 8, (ph - 8) / 2));
    g.strokeStyle = col;
    g.lineWidth = 6;
    g.stroke(roundRect(8, y + 8, w - 16, ph - 16, (ph - 16) / 2));
    drawGlyph(g, glyph, 60, y + ph / 2, 28, col);
    text(g, label, w / 2 + 30, y + ph / 2 + 3, 50, '#fff6e0', '#20124d', 0);
  });
}

// ------------------------------------------------------------------ lit pieces

function drawStickerWall(g: Ctx, w: number, h: number): void {
  g.fillStyle = linear(g, 0, 0, 0, h, [[0, '#6b3fd4'], [1, '#4a26a8']]);
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#ffe066';
  g.lineWidth = 14;
  g.strokeRect(7, 7, w - 14, h - 14);
  const rng = new Rng('stickerwall');
  const ids = STICKERS.map((s) => s.id);
  const n = 5;
  const cell = (w - 40) / n;
  for (let i = 0; i < n * n; i++) {
    const cx = 20 + (i % n) * cell + cell / 2 + rng.range(-6, 6);
    const cy = 20 + Math.floor(i / n) * cell + cell / 2 + rng.range(-6, 6);
    g.save();
    g.translate(cx, cy);
    g.rotate(rng.range(-0.25, 0.25));
    drawSticker(g, ids[i % ids.length], 0, 0, cell * 0.42);
    g.restore();
  }
}

function poster(g: Ctx, w: number, h: number, bg: [string, string], title: string, art: () => void): void {
  g.fillStyle = '#fff6e0';
  g.fillRect(0, 0, w, h);
  g.fillStyle = linear(g, 0, 0, 0, h, [[0, bg[0]], [1, bg[1]]]);
  g.fillRect(12, 12, w - 24, h - 24);
  starfield(g, w, h * 0.7, 30, title, 0.7);
  art();
  text(g, title, w / 2, h - 46, title.length > 6 ? 34 : 44, '#fff6e0', '#20124d', 8);
}

function drawPosters(g: Ctx, w: number, h: number): void {
  const pw = w / 4;
  const items: Array<[[string, string], string, (pw: number) => void]> = [
    [['#2a1d78', '#6b3fd4'], 'SATURN', (p) => planetBall(g, p / 2, h * 0.4, 62, '#ffd98a', true, true)],
    [['#0b1a5a', '#2a7bff'], 'BLAST OFF!', (p) => drawGlyph(g, 'rocket', p / 2, h * 0.4, 90, C.orange)],
    [['#5a1d2a', '#e46a4a'], 'MARS', (p) => planetBall(g, p / 2, h * 0.4, 70, '#ff7a4d')],
    [['#0a4a4a', '#2de0c7'], 'NEW LOOKS', (p) => {
      drawGlyph(g, 'helmet', p / 2, h * 0.36, 70, C.white);
      ink(g, softStar(p * 0.78, h * 0.16, 5, 26, 12), '#ffe066', 4);
    }],
  ];
  items.forEach(([bg, title, art], i) => {
    g.save();
    g.translate(i * pw, 0);
    poster(g, pw, h, bg, title, () => art(pw));
    g.restore();
  });
}

function drawChartPoster(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#fff6e0';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#1d1456';
  g.fillRect(10, 10, w - 20, h - 20);
  starfield(g, w, h, 50, 'chart', 0.6);
  g.fillStyle = radial(g, 10, h / 2, 0, 80, [[0, '#fff6c0'], [0.5, '#ffc83d'], [1, '#ff9f43']]);
  g.beginPath();
  g.arc(10, h / 2, 70, -Math.PI / 2, Math.PI / 2);
  g.fill();
  const ps: Array<[number, number, string, boolean]> = [[100, 8, '#c9b8a0', false], [140, 12, '#ffc83d', false], [185, 13, '#4c9dff', false], [228, 10, '#ff7a4d', false], [290, 30, '#e0a070', false], [365, 25, '#ffd98a', true], [430, 18, '#7fe0ff', false], [480, 17, '#4c7dff', false]];
  for (const [x, r, c, ring] of ps) planetBall(g, x, h / 2 + 10, r, c, ring);
  text(g, 'OUR SOLAR SYSTEM', w / 2, 40, 30, '#ffe066', '#1d1456', 0);
}

function drawMedals(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  const cell = 128;
  const picks = BADGES.slice(0, 8);
  picks.forEach((b, i) => {
    const x = (i % 4) * cell;
    const y = Math.floor(i / 4) * cell;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.arc(cell / 2, cell / 2, cell / 2 - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = b.color;
    g.fillRect(0, 0, cell, cell);
    g.translate(0, -cell * 0.08);
    drawBadge(g, b, cell, cell * 1.1, true);
    g.restore();
  });
}

function drawRugStar(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  ink(g, softStar(w / 2, h / 2 + 10, 5, w * 0.48, w * 0.24), '#ff9ad9', 0);
  ink(g, softStar(w / 2, h / 2 + 10, 5, w * 0.4, w * 0.2), '#ffd6f2', 0);
  ink(g, softStar(w / 2, h / 2 + 10, 5, w * 0.3, w * 0.15), '#ff7ad9', 0);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    g.fillStyle = '#ffe066';
    g.beginPath();
    g.arc(w / 2 + Math.cos(a) * w * 0.33, h / 2 + 10 + Math.sin(a) * w * 0.33, 10, 0, Math.PI * 2);
    g.fill();
  }
}

function drawRugRound(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  const cols = ['#2de0c7', '#fff6e0', '#4c7dff', '#ffe066', '#6b3fd4', '#fff6e0'];
  cols.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.49 * (1 - i * 0.15), 0, Math.PI * 2);
    g.fill();
  });
  ink(g, softStar(w / 2, h / 2, 5, w * 0.1, w * 0.05), '#ff7ad9', 0);
}

function drawSnack(g: Ctx, w: number, h: number): void {
  g.fillStyle = '#20124d';
  g.fillRect(0, 0, w, h);
  const cols = [C.red, C.yellow, C.lime, C.cyan, C.pink, C.orange, C.purple, C.teal];
  for (let r = 0; r < 5; r++) {
    g.fillStyle = '#3a2a7a';
    g.fillRect(10, 20 + r * 64 + 46, w - 20, 8);
    for (let c = 0; c < 4; c++) {
      const col = cols[(r * 3 + c) % cols.length];
      const x = 22 + c * 56;
      const y = 26 + r * 64;
      g.fillStyle = col;
      if ((r + c) % 3 === 0) g.fill(roundRect(x, y + 4, 40, 40, 10));
      else if ((r + c) % 3 === 1) {
        g.beginPath();
        g.arc(x + 20, y + 24, 19, 0, Math.PI * 2);
        g.fill();
      } else g.fill(roundRect(x + 6, y, 28, 46, 8));
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(x + 10, y + 10, 8, 14);
    }
  }
}

function drawPadMark(g: Ctx, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#ffe066';
  g.lineWidth = 18;
  g.beginPath();
  g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 8;
  g.setLineDash([30, 22]);
  g.beginPath();
  g.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  ink(g, softStar(w / 2, h / 2 + 8, 5, w * 0.24, w * 0.11), '#ffffff', 0);
  ink(g, softStar(w / 2, h / 2 + 8, 5, w * 0.17, w * 0.08), '#ff7ad9', 0);
}

/** What you see through the lobby's glass doors: the hill at dusk. */
function drawDoorView(g: Ctx, w: number, h: number): void {
  g.fillStyle = linear(g, 0, 0, 0, h * 0.62, [[0, '#1a1660'], [0.55, '#5a3f9a'], [1, '#ffb08a']]);
  g.fillRect(0, 0, w, h);
  starfield(g, w, h * 0.4, 40, 'door', 0.9);
  g.fillStyle = '#4a3c86';
  g.beginPath();
  g.moveTo(0, h * 0.62);
  g.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.6);
  g.quadraticCurveTo(w * 0.85, h * 0.55, w, h * 0.6);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.fillStyle = linear(g, 0, h * 0.64, 0, h, [[0, '#3a9a5a'], [1, '#5fcf6a']]);
  g.beginPath();
  g.moveTo(0, h * 0.7);
  g.quadraticCurveTo(w * 0.5, h * 0.62, w, h * 0.68);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.fillStyle = '#e8dcc8';
  g.beginPath();
  g.moveTo(w * 0.42, h * 0.66);
  g.lineTo(w * 0.58, h * 0.66);
  g.lineTo(w * 0.8, h);
  g.lineTo(w * 0.2, h);
  g.fill();
  for (const [x, y] of [[0.18, 0.62], [0.82, 0.6]]) {
    g.fillStyle = '#3a3f66';
    g.fillRect(x * w - 3, y * h, 6, h * 0.12);
    g.fillStyle = radial(g, x * w, y * h, 0, 26, [[0, 'rgba(255,241,184,1)'], [1, 'rgba(255,241,184,0)']]);
    g.fillRect(x * w - 26, y * h - 26, 52, 52);
  }
}

/** Build the atlas canvas (scaled down on lower tiers). */
export function drawAtlas(scale: number): HTMLCanvasElement {
  const size = Math.round(2048 * scale);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  region(g, AT.mission, (w, h) => drawMission(g, w, h));
  region(g, AT.sign, (w, h) => drawSign(g, w, h));
  region(g, AT.radar, (w, h) => drawRadar(g, w, h));
  region(g, AT.chart, (w, h) => drawChart(g, w, h));
  region(g, AT.rocketScreen, (w, h) => drawRocketScreen(g, w, h));
  region(g, AT.wave, (w, h) => drawWave(g, w, h));
  region(g, AT.window, (w, h) => drawWindow(g, w, h));
  region(g, AT.logo, (w, h) => drawLogo(g, w, h));
  region(g, AT.shopSign, (w, h) => drawShopSign(g, w, h));
  region(g, AT.welcome, (w, h) => drawWelcome(g, w, h));
  region(g, AT.hangarSign, (w, h) => drawHangarSign(g, w, h));
  region(g, AT.plaques, (w, h) => drawPlaques(g, w, h));
  region(g, AT.stickers, (w, h) => drawStickerWall(g, w, h));
  region(g, AT.posters, (w, h) => drawPosters(g, w, h));
  region(g, AT.chartPoster, (w, h) => drawChartPoster(g, w, h));
  region(g, AT.medals, (w, h) => drawMedals(g, w, h));
  region(g, AT.rugStar, (w, h) => drawRugStar(g, w, h));
  region(g, AT.rugRound, (w, h) => drawRugRound(g, w, h));
  region(g, AT.snack, (w, h) => drawSnack(g, w, h));
  region(g, AT.padMark, (w, h) => drawPadMark(g, w, h));
  region(g, AT.doorView, (w, h) => drawDoorView(g, w, h));
  return c;
}

export function atlasTexture(scale: number): CanvasTexture {
  const t = new CanvasTexture(drawAtlas(scale));
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Radar region center/radius in uv space (for the screen shader's sweep). */
export function radarUv(): [number, number, number, number] {
  const r = AT.radar;
  return [(r.x + r.w / 2) / 2048, 1 - (r.y + r.h / 2) / 2048, 60 / 2048, 60 / 2048];
}

/** Mission screen bounds in uv space (x0, y0, x1, y1). */
export function missionUv(): [number, number, number, number] {
  const r = AT.mission;
  return [r.x / 2048, 1 - (r.y + r.h) / 2048, (r.x + r.w) / 2048, 1 - r.y / 2048];
}
