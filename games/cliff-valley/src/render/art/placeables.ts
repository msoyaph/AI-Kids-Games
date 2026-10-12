/** Placeable object sprites (world) + their item icons. */
import { CHEST_COLORS } from '../../data/placeables';
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';
import { Rng } from '../../core/rng';

function chest(col: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 5, 14, 10, P.b3);
  c.rect(1, 2, 14, 4, P.b4);
  c.hline(1, 14, 2, P.b5);
  c.hline(1, 14, 6, P.b1);
  c.rect(1, 5, 14, 2, col);
  c.hline(1, 14, 5, lighten(col, 0.3));
  c.rect(7, 6, 2, 3, P.y1);
  c.set(7, 7, P.o1);
  c.vline(1, 2, 14, P.b2);
  c.vline(14, 2, 14, P.b2);
  c.outline(P.ink);
  return c;
}

function scarecrow(): PixelCanvas {
  const c = new PixelCanvas(16, 32);
  c.vline(8, 10, 31, P.b2);
  c.hline(2, 13, 15, P.b2);
  c.rect(5, 14, 6, 9, P.bl2);
  c.rect(4, 15, 2, 2, P.bl2);
  c.rect(10, 15, 2, 2, P.bl2);
  c.set(7, 17, P.y1);
  c.set(9, 19, P.y1);
  c.circle(8, 9, 3.8, 0xe6c98f);
  c.set(7, 9, P.ink); c.set(9, 9, P.ink); c.hline(7, 9, 11, P.b2);
  c.rect(3, 4, 10, 2, P.y1);
  c.rect(5, 1, 6, 4, P.y1);
  c.hline(5, 10, 3, P.r2);
  c.set(2, 22, P.y2); c.set(13, 21, P.y2);
  c.outline(P.ink);
  return c;
}

function sprinkler(tier: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const m = [P.s3, P.o2, P.y1][tier - 1], d = darken(m, 0.3);
  c.ellipse(8, 12, 5, 2.5, d);
  c.rect(6, 6, 4, 6, m);
  c.ellipse(8, 6, 3, 1.5, lighten(m, 0.3));
  c.set(8, 3, P.w3);
  if (tier >= 2) { c.set(5, 4, P.w3); c.set(11, 4, P.w3); }
  if (tier >= 3) { c.set(3, 6, P.w4); c.set(13, 6, P.w4); c.set(8, 1, P.w4); }
  c.outline(P.ink);
  return c;
}

function fence(stone: boolean, east: boolean, south: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const m = stone ? P.s3 : P.b4, d = stone ? P.s1 : P.b2, l = stone ? P.s4 : P.b5;
  if (east) {
    c.rect(8, 5, 8, 2, m);
    c.rect(8, 10, 8, 2, m);
    c.hline(8, 15, 5, l);
  }
  if (south) {
    c.rect(7, 8, 2, 8, d);
  }
  c.rect(6, 2, 4, 13, m);
  c.vline(6, 2, 14, l);
  c.vline(9, 2, 14, d);
  c.hline(6, 9, 2, l);
  c.outline(P.ink);
  return c;
}

function gate(open: boolean): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(0, 2, 2, 13, P.b4);
  c.rect(14, 2, 2, 13, P.b4);
  if (open) {
    c.rect(2, 4, 2, 10, P.b3);
  } else {
    c.rect(2, 5, 12, 2, P.b3);
    c.rect(2, 10, 12, 2, P.b3);
    c.line(2, 11, 13, 5, P.b3);
  }
  c.outline(P.ink);
  return c;
}

function floor(kind: string): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  const r = new Rng(kind.length);
  if (kind === 'woodPath') {
    c.rect(1, 1, 14, 14, P.b4);
    for (let y = 1; y < 15; y += 4) c.hline(1, 14, y + 3, P.b2);
    c.vline(7, 1, 4, P.b2); c.vline(11, 5, 8, P.b2); c.vline(4, 9, 12, P.b2);
  } else if (kind === 'stonePath') {
    c.ellipse(5, 5, 3.5, 3, P.s3); c.ellipse(11, 6, 3, 3, P.s4); c.ellipse(6, 11, 3.5, 3, P.s4); c.ellipse(12, 12, 2.5, 2.5, P.s3);
  } else if (kind === 'brickPath') {
    c.rect(0, 0, 16, 16, 0x8a3a2a);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) c.rect(x, y, 7, 3, 0xb85a40);
  } else {
    c.rect(0, 0, 16, 16, 0xa09a8a);
    c.speckle(r, 0x7a7468, 0.3);
    c.speckle(r, 0xc8c0b0, 0.2);
  }
  return c;
}

function torch(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(7, 7, 2, 8, P.b3);
  c.ellipse(8, 5, 2.5, 3, P.o2);
  c.ellipse(8, 5.5, 1.3, 1.8, P.y2);
  c.outline(P.ink);
  return c;
}

export function bakePlaceables(atlas: Atlas): void {
  CHEST_COLORS.forEach((col, i) => atlas.add(`obj.chest.${i}`, chest(col)));
  atlas.add('item.chest', chest(CHEST_COLORS[0]), true);
  const sc = scarecrow();
  atlas.add('obj.scarecrow', sc);
  const icon = new PixelCanvas(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) icon.set(x, y, sc.get(x, Math.min(31, y * 2)));
  atlas.add('item.scarecrow', icon, true);
  for (let t = 1; t <= 3; t++) {
    const s = sprinkler(t);
    atlas.add(`obj.sprinkler${t}`, s);
    atlas.add(`item.sprinkler${t}`, s.clone(), true);
  }
  for (const [id, stone] of [['woodFence', false], ['stoneFence', true]] as const) {
    for (let m = 0; m < 4; m++) atlas.add(`obj.${id}.${m}`, fence(stone, (m & 1) > 0, (m & 2) > 0));
    atlas.add(`item.${id}`, fence(stone, true, false), true);
  }
  atlas.add('obj.gate.0', gate(false));
  atlas.add('obj.gate.1', gate(true));
  atlas.add('item.gate', gate(false), true);
  for (const k of ['woodPath', 'stonePath', 'brickPath', 'gravelPath']) {
    atlas.add(`floor.${k}`, floor(k));
    atlas.add(`item.${k}`, floor(k), true);
  }
  atlas.add('item.torch', torch(), true);
  atlas.add('obj.torch', torch());
}
