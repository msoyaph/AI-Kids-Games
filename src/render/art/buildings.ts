/** Procedural building sprites from StructureDef look parameters. */
import { Rng } from '../../core/rng';
import { STRUCTURES, type StructureDef } from '../../data/structures';
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';

const ICONS: Record<string, { rows: string[]; map: Record<string, number> }> = {
  store: { rows: ['..aa..', '.a..a.', 'bbbbbb', 'bccccb', 'bccccb', 'bbbbbb'], map: { a: P.b1, b: P.g2, c: P.g4 } },
  anvil: { rows: ['aaaaaa', 'aaaaa.', '..aa..', '.aaaa.'], map: { a: P.s1 } },
  saw: { rows: ['bbbbb.', 'aaaaab', 'a.a.a.'], map: { a: P.s3, b: P.b3 } },
  egg: { rows: ['.aa.', 'aaaa', 'aaaa', '.aa.'], map: { a: P.white } },
  cup: { rows: ['.c.c.', 'aaaab', 'aaaab', '.aa..'], map: { a: P.white, b: P.white, c: P.s4 } },
  star: { rows: ['..a..', 'aaaaa', '.aaa.', 'a...a'], map: { a: P.y1 } },
  gem: { rows: ['.aaa.', 'abbba', '.aba.', '..a..'], map: { a: P.p2, b: P.p3 } },
  fish: { rows: ['.aaa.a', 'abaaaa', '.aaa.a'], map: { a: P.bl3, b: P.ink } },
  train: { rows: ['a.aaa.', 'aaaaaa', 'aaaaaa', '.b..b.'], map: { a: P.r2, b: P.ink } },
};

function windowAt(c: PixelCanvas, x: number, y: number, trim: number, flowers: boolean, rng: Rng): void {
  c.rect(x, y, 10, 9, trim);
  c.rect(x + 1, y + 1, 8, 7, P.w3);
  c.rect(x + 1, y + 1, 3, 2, P.w4);
  c.vline(x + 5, y + 1, y + 7, trim);
  c.hline(x + 1, x + 8, y + 4, trim);
  if (flowers) {
    c.rect(x - 1, y + 9, 12, 3, P.b2);
    for (let k = 0; k < 5; k++) c.set(x + rng.int(10), y + 8, rng.pick([P.k2, P.r2, P.y1, P.white]));
  }
}

function roof(c: PixelCanvas, W: number, bottom: number, col: number, top = 2): void {
  const dark = darken(col, 0.15), eave = darken(col, 0.35), ridge = lighten(col, 0.2);
  for (let y = top; y <= bottom; y++) {
    const inset = Math.max(0, 7 - (y - top)) ;
    const row = Math.floor((y - top) / 4);
    for (let x = inset; x < W - inset; x++) {
      let cc = row % 2 ? col : dark;
      if ((x + (row % 2) * 3) % 6 === 0 && (y - top) % 4 !== 0) cc = eave;
      c.set(x, y, cc);
    }
  }
  c.hline(7, W - 8, top, ridge);
  c.hline(0, W - 1, bottom, eave);
  c.hline(0, W - 1, bottom - 1, eave);
}

function siding(c: PixelCanvas, x0: number, y0: number, w: number, h: number, col: number, vertical = false): void {
  c.rect(x0, y0, w, h, col);
  const line = darken(col, 0.14);
  if (vertical) for (let x = x0 + 3; x < x0 + w; x += 4) c.vline(x, y0, y0 + h - 1, line);
  else for (let y = y0 + 3; y < y0 + h; y += 4) c.hline(x0, x0 + w - 1, y, line);
}

function door(c: PixelCanvas, x: number, bottom: number, col: number, trim: number, wide = false): void {
  const w = wide ? 14 : 10, h = 14;
  const x0 = wide ? x + 1 : x + 3;
  c.rect(x0 - 1, bottom - h - 1, w + 2, h + 1, trim);
  c.rect(x0, bottom - h, w, h, col);
  c.vline(x0 + Math.floor(w / 2), bottom - h, bottom - 1, darken(col, 0.25));
  c.set(x0 + w - 3, bottom - 7, P.y1);
  if (wide) {
    c.line(x0, bottom - h, x0 + w - 1, bottom - 1, P.white);
    c.line(x0 + w - 1, bottom - h, x0, bottom - 1, P.white);
  }
}

