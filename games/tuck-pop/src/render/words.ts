/** Text as textures (the canvas shows words like "Super! +60" so previews capture them), cached. */
import { Texture } from 'pixi.js';
import { textureOf } from './atlas';
import { canvas, darken, FONT } from './paint';

const cache = new Map<string, Texture>();
let dpr = 1;
/** Textures leave the cache at once but are destroyed later: a word on screen may still show one. */
const retire = (t: Texture) => { setTimeout(() => t.destroy(true), 5000); };
export function setWordResolution(next: number) { if (next !== dpr) { dpr = next; for (const t of cache.values()) retire(t); cache.clear(); } }

/** Text as a texture. A second line (after "\n") is drawn smaller, under the first. */
export function wordTexture(text: string, size: number, color: string): Texture {
  const key = `${text}|${Math.round(size)}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 48) { const [k, t] = cache.entries().next().value as [string, Texture]; retire(t); cache.delete(k); }
  const lines = text.split('\n');
  const px = lines.map((_, i) => Math.round(size * dpr * (i === 0 ? 1 : 0.68)));
  const [m] = canvas(1, 1); const mctx = m.getContext('2d')!;
  const widths = lines.map((line, i) => { mctx.font = `900 ${px[i]}px ${FONT}`; return mctx.measureText(line).width; });
  const w = Math.ceil(Math.max(...widths) + px[0]! * 0.6), h = Math.ceil(px.reduce((a, b) => a + b * 1.18, 0) + px[0]! * 0.35);
  const [c, ctx] = canvas(w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  let y = px[0]! * 0.18;
  lines.forEach((line, i) => {
    const p = px[i]!; y += p * 0.59;
    ctx.font = `900 ${p}px ${FONT}`;
    ctx.lineWidth = p * 0.22; ctx.strokeStyle = darken(color, 0.55); ctx.strokeText(line, w / 2, y);
    const g = ctx.createLinearGradient(0, y - p * 0.4, 0, y + p * 0.4); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, darken(color, 0.15));
    ctx.fillStyle = g; ctx.fillText(line, w / 2, y);
    y += p * 0.59;
  });
  const tex = textureOf(c, dpr);
  cache.set(key, tex);
  return tex;
}
