/**
 * "Crystal-tech" painting helpers: brushed metal, chamfered plates, faceted
 * crystals, rune rings and energy cores. Bake-time only.
 */
import { css, darken, lighten, mixColor } from '../../core/math';
import type { Ctx } from './paint';

/** Shared palette for the crystal-tech look. */
export const TECH = {
  ink: 0x070b16, // outlines
  steelDark: 0x1c2436,
  steel: 0x34405a,
  steelLight: 0x7f90b3,
  trim: 0xb9c6e4,
  gold: 0xffc845,
  cyan: 0x3ee6ff,
  danger: 0xff4d6a,
} as const;

/** Brushed-metal linear gradient (top-left light, bands of sheen). */
export function metalGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, base: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, css(lighten(base, 0.45)));
  g.addColorStop(0.22, css(lighten(base, 0.12)));
  g.addColorStop(0.5, css(base));
  g.addColorStop(0.62, css(lighten(base, 0.2)));
  g.addColorStop(1, css(darken(base, 0.45)));
  return g;
}

/** Path: regular polygon with every corner clipped (an "octagon plate" look for squares). */
export function chamferPoly(ctx: Ctx, cx: number, cy: number, sides: number, r: number, cut: number, rot = 0): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const a2 = rot + ((i + 1) / sides) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r;
    const y1 = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a2) * r;
    const y2 = cy + Math.sin(a2) * r;
    const t = cut / Math.hypot(x2 - x1, y2 - y1);
    const ax = x1 + (x2 - x1) * t;
    const ay = y1 + (y2 - y1) * t;
    const bx = x2 - (x2 - x1) * t;
    const by = y2 - (y2 - y1) * t;
    if (i === 0) ctx.moveTo(ax, ay);
    else ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
}

/** Path: rectangle with chamfered corners. */
export function chamferRect(ctx: Ctx, x: number, y: number, w: number, h: number, c: number): void {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

export function strokePath(ctx: Ctx, color: number | string, lw: number, alpha = 1): void {
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = typeof color === 'number' ? css(color, alpha) : color;
  ctx.stroke();
}

/**
 * Faceted polygon: fills triangles from the centre to each edge with a shade
 * based on the edge's facing (light from the top-left) — reads as a cut gem.
 */
export function facets(ctx: Ctx, cx: number, cy: number, pts: [number, number][], color: number, outline = TECH.ink, lw = 1.6): void {
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    const mx = (x1 + x2) / 2 - cx;
    const my = (y1 + y2) / 2 - cy;
    const len = Math.hypot(mx, my) || 1;
    // facing toward (-0.7, -0.7) = lit
    const lit = (-(mx / len) * 0.7 - (my / len) * 0.7 + 1) / 2;
    const shade = lit > 0.5 ? lighten(color, (lit - 0.5) * 1.1) : darken(color, (0.5 - lit) * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fillStyle = css(shade);
    ctx.fill();
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  strokePath(ctx, outline, lw);
  // inner facet lines
  ctx.strokeStyle = css(lighten(color, 0.6), 0.45);
  ctx.lineWidth = Math.max(0.6, lw * 0.45);
  ctx.beginPath();
  for (const [x, y] of pts) {
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** An elongated crystal shard (hexagonal prism seen from the side), pointing along `rot`. */
export function crystal(ctx: Ctx, cx: number, cy: number, len: number, wid: number, rot: number, color: number, lw = 1.4): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const tip = len / 2;
  const base = -len / 2;
  const pts: [number, number][] = [
    [tip, 0],
    [tip - wid * 0.9, -wid / 2],
    [base + wid * 0.3, -wid / 2],
    [base, 0],
    [base + wid * 0.3, wid / 2],
    [tip - wid * 0.9, wid / 2],
  ];
  facets(ctx, (tip + base) / 2 + wid * 0.2, 0, pts, color, TECH.ink, lw);
  ctx.restore();
}

/** Bright energy core: white hot centre, coloured body, soft halo. */
export function energyCore(ctx: Ctx, cx: number, cy: number, r: number, color: number, halo = 1.9): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * halo);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, css(lighten(color, 0.7), 1));
  g.addColorStop(0.42, css(color, 0.9));
  g.addColorStop(0.62, css(color, 0.35));
  g.addColorStop(1, css(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * halo, 0, Math.PI * 2);
  ctx.fill();
}

/** Thin glowing ring with evenly spaced rune ticks. */
export function runeRing(ctx: Ctx, cx: number, cy: number, r: number, color: number, ticks = 12, lw = 1.6, alpha = 1): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(color, 0.35 * alpha);
  ctx.lineWidth = lw * 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = css(lighten(color, 0.35), alpha);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = lw * 0.9;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const long = i % 3 === 0;
    const r0 = r - lw * (long ? 2.4 : 1.4);
    const r1 = r + lw * (long ? 2.4 : 1.4);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** A split ring: one element on the left half, the other on the right. */
export function dualRing(ctx: Ctx, cx: number, cy: number, r: number, a: number, b: number, lw = 2): void {
  ctx.save();
  ctx.lineCap = 'butt';
  for (const [col, from] of [
    [a, Math.PI * 0.5],
    [b, Math.PI * 1.5],
  ] as const) {
    ctx.strokeStyle = css(col, 0.35);
    ctx.lineWidth = lw * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, from + 0.08, from + Math.PI - 0.08);
    ctx.stroke();
    ctx.strokeStyle = css(lighten(col, 0.3));
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, from + 0.08, from + Math.PI - 0.08);
    ctx.stroke();
  }
  ctx.restore();
}

/** Small glowing sensor lens (constructs "look" with these — no faces). */
export function lens(ctx: Ctx, cx: number, cy: number, r: number, color: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = css(TECH.ink);
  ctx.fill();
  energyCore(ctx, cx, cy, r * 0.75, color, 1.6);
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

/** Metal bolt / rivet. */
export function rivet(ctx: Ctx, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, css(TECH.trim));
  g.addColorStop(1, css(TECH.steelDark));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

/** Sharp specular glint (a thin four-point star). */
export function glint(ctx: Ctx, x: number, y: number, r: number, alpha = 0.9): void {
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.16, y - r * 0.16);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.16, y + r * 0.16);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.16, y + r * 0.16);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.16, y - r * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Soft contact shadow under objects (darker, tighter than the old cartoon shadow). */
export function contactShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.5): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(2,4,12,${alpha})`);
  g.addColorStop(0.65, `rgba(2,4,12,${alpha * 0.5})`);
  g.addColorStop(1, 'rgba(2,4,12,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Tint helper used by element-coloured parts. */
export function energyOf(color: number, k = 0.15): number {
  return mixColor(color, 0xffffff, k);
}
