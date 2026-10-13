/**
 * The art, drawn in code: one atlas canvas per theme and cell size holding the blocks (six colors
 * plus stones), colorblind symbols, gems and fruit, the ghost, the line hint, shadows and
 * particles; plus the board panel and the background. Canvases are kept so a lost GPU context
 * can re-upload them.
 */
import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import type { Theme } from '../data/themes';
import { canvas, darken, heart, lighten, mix, rgba, rounded, seeded, star } from './paint';

export type ItemKind = 'fruit' | 'pearl' | 'gem' | 'star';
export interface Atlas {
  cell: number;
  /** block[1..6] colors, block[7] stone, block[8] cracked stone. */
  block: Texture[];
  symbol: Texture[];
  item: Record<ItemKind, Texture>;
  ghost: Texture; hint: Texture; shadow: Texture; sparkle: Texture; ring: Texture; confetti: Texture[];
  canvas: HTMLCanvasElement; source: CanvasSource;
}

export interface Look { contrast: boolean }

export function buildAtlas(t: Theme, cell: number, dpr: number, look: Look): Atlas {
  const s = Math.max(8, Math.round(cell * dpr)), pad = 4, slot = s + pad * 2, cols = 8, rows = 5;
  const [c, ctx] = canvas(cols * slot, rows * slot);
  const frames: Rectangle[] = [];
  let n = 0;
  const at = (draw: (x: number, y: number) => void) => {
    const x = (n % cols) * slot + pad, y = Math.floor(n / cols) * slot + pad;
    ctx.save(); draw(x, y); ctx.restore();
    frames.push(new Rectangle(x / dpr, y / dpr, s / dpr, s / dpr)); n++;
    return n - 1;
  };
  const blockIdx = [0];
  for (let i = 0; i < 6; i++) blockIdx.push(at((x, y) => block(ctx, x, y, s, t.blocks[i]!, t, look)));
  blockIdx.push(at((x, y) => stone(ctx, x, y, s, t.stone, false, look)));
  blockIdx.push(at((x, y) => stone(ctx, x, y, s, t.stone, true, look)));
  const symIdx = [0];
  for (let i = 0; i < 6; i++) symIdx.push(at((x, y) => symbol(ctx, x, y, s, i)));
  const items = { fruit: at((x, y) => fruit(ctx, x, y, s)), pearl: at((x, y) => pearl(ctx, x, y, s)), gem: at((x, y) => gem(ctx, x, y, s)), star: at((x, y) => goldStar(ctx, x, y, s)) };
  const ghost = at((x, y) => { rounded(ctx, x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84, s * 0.2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke(); });
  const hint = at((x, y) => { const g = ctx.createRadialGradient(x + s / 2, y + s / 2, s * 0.1, x + s / 2, y + s / 2, s * 0.7); g.addColorStop(0, 'rgba(255,255,240,0.85)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, s, s); });
  const shadow = at((x, y) => { rounded(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.22); ctx.fillStyle = 'rgba(40,20,10,0.22)'; ctx.fill(); });
  const sparkle = at((x, y) => { const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,250,220,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, s, s); star(ctx, x + s / 2, y + s / 2, s * 0.48, s * 0.1, 4, 0); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); });
  const ring = at((x, y) => { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.42, 0, Math.PI * 2); ctx.lineWidth = s * 0.08; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke(); });
  const confetti = t.blocks.map(color => at((x, y) => { ctx.translate(x + s / 2, y + s / 2); rounded(ctx, -s * 0.3, -s * 0.16, s * 0.6, s * 0.32, s * 0.08); ctx.fillStyle = color; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-s * 0.3, -s * 0.16, s * 0.6, s * 0.08); }));
  const source = new CanvasSource({ resource: c, resolution: dpr, autoGenerateMipmaps: false });
  const tex = (i: number) => new Texture({ source, frame: frames[i]! });
  return {
    cell, canvas: c, source,
    block: blockIdx.map(i => tex(i)), symbol: symIdx.map(i => tex(i)),
    item: { fruit: tex(items.fruit), pearl: tex(items.pearl), gem: tex(items.gem), star: tex(items.star) },
    ghost: tex(ghost), hint: tex(hint), shadow: tex(shadow), sparkle: tex(sparkle), ring: tex(ring), confetti: confetti.map(tex),
  };
}

