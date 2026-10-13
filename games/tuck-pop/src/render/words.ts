/** Text as textures (the canvas shows words like "Super! +60" so previews capture them), cached. */
import { Texture } from 'pixi.js';
import { textureOf } from './atlas';
import { canvas, darken, FONT } from './paint';

const cache = new Map<string, Texture>();
let dpr = 1;
export function setWordResolution(next: number) { if (next !== dpr) { dpr = next; for (const t of cache.values()) t.destroy(true); cache.clear(); } }

export function wordTexture(text: string, size: number, color: string): Texture {
  const key = `${text}|${Math.round(size)}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 48) { const [k, t] = cache.entries().next().value as [string, Texture]; t.destroy(true); cache.delete(k); }
  const px = Math.round(size * dpr), font = `900 ${px}px ${FONT}`;
  const [m] = canvas(1, 1); const mctx = m.getContext('2d')!; mctx.font = font;
  const w = Math.ceil(mctx.measureText(text).width + px * 0.6), h = Math.ceil(px * 1.5);
  const [c, ctx] = canvas(w, h);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.22; ctx.strokeStyle = darken(color, 0.55); ctx.strokeText(text, w / 2, h / 2);
  const g = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, darken(color, 0.15));
  ctx.fillStyle = g; ctx.fillText(text, w / 2, h / 2);
  const tex = textureOf(c, dpr);
  cache.set(key, tex);
  return tex;
}
