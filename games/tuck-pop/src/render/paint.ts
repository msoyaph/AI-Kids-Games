/** Canvas 2D drawing helpers: every texture in the game is drawn with these at startup. */

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}

export function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const parse = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
/** Mix two colors: t = 0 gives a, 1 gives b. */
export function mix(a: string, b: string, t: number) { const x = parse(a), y = parse(b); return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
export const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
export const darken = (c: string, t: number) => mix(c, '#1a0f1f', t);
export function rgba(c: string, a: number) { const [r, g, b] = parse(c); return `rgba(${r},${g},${b},${a})`; }
/** Relative luminance (WCAG), for picking readable ink. */
export function luminance(c: string) { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = parse(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }

/** The rounded system font stack (no web fonts). */
export const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif';

/** A five-point star path centred on (x, y). */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, a = rot + (i * Math.PI) / points;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.55, y - s * 0.05, x - s * 0.35, y - s * 0.55, x, y - s * 0.22);
  ctx.bezierCurveTo(x + s * 0.35, y - s * 0.55, x + s * 0.55, y - s * 0.05, x, y + s * 0.35);
  ctx.closePath();
}

/** A tiny seeded random for decorations (stable patterns, no Math.random). */
export function seeded(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