/** A chunky, beveled block in the theme's style. */
function block(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, t: Theme, look: Look) {
  const inset = s * 0.045, w = s - inset * 2, r = s * 0.2;
  x += inset; y += inset;
  // body with a top-to-bottom bevel
  const body = ctx.createLinearGradient(x, y, x, y + w);
  body.addColorStop(0, lighten(color, t.style === 'soft' ? 0.18 : 0.12));
  body.addColorStop(1, darken(color, t.style === 'glow' ? 0.32 : 0.16));
  rounded(ctx, x, y, w, w, r); ctx.fillStyle = body; ctx.fill();
  // bottom/right shade band and top/left light band (the soft bevel)
  ctx.save(); rounded(ctx, x, y, w, w, r); ctx.clip();
  ctx.fillStyle = rgba(darken(color, 0.4), 0.35); ctx.fillRect(x, y + w * 0.84, w, w * 0.16); ctx.fillRect(x + w * 0.88, y, w * 0.12, w);
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, w, w * 0.1); ctx.fillRect(x, y, w * 0.09, w);
  // style details
  if (t.style === 'wood') {
    ctx.strokeStyle = rgba(darken(color, 0.45), 0.28); ctx.lineWidth = Math.max(1, s * 0.025);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); const yy = y + w * (0.2 + k * 0.2); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy - w * 0.06, x + w * 0.6, yy + w * 0.07, x + w, yy - w * 0.02); ctx.stroke(); }
  } else if (t.style === 'candy') {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let k = -2; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * w * 0.32, y + w); ctx.lineTo(x + k * w * 0.32 + w * 0.16, y + w); ctx.lineTo(x + k * w * 0.32 + w * 0.16 + w, y); ctx.lineTo(x + k * w * 0.32 + w, y); ctx.closePath(); ctx.fill(); }
  } else if (t.style === 'glass') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [bx, by, br] of [[0.72, 0.68, 0.07], [0.62, 0.8, 0.045], [0.8, 0.52, 0.035]] as const) { ctx.beginPath(); ctx.arc(x + w * bx, y + w * by, w * br, 0, Math.PI * 2); ctx.fill(); }
  } else if (t.style === 'glow') {
    const g = ctx.createRadialGradient(x + w / 2, y + w / 2, w * 0.1, x + w / 2, y + w / 2, w * 0.7);
    g.addColorStop(0, rgba(lighten(color, 0.4), 0.55)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.fillRect(x, y, w, w);
  }
  ctx.restore();
  // glossy highlight
  ctx.beginPath(); ctx.ellipse(x + w * 0.36, y + w * 0.27, w * 0.27, w * 0.13, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${t.style === 'soft' ? 0.28 : 0.42})`; ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.2, y + w * 0.2, w * 0.05, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
  // outline
  rounded(ctx, x, y, w, w, r);
  ctx.lineWidth = look.contrast ? Math.max(2, s * 0.07) : Math.max(1, s * 0.03);
  ctx.strokeStyle = look.contrast ? '#120a1c' : rgba(darken(color, 0.5), 0.45);
  ctx.stroke();
  if (t.style === 'glow' && !look.contrast) { ctx.lineWidth = Math.max(1, s * 0.035); ctx.strokeStyle = rgba(lighten(color, 0.5), 0.9); rounded(ctx, x + s * 0.02, y + s * 0.02, w - s * 0.04, w - s * 0.04, r * 0.9); ctx.stroke(); }
}

function stone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, cracked: boolean, look: Look) {
  const inset = s * 0.05, w = s - inset * 2;
  x += inset; y += inset;
  const g = ctx.createLinearGradient(x, y, x + w, y + w); g.addColorStop(0, lighten(color, 0.25)); g.addColorStop(1, darken(color, 0.25));
  ctx.beginPath();
  const pts = [[0.12, 0.04], [0.55, 0], [0.92, 0.1], [1, 0.5], [0.9, 0.94], [0.45, 1], [0.06, 0.88], [0, 0.42]];
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px! * w, y + py! * w) : ctx.moveTo(x + px! * w, y + py! * w)));
  ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = look.contrast ? Math.max(2, s * 0.07) : Math.max(1, s * 0.035); ctx.strokeStyle = look.contrast ? '#120a1c' : darken(color, 0.45); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(x + w * 0.35, y + w * 0.28, w * 0.18, w * 0.09, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(darken(color, 0.4), 0.5);
  for (const [px, py, pr] of [[0.7, 0.62, 0.06], [0.3, 0.7, 0.045], [0.62, 0.3, 0.035]] as const) { ctx.beginPath(); ctx.arc(x + w * px, y + w * py, w * pr, 0, Math.PI * 2); ctx.fill(); }
  if (cracked) {
    ctx.strokeStyle = darken(color, 0.65); ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + w * 0.02); ctx.lineTo(x + w * 0.42, y + w * 0.3); ctx.lineTo(x + w * 0.58, y + w * 0.48); ctx.lineTo(x + w * 0.44, y + w * 0.72); ctx.lineTo(x + w * 0.52, y + w * 0.98);
    ctx.moveTo(x + w * 0.58, y + w * 0.48); ctx.lineTo(x + w * 0.86, y + w * 0.56); ctx.stroke();
  }
}

/** Colorblind symbols, one per block color: circle, triangle, square, diamond, star, heart. */
function symbol(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, i: number) {
  const cx = x + s / 2, cy = y + s / 2, k = s * 0.2;
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = 'rgba(30,15,35,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (i) {
    case 0: ctx.arc(cx, cy, k, 0, Math.PI * 2); break;
    case 1: ctx.moveTo(cx, cy - k * 1.1); ctx.lineTo(cx + k * 1.05, cy + k * 0.8); ctx.lineTo(cx - k * 1.05, cy + k * 0.8); ctx.closePath(); break;
    case 2: ctx.rect(cx - k * 0.85, cy - k * 0.85, k * 1.7, k * 1.7); break;
    case 3: ctx.moveTo(cx, cy - k * 1.15); ctx.lineTo(cx + k * 0.9, cy); ctx.lineTo(cx, cy + k * 1.15); ctx.lineTo(cx - k * 0.9, cy); ctx.closePath(); break;
    case 4: star(ctx, cx, cy, k * 1.2, k * 0.5); break;
    default: heart(ctx, cx, cy + k * 0.1, k * 2.3);
  }
  ctx.fill(); ctx.stroke();
}

function fruit(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const cx = x + s / 2, cy = y + s * 0.56, r = s * 0.24;
  ctx.fillStyle = '#e8384f'; ctx.beginPath(); ctx.arc(cx - r * 0.45, cy, r, 0, Math.PI * 2); ctx.arc(cx + r * 0.45, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a1424'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.7, cy - r * 0.35, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy - r * 1.35, r * 0.55, r * 0.25, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2e7d32'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.9); ctx.lineTo(cx + r * 0.1, cy - r * 1.4); ctx.stroke();
}
function pearl(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.26;
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f3e9ff'); g.addColorStop(1, '#c9b6e8');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(80,60,120,0.5)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
}
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.28;
  ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.35); ctx.lineTo(cx - r * 0.5, cy - r * 0.85); ctx.lineTo(cx + r * 0.5, cy - r * 0.85); ctx.lineTo(cx + r, cy - r * 0.35); ctx.lineTo(cx, cy + r); ctx.closePath();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#b9fbff'); g.addColorStop(0.5, '#3ad0ff'); g.addColorStop(1, '#1a7bd6');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0d4a8a'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.35); ctx.lineTo(cx + r, cy - r * 0.35); ctx.moveTo(cx - r * 0.3, cy - r * 0.35); ctx.lineTo(cx, cy + r); ctx.lineTo(cx + r * 0.3, cy - r * 0.35); ctx.stroke();
}
function goldStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  star(ctx, x + s / 2, y + s / 2, s * 0.3, s * 0.14);
  const g = ctx.createLinearGradient(x, y, x, y + s); g.addColorStop(0, '#fff3a3'); g.addColorStop(1, '#ffb800');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#a86a00'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineJoin = 'round'; ctx.stroke();
}

/** The board panel with its grid of soft cells. Returns a canvas (cell size in CSS px). */
export function boardCanvas(t: Theme, cell: number, dpr: number, look: Look): HTMLCanvasElement {
  const s = cell * dpr, pad = Math.round(s * 0.2), size = s * 8 + pad * 2;
  const [c, ctx] = canvas(size, size);
  rounded(ctx, 0, 0, size, size, s * 0.45);
  ctx.fillStyle = look.contrast ? '#ffffff' : t.board; ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = look.contrast ? '#120a1c' : t.boardEdge; ctx.stroke();
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
    const x = pad + k * s, y = pad + r * s;
    rounded(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.18);
    ctx.fillStyle = look.contrast ? '#e9e4ee' : (r + k) % 2 ? t.cell : mix(t.cell, t.cellShade, 0.5); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = rgba(t.cellShade, 0.9); ctx.fillRect(x, y + s * 0.06, s, s * 0.08); ctx.restore();
    if (look.contrast) { ctx.lineWidth = 1.5; ctx.strokeStyle = '#6b6275'; ctx.stroke(); }
  }
  return c;
}

/** The full-screen background (drawn at 1× with soft shapes, so it can be large). */
export function backgroundCanvas(t: Theme, w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const rnd = seeded(t.id.length * 977 + 13);
  const area = (w * h) / 10000;
  ctx.fillStyle = t.decoColor; ctx.strokeStyle = t.decoColor;
  switch (t.deco) {
    case 'dots': for (let y = 20, row = 0; y < h; y += 46, row++) for (let x = (row % 2) * 23 + 10; x < w; x += 46) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); } break;
    case 'grain': ctx.lineWidth = 2; for (let y = 0; y < h; y += 26) { ctx.globalAlpha = 0.35 + rnd() * 0.2; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= w; x += 60) ctx.lineTo(x, y + Math.sin(x * 0.01 + y) * 6); ctx.stroke(); } break;
    case 'sprinkles': for (let i = 0; i < area * 1.6; i++) { ctx.globalAlpha = 0.7; ctx.save(); ctx.translate(rnd() * w, rnd() * h); ctx.rotate(rnd() * Math.PI); ctx.fillStyle = ['#ff9ccb', '#ffd36e', '#8fe3c8', '#9fc8ff', '#c9a4ff'][i % 5]!; rounded(ctx, -7, -2.5, 14, 5, 2.5); ctx.fill(); ctx.restore(); } break;
    case 'bubbles': ctx.lineWidth = 2; for (let i = 0; i < area * 0.5; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.3; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 4 + rnd() * 18, 0, Math.PI * 2); ctx.stroke(); } break;
    case 'stars': for (let i = 0; i < area * 1.2; i++) { ctx.globalAlpha = 0.3 + rnd() * 0.7; const x = rnd() * w, y = rnd() * h, r = 0.6 + rnd() * 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); if (r > 1.9) { star(ctx, x, y, r * 3, r * 0.6, 4, 0); ctx.fill(); } } break;
    case 'moon': {
      ctx.globalAlpha = 0.9; const mx = w * 0.82, my = h * 0.14, mr = Math.min(w, h) * 0.07;
      const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3); glow.addColorStop(0, 'rgba(255,246,214,0.35)'); glow.addColorStop(1, 'rgba(255,246,214,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h); ctx.fillStyle = t.decoColor; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.bg[0]; ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.decoColor; for (let i = 0; i < area * 0.5; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.5; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.2, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
  }
  ctx.globalAlpha = 1;
  return c;
}

/** A texture from a whole canvas. */
export const textureOf = (c: HTMLCanvasElement, resolution: number) => new Texture({ source: new CanvasSource({ resource: c, resolution, autoGenerateMipmaps: false }) });
