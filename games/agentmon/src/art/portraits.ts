/**
 * Dialogue portraits (1.1): a 32×32 head-and-shoulders picture of whoever is talking, drawn from the
 * same look as their walking sprite (skin, hair style and colour, outfit, hats, glasses, aprons,
 * scarves, the Field Agent vest), with an expression that fits the line. Pure (no DOM).
 */
import type { CharLook } from './characters';
import { HAIR_COLORS, OUTFITS, P, SKIN } from './palette';
import { darken, lighten, PixelCanvas } from './pixelcanvas';

export type PortraitExpr = 'smile' | 'happy' | 'surprised' | 'curious' | 'worried';
export const PORTRAIT_EXPRS: readonly PortraitExpr[] = ['smile', 'happy', 'surprised', 'curious', 'worried'];

/** A face that fits the line: worried words, a question, a "wow", an exclamation, or a smile. */
export function expressionFor(line: string): PortraitExpr {
  const t = line.toLowerCase();
  if (/\b(oh no|sorry|sad|scared|worried|afraid|lost|miss)\b/.test(t)) return 'worried';
  if (/\b(wow|whoa|what|huh)\b/.test(t) || /!\?|\?!/.test(line)) return 'surprised';
  if (/\?["')\s]*$/.test(line) || /\bhmm\b/.test(t)) return 'curious';
  if (/!/.test(line)) return 'happy';
  return 'smile';
}

const HAIR_STYLES = 8;

export function drawPortrait(look: CharLook, expr: PortraitExpr = 'smile'): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const skin = SKIN[look.skin % SKIN.length]!;
  const hair = look.elder ? 0xdcdce4 : HAIR_COLORS[look.hairColor % HAIR_COLORS.length]!;
  const outfit = look.coat ?? OUTFITS[look.outfit % OUTFITS.length]!;
  const style = look.hair % HAIR_STYLES;

  // long hair falls behind the shoulders
  if (style === 1) c.rect(5, 10, 4, 15, hair).rect(23, 10, 4, 15, hair);
  if (style === 6) c.rect(5, 10, 3, 14, hair).rect(24, 10, 3, 14, hair);
  if (style === 2) c.rect(24, 6, 4, 12, hair).circle(26, 18, 2.5, hair);
  // shoulders and neck
  c.ellipse(16, 31, 12, 8, outfit);
  c.rect(14, 20, 4, 4, darken(skin, 0.12));
  if (look.agent) { c.rect(15, 24, 2, 8, P.white); c.set(11, 27, P.beacon).set(10, 27, P.beacon).set(11, 26, P.beacon).set(12, 27, P.beacon).set(11, 28, P.beacon); }
  if (look.apron !== undefined) c.rect(11, 25, 10, 7, look.apron).rect(10, 24, 2, 2, look.apron).rect(20, 24, 2, 2, look.apron);
  if (look.scarf !== undefined) c.ellipse(16, 23.5, 8, 2.5, look.scarf).rect(19, 24, 3, 5, darken(look.scarf, 0.1));
  // head
  c.ellipse(16, 13, 9.2, 9, skin);
  c.ellipse(16, 15, 8, 7, lighten(skin, 0.06));
  // hair on top
  c.ellipse(16, 7, 9.8, 5.4, hair);
  c.rect(6, 7, 2, 7, hair).rect(24, 7, 2, 7, hair);
  if (style === 3) c.circle(8, 5, 4, hair).circle(24, 5, 4, hair).circle(16, 2.5, 5, hair);
  if (style === 4) c.circle(16, 1.8, 3.6, hair);
  if (style === 5) for (const x of [9, 13, 17, 21]) c.poly([[x - 2, 4], [x, -1], [x + 2, 4]], hair);
  if (style === 7) c.rect(7, 6, 18, 3, hair).rect(5, 9, 4, 9, hair).rect(23, 9, 4, 9, hair);
  if (style === 0 || style === 5) c.rect(10, 9, 5, 2, hair); // a fringe
  // eyebrows, eyes, mouth, blush
  const brow = darken(hair, 0.25);
  const browY = expr === 'surprised' ? 9 : 10;
  if (expr === 'worried') c.set(10, 11, brow).set(11, 10, brow).set(12, 10, brow).set(20, 10, brow).set(21, 10, brow).set(22, 11, brow);
  else if (expr === 'curious') c.hline(10, 12, browY + 1, brow).set(20, browY - 1, brow).set(21, browY - 1, brow).set(22, browY, brow);
  else c.hline(10, 12, browY, brow).hline(20, 22, browY, brow);
  for (const ex of [11, 21]) {
    if (expr === 'happy') { c.set(ex - 1, 14, P.ink).set(ex, 13, P.ink).set(ex + 1, 14, P.ink); continue; }
    const tall = expr === 'surprised' ? 4 : 3;
    c.rect(ex - 1, 12, 2, tall, P.ink);
    if (expr === 'surprised') c.set(ex + 1, 13, P.ink).set(ex + 1, 14, P.ink);
    c.set(expr === 'curious' ? ex : ex - 1, 12, P.white);
  }
  if (look.glasses) {
    for (const ex of [11, 21]) { c.hline(ex - 3, ex + 2, 11, P.ink).hline(ex - 3, ex + 2, 16, P.ink); c.set(ex - 3, 12, P.ink).set(ex - 3, 15, P.ink).set(ex + 2, 12, P.ink).set(ex + 2, 15, P.ink); }
    c.hline(14, 18, 12, P.ink);
  }
  const blush = lighten(P.flowerPink, 0.25);
  c.rect(8, 16, 2, 1, blush).rect(23, 16, 2, 1, blush);
  const m = darken(skin, 0.45);
  if (expr === 'happy') c.rect(14, 17, 5, 2, P.ink).rect(15, 19, 3, 1, P.ink).set(16, 18, 0xf0687e).set(15, 18, 0xf0687e);
  else if (expr === 'surprised') c.rect(15, 17, 3, 3, P.ink).set(16, 18, 0xf0687e);
  else if (expr === 'curious') c.hline(15, 18, 18, m).set(18, 17, m);
  else if (expr === 'worried') c.hline(15, 17, 18, m).set(14, 19, m).set(18, 19, m);
  else c.set(14, 17, m).hline(15, 17, 18, m).set(18, 17, m);
  // hats
  if (look.hat) {
    const hc = look.hatColor ?? 0xd9604f;
    if (look.hat === 'cap') c.ellipse(16, 4.5, 10.5, 4.5, hc).rect(7, 7, 18, 2, darken(hc, 0.2)).set(16, 1, lighten(hc, 0.4));
    if (look.hat === 'beanie') c.ellipse(16, 4.5, 10.5, 5, hc).rect(6, 7, 20, 2, darken(hc, 0.15)).circle(16, 0.5, 2, lighten(hc, 0.4));
    if (look.hat === 'sunhat') c.ellipse(16, 7, 15, 2.6, hc).ellipse(16, 3.5, 8, 4, hc).hline(8, 24, 6, darken(hc, 0.2));
    if (look.hat === 'band') c.rect(6, 5, 20, 2, hc);
    if (look.hat === 'crown') c.rect(10, 1, 12, 3, P.beacon).set(10, 0, P.beacon).set(16, 0, P.beacon).set(21, 0, P.beacon).set(16, 2, 0xff8fb0);
  }
  return c.outline(P.ink, true);
}
