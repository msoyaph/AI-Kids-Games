import type { BadgeDef } from '../../data/badges';
import { circle, ink, poly, radial, type Ctx } from '../canvas';
import { C, shade } from '../palette';
import { drawGlyph } from './glyphs';

/** A badge medallion with ribbons (DOM UI art). */
export function drawBadge(ctx: Ctx, b: BadgeDef, w: number, hh: number, earned: boolean): void {
  const cx = w / 2;
  const cy = hh * 0.56;
  const r = w * 0.36;
  ink(ctx, poly([cx - r * 0.7, cy - r * 1.35, cx - r * 0.2, cy - r * 1.35, cx + r * 0.1, cy - r * 0.6, cx - r * 0.4, cy - r * 0.6]), earned ? C.blue : '#5a5280', 3);
  ink(ctx, poly([cx + r * 0.7, cy - r * 1.35, cx + r * 0.2, cy - r * 1.35, cx - r * 0.1, cy - r * 0.6, cx + r * 0.4, cy - r * 0.6]), earned ? C.red : '#5a5280', 3);
  const col = earned ? b.color : '#4a4470';
  ink(ctx, circle(cx, cy, r), radial(ctx, cx - r * 0.3, cy - r * 0.3, 2, r * 1.2, [[0, shade(col, 0.4)], [1, shade(col, -0.25)]]), 4);
  ink(ctx, circle(cx, cy, r * 0.74), 'rgba(255,255,255,0.18)', 2);
  drawGlyph(ctx, b.glyph, cx, cy, r * 0.5, earned ? C.white : '#8a84b0');
}