function sign(c: PixelCanvas, cx: number, y: number, icon: string): void {
  const ic = ICONS[icon];
  c.rect(cx - 7, y, 14, 9, P.b4);
  c.hline(cx - 7, cx + 6, y, P.b5);
  c.hline(cx - 7, cx + 6, y + 8, P.b2);
  if (!ic) return;
  const w = ic.rows[0].length, h = ic.rows.length;
  c.rows(ic.rows, ic.map, cx - Math.floor(w / 2), y + Math.floor((9 - h) / 2));
}

export function drawBuilding(def: StructureDef, seed = 1): PixelCanvas {
  const { w, h, look } = def;
  const rng = new Rng(seed);
  const W = w * 16, R = look.roofH * 16, H = h * 16 + R;
  const c = new PixelCanvas(W, H);
  const wallY = R;
  const style = look.style ?? 'house';
  const doorX = def.door ? def.door.dx * 16 : -100;

  if (style === 'silo') {
    const x0 = 4, x1 = W - 5;
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0);
      const col = t < 0.25 ? lighten(look.wall, 0.2) : t > 0.75 ? darken(look.wall, 0.25) : look.wall;
      c.vline(x, 18, H - 1, col);
    }
    for (let y = 28; y < H; y += 10) c.hline(x0, x1, y, look.trim);
    c.ellipse(W / 2, 18, (x1 - x0) / 2 + 1, 12, look.roof);
    c.ellipse(W / 2 - 3, 13, 6, 4, lighten(look.roof, 0.2));
    c.rect(W / 2 - 3, H - 14, 6, 13, darken(look.wall, 0.5));
    c.outline(P.ink);
    return c;
  }
  if (style === 'well') {
    c.ellipse(W / 2, H - 9, 14, 8, look.wall);
    c.ellipse(W / 2, H - 11, 10, 5, P.w1);
    c.speckle(rng, darken(look.wall, 0.2), 0.15, look.wall);
    c.rect(4, 6, 3, H - 16, look.trim);
    c.rect(W - 7, 6, 3, H - 16, look.trim);
    c.hline(4, W - 5, 12, look.trim);
    roof(c, W, 10, look.roof, 1);
    c.rect(W / 2 - 1, 13, 2, 8, P.s2);
    c.rect(W / 2 - 3, 20, 6, 4, P.b3);
    c.outline(P.ink);
    return c;
  }
  if (style === 'ruin') {
    // rocky arch (mine entrance) or broken greenhouse
    if (def === STRUCTURES.mineEntrance) {
      c.ellipse(W / 2, H / 2 + 6, W / 2, H / 2 - 2, P.s2);
      c.speckle(rng, P.s1, 0.2, P.s2);
      c.speckle(rng, P.s3, 0.12, P.s2);
      c.rect(doorX + 1, H - 30, 14, 30, P.ink);
      c.ellipse(doorX + 8, H - 30, 7, 6, P.ink);
      c.rect(doorX - 1, H - 32, 2, 32, P.b3);
      c.rect(doorX + 15, H - 32, 2, 32, P.b3);
      c.rect(doorX - 1, H - 34, 18, 3, P.b3);
      c.outline(P.ink);
      return c;
    }
    // broken greenhouse
    siding(c, 1, wallY, W - 2, h * 16, look.wall);
    for (let x = 1; x < W - 1; x += 8) c.vline(x, wallY - 4, H - 1, look.trim);
    for (let y = wallY + 6; y < H; y += 10) c.hline(1, W - 2, y, look.trim);
    for (let y = 4; y < wallY; y += 4) c.hline(4 + (wallY - y) / 3, W - 5 - (wallY - y) / 3, y, look.trim);
    for (let k = 0; k < 7; k++) {
      const x = 2 + rng.int(W - 10), y = wallY + rng.int(h * 16 - 8);
      c.rect(x, y, 6, 5, P.ink2);
      c.line(x, y, x + 5, y + 4, P.s4);
    }
    for (let k = 0; k < 30; k++) c.set(rng.int(W), wallY + rng.int(h * 16), rng.pick([P.g2, P.g3, P.g4]));
    c.rect(W / 2 - 8, H - 18, 16, 3, P.b3);
    c.rect(W / 2 - 6, H - 12, 12, 3, P.b3);
    c.outline(P.ink);
    return c;
  }
  if (style === 'greenhouse') {
    c.rect(1, wallY, W - 2, h * 16, look.wall);
    for (let x = 1; x < W - 1; x += 8) c.vline(x, wallY, H - 1, look.trim);
    for (let y = wallY + 6; y < H; y += 10) c.hline(1, W - 2, y, look.trim);
    for (let y = 2; y <= wallY + 2; y++) {
      const inset = Math.max(0, Math.round((wallY - y) / 3));
      c.hline(inset, W - 1 - inset, y, y % 5 === 0 ? look.trim : look.roof);
    }
    for (let x = 6; x < W - 6; x += 8) c.line(x, wallY, W / 2, 2, lighten(look.roof, 0.2));
    c.speckle(rng, P.white, 0.03, look.wall);
    door(c, doorX, H, lighten(look.wall, 0.1), look.trim);
    c.outline(P.ink);
    return c;
  }
  if (style === 'station') {
    c.rect(0, wallY + 8, W, h * 16 - 8, P.s3);
    c.speckle(rng, P.s2, 0.1, P.s3);
    roof(c, W, wallY + 4, look.roof, 6);
    for (let x = 4; x < W; x += 24) c.rect(x, wallY + 4, 3, h * 16 - 4, look.trim);
    siding(c, 30, wallY + 6, W - 60, h * 16 - 10, look.wall);
    windowAt(c, 36, wallY + 12, look.trim, false, rng);
    if (look.sign) sign(c, W / 2, wallY - 2, look.sign);
    c.outline(P.ink);
    return c;
  }

  // walls
  const vertical = style === 'barn' || style === 'coop';
  siding(c, 1, wallY, W - 2, h * 16, look.wall, vertical);
  c.rect(1, H - 3, W - 2, 3, P.s2);
  c.vline(1, wallY, H - 1, look.trim);
  c.vline(W - 2, wallY, H - 1, look.trim);
  if (style === 'hall') {
    for (let x = 8; x < W - 8; x += 24) {
      c.rect(x, wallY + 4, 5, h * 16 - 7, P.white);
      c.vline(x + 4, wallY + 4, H - 4, P.s4);
    }
    c.rect(doorX - 6, H - 3, 28, 3, P.s4);
  }
  // roof
  if (style === 'barn') {
    roof(c, W, wallY + 6, look.roof, 0);
    c.rect(W / 2 - 6, wallY - 12, 12, 10, darken(look.wall, 0.4));
    c.rect(W / 2 - 5, wallY - 11, 10, 8, P.y1);
    c.speckle(rng, P.o3, 0.3, P.y1);
  } else {
    roof(c, W, wallY + 6, look.roof);
  }
  if (look.chimney) {
    c.rect(W - 22, 0, 7, 12, P.r1);
    c.hline(W - 23, W - 15, 0, P.s2);
    for (let y = 3; y < 12; y += 3) c.hline(W - 22, W - 16, y, darken(P.r1, 0.25));
  }
  if (style === 'hall') {
    c.circle(W / 2, R / 2 + 2, 8, P.white);
    c.circle(W / 2, R / 2 + 2, 6, P.y2);
    c.line(W / 2, R / 2 + 2, W / 2, R / 2 - 3, P.ink2);
    c.line(W / 2, R / 2 + 2, W / 2 + 3, R / 2 + 2, P.ink2);
  }
  // windows
  const cols: number[] = [];
  for (let i = 0; i < w; i++) if (i !== (def.door?.dx ?? -1)) cols.push(i);
  const n = Math.min(look.windows, cols.length);
  for (let k = 0; k < n; k++) {
    const col = cols[Math.round(((k + 0.5) / n) * cols.length - 0.5)];
    windowAt(c, col * 16 + 3, wallY + (h >= 4 ? 16 : 10), look.trim, style === 'house', rng);
  }
  // awning for shops
  if (style === 'shop') {
    for (let x = 2; x < W - 2; x++) {
      const stripe = Math.floor(x / 4) % 2 ? look.roof : P.white;
      c.vline(x, wallY + 7, wallY + 10, stripe);
      if (x % 4 === 1) c.set(x, wallY + 11, stripe);
    }
  }
  if (def.door) door(c, doorX, H - 2, darken(look.trim, 0.1), look.trim, style === 'barn');
  if (look.sign) sign(c, doorX + 8, wallY + (style === 'shop' ? 0 : 2), look.sign);
  if (style === 'coop') {
    c.line(doorX + 2, H - 1, doorX + 13, H - 1, P.b3);
  }
  c.outline(P.ink);
  return c;
}

function plotMarker(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.rect(6, 4, 3, 10, P.b4);
  c.rect(4, 3, 7, 4, P.y2);
  c.hline(4, 10, 3, P.y3);
  c.outline(P.ink);
  return c;
}

export function bakeBuildings(atlas: Atlas): void {
  let seed = 3;
  for (const [key, def] of Object.entries(STRUCTURES)) {
    if (key === 'plot') continue;
    atlas.add(`bld.${key}`, drawBuilding(def, seed++));
  }
  atlas.add('bld.plot', plotMarker());
}
