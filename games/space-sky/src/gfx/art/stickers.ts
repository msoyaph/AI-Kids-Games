import { STICKER_BY_ID } from '../../data/stickers';
import { circle, ink, radial, type Ctx } from '../canvas';
import { C, shade } from '../palette';
import { drawGlyph } from './glyphs';

/** Round die-cut sticker: white border, colored disc, glyph. */
export function drawSticker(ctx: Ctx, id: string, cx: number, cy: number, r: number): void {
  const def = STICKER_BY_ID[id];
  if (!def) return;
  ink(ctx, circle(cx, cy, r), C.white, Math.max(1.2, r * 0.08));
  ink(ctx, circle(cx, cy, r * 0.82), radial(ctx, cx - r * 0.3, cy - r * 0.3, 1, r, [[0, shade(def.bg, 0.25)], [1, shade(def.bg, -0.15)]]), 0);
  drawGlyph(ctx, def.glyph, cx, cy, r * 0.58, def.color ?? C.yellow);
}

/** Empty sticker spot (dashed outline + question mark). */
export function drawStickerSlot(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.setLineDash([r * 0.18, r * 0.12]);
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.stroke(circle(cx, cy, r * 0.9));
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', cx, cy + r * 0.05);
}
