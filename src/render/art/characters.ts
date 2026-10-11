/**
 * Procedural 16×32 characters. A `Look` (skin, hair style/color, clothes, accessories)
 * is drawn for 4 directions × 5 frames: 0 stand, 1 walkA, 2 walkB, 3 use (arms up), 4 use (arms down).
 * Directions: 0 down, 1 left, 2 right, 3 up. Left is a mirror of right.
 */
import { Rng } from '../../core/rng';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';

export type HairStyle = 'short' | 'long' | 'bun' | 'pony' | 'spiky' | 'curly' | 'bald' | 'bob' | 'braids' | 'afro';
export type HatStyle = 'cap' | 'straw' | 'beanie' | 'chef' | 'captain' | 'bandana' | 'flower';

export interface Look {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  shoes?: number;
  dress?: boolean;
  apron?: number;
  overalls?: number;
  hat?: { style: HatStyle; color: number };
  glasses?: boolean;
  beard?: number;
  scarf?: number;
  eyes?: number;
  kid?: boolean;
  elder?: boolean;
  blush?: boolean;
}

export const FRAMES = 5;

interface Metrics {
  headTop: number;
  bodyTop: number;
  bodyBot: number;
  legTop: number;
  legBot: number;
}

function metrics(look: Look): Metrics {
  if (look.kid) return { headTop: 9, bodyTop: 20, bodyBot: 25, legTop: 26, legBot: 28 };
  return { headTop: 5, bodyTop: 17, bodyBot: 24, legTop: 25, legBot: 28 };
}

export function drawCharacter(look: Look, dir: number, frame: number): PixelCanvas {
  if (dir === 1) return drawCharacter(look, 2, frame).flipped();
  const c = new PixelCanvas(16, 32);
  const m = metrics(look);
  const bob = frame === 1 || frame === 2 ? -1 : 0;
  if (dir === 2) drawSide(c, look, m, frame, bob);
  else drawFrontBack(c, look, m, frame, bob, dir === 3);
  c.outline(P.ink);
  return c;
}

function drawLegs(c: PixelCanvas, look: Look, m: Metrics, frame: number, side: boolean): void {
  const shoe = look.shoes ?? P.b1;
  const pants = look.dress ? look.skin : look.pants;
  if (!side) {
    const liftL = frame === 1 ? 1 : 0, liftR = frame === 2 ? 1 : 0;
    c.rect(5, m.legTop, 3, m.legBot - m.legTop + 1 - liftL, pants);
    c.rect(8, m.legTop, 3, m.legBot - m.legTop + 1 - liftR, pants);
    c.vline(7, m.legTop, m.legBot - liftL, darken(pants, 0.2));
    c.rect(5, m.legBot + 1 - liftL, 3, 2, shoe);
    c.rect(8, m.legBot + 1 - liftR, 3, 2, shoe);
  } else {
    // side: front & back leg positions
    const front = frame === 1 ? 2 : frame === 2 ? -2 : 0;
    const back = -front;
    c.rect(6 + back, m.legTop, 3, m.legBot - m.legTop + 1, darken(pants, 0.18));
    c.rect(6 + back, m.legBot + 1, 3, 2, darken(shoe, 0.2));
    c.rect(7 + front, m.legTop, 3, m.legBot - m.legTop + 1, pants);
    c.rect(7 + front, m.legBot + 1, 4, 2, shoe);
  }
  if (look.dress) {
    const d = look.pants;
    if (!side) {
      c.rect(4, m.legTop - 1, 8, 3, d);
      c.hline(3, 12, m.legTop + 2, d);
      c.hline(3, 12, m.legTop + 3, darken(d, 0.2));
    } else {
      c.rect(5, m.legTop - 1, 7, 3, d);
      c.hline(4, 12, m.legTop + 2, d);
      c.hline(4, 12, m.legTop + 3, darken(d, 0.2));
    }
  }
}

function drawFrontBack(c: PixelCanvas, look: Look, m: Metrics, frame: number, bob: number, back: boolean): void {
  drawLegs(c, look, m, frame, false);
  const shirt = look.shirt;
  const by = m.bodyTop + bob;
  // torso
  c.rect(4, by, 8, m.bodyBot - m.bodyTop + 1, shirt);
  c.vline(11, by, m.bodyBot + bob, darken(shirt, 0.18));
  c.hline(4, 11, m.bodyBot + bob, darken(shirt, 0.25));
  if (look.overalls !== undefined) {
    const o = look.overalls;
    c.rect(5, by + 3, 6, m.bodyBot - m.bodyTop - 2, o);
    c.vline(5, by, by + 3, o);
    c.vline(10, by, by + 3, o);
    c.rect(5, m.legTop, 6, 1, o);
  }
  if (look.apron !== undefined && !back) {
    c.rect(5, by + 2, 6, m.bodyBot - m.bodyTop + 3, look.apron);
    c.hline(5, 10, by + 2, lighten(look.apron, 0.2));
  }
  if (look.scarf !== undefined) {
    c.rect(4, by, 8, 2, look.scarf);
    if (!back) c.rect(9, by + 2, 2, 3, look.scarf);
  }
  // arms
  const use = frame === 3;
  const swingL = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  if (use) {
    c.rect(3, by - 3, 1, 5, shirt);
    c.rect(12, by - 3, 1, 5, shirt);
    c.rect(3, by - 5, 1, 2, look.skin);
    c.rect(12, by - 5, 1, 2, look.skin);
  } else {
    const armLen = m.bodyBot - m.bodyTop - 1;
    c.rect(3, by + 1 + Math.max(0, swingL), 1, armLen - 2, shirt);
    c.rect(12, by + 1 + Math.max(0, -swingL), 1, armLen - 2, darken(shirt, 0.15));
    c.rect(3, by + armLen - 1 + Math.max(0, swingL), 1, 2, look.skin);
    c.rect(12, by + armLen - 1 + Math.max(0, -swingL), 1, 2, darken(look.skin, 0.1));
  }
  // head
  const ht = m.headTop + bob;
  c.ellipse(8, ht + 6, 5, 5.6, look.skin);
  c.vline(12, ht + 4, ht + 8, darken(look.skin, 0.12));
  if (!back) {
    const eye = look.eyes ?? P.ink2;
    c.rect(5, ht + 6, 1, 2, eye);
    c.rect(10, ht + 6, 1, 2, eye);
    c.set(5, ht + 6, lighten(eye, 0.5));
    c.set(10, ht + 6, lighten(eye, 0.5));
    if (look.blush !== false) {
      c.set(4, ht + 8, P.k2);
      c.set(11, ht + 8, P.k2);
    }
    c.hline(7, 8, ht + 9, darken(look.skin, 0.3));
    if (look.glasses) {
      c.rect(4, ht + 5, 3, 4, P.ink2);
      c.rect(9, ht + 5, 3, 4, P.ink2);
      c.rect(5, ht + 6, 1, 2, P.bl3);
      c.rect(10, ht + 6, 1, 2, P.bl3);
      c.set(7, ht + 6, P.ink2);
      c.set(8, ht + 6, P.ink2);
    }
    if (look.beard !== undefined) {
      c.rect(4, ht + 9, 8, 3, look.beard);
      c.hline(5, 10, ht + 12, look.beard);
      c.hline(7, 8, ht + 9, darken(look.skin, 0.3));
    }
  }
  drawHairFront(c, look, ht, back);
  drawHat(c, look, ht, back ? 3 : 0);
}

function drawHairFront(c: PixelCanvas, look: Look, ht: number, back: boolean): void {
  const h = look.hair, hd = darken(h, 0.25), hl = lighten(h, 0.2);
  const s = look.hairStyle;
  if (s === 'bald') {
    c.vline(3, ht + 5, ht + 7, h);
    c.vline(12, ht + 5, ht + 7, h);
    return;
  }
  if (s === 'afro') {
    c.ellipse(8, ht + 4, 7, 5.5, h);
    c.speckle(new Rng(7), hl, 0.15, h);
    if (!back) {
      c.rect(4, ht + 5, 8, 1, h);
    } else c.ellipse(8, ht + 6, 6.5, 5.5, h);
    return;
  }
  if (s === 'curly') {
    c.ellipse(8, ht + 3, 6.5, 4, h);
    for (let x = 2; x <= 13; x += 2) c.set(x, ht + 5, h);
    if (back) c.ellipse(8, ht + 6, 6, 5.5, h);
    c.set(6, ht + 1, hl);
    c.set(9, ht + 2, hl);
    return;
  }
  // common cap of hair
  c.ellipse(8, ht + 3.5, 5.6, 3.6, h);
  c.hline(5, 9, ht + 1, hl);
  if (back) {
    c.ellipse(8, ht + 6, 5.4, 5.4, h);
    c.hline(4, 11, ht + 10, hd);
  } else {
    // bangs
    c.hline(3, 12, ht + 4, h);
    if (s === 'spiky') {
      for (let x = 3; x <= 12; x += 2) c.set(x, ht + 5, h);
      c.set(4, ht - 1, h); c.set(8, ht - 1, h); c.set(11, ht - 1, h);
    } else {
      c.set(4, ht + 5, h);
      c.set(11, ht + 5, h);
      c.set(7, ht + 5, hd);
    }
  }
  if (s === 'long' || s === 'braids') {
    c.rect(2, ht + 4, 2, 9, h);
    c.rect(12, ht + 4, 2, 9, h);
    c.vline(2, ht + 6, ht + 12, hd);
    if (back) c.rect(3, ht + 9, 10, 5, h);
    if (s === 'braids') {
      c.set(2, ht + 13, look.shirt);
      c.set(13, ht + 13, look.shirt);
    }
  }
  if (s === 'bob') {
    c.rect(2, ht + 4, 2, 5, h);
    c.rect(12, ht + 4, 2, 5, h);
    if (back) c.rect(3, ht + 8, 10, 2, h);
  }
  if (s === 'bun') {
    c.ellipse(8, ht - 0.5, 2.6, 2.2, h);
    c.set(7, ht - 2, hl);
  }
  if (s === 'pony') {
    if (back) c.rect(7, ht + 9, 2, 6, h);
    else {
      c.rect(12, ht + 3, 2, 3, h);
    }
  }
  if (s === 'short' && !back) {
    c.vline(3, ht + 4, ht + 6, h);
    c.vline(12, ht + 4, ht + 6, h);
  }
}

function drawHat(c: PixelCanvas, look: Look, ht: number, view: number): void {
  if (!look.hat) return;
  const col = look.hat.color, d = darken(col, 0.25), l = lighten(col, 0.25);
  switch (look.hat.style) {
    case 'cap':
      c.rect(3, ht, 10, 3, col);
      c.hline(4, 11, ht - 1, col);
      c.hline(5, 8, ht, l);
      if (view === 0) c.rect(3, ht + 3, 10, 1, d);
      if (view === 2) c.rect(10, ht + 2, 5, 1, d);
      if (view === 3) c.rect(4, ht + 3, 8, 1, d);
      break;
    case 'straw':
      c.rect(4, ht - 1, 8, 4, col);
      c.rect(1, ht + 3, 14, 1, col);
      c.hline(1, 14, ht + 4, d);
      c.hline(4, 11, ht + 2, P.r2);
      break;
    case 'beanie':
      c.ellipse(8, ht + 2, 5.8, 3.6, col);
      c.rect(2, ht + 3, 12, 2, d);
      c.set(8, ht - 2, l);
      c.set(7, ht - 2, l);
      break;
    case 'chef':
      c.rect(4, ht - 4, 8, 7, P.white);
      c.ellipse(8, ht - 4, 5, 2.5, P.white);
      c.hline(4, 11, ht + 2, P.s4);
      break;
    case 'captain':
      c.rect(3, ht - 1, 10, 4, col);
      c.hline(3, 12, ht + 3, P.ink2);
      c.set(8, ht + 1, P.y1);
      if (view === 0) c.hline(4, 11, ht + 4, P.ink2);
      break;
    case 'bandana':
      c.rect(3, ht + 1, 10, 2, col);
      c.set(4, ht + 1, l);
      c.set(9, ht + 2, l);
      if (view !== 0) c.rect(2, ht + 3, 2, 2, col);
      break;
    case 'flower':
      c.ellipse(11, ht + 1, 1.8, 1.8, col);
      c.set(11, ht + 1, P.y1);
      break;
  }
}

function drawSide(c: PixelCanvas, look: Look, m: Metrics, frame: number, bob: number): void {
  drawLegs(c, look, m, frame, true);
  const shirt = look.shirt;
  const by = m.bodyTop + bob;
  // torso
  c.rect(5, by, 6, m.bodyBot - m.bodyTop + 1, shirt);
  c.vline(5, by, m.bodyBot + bob, darken(shirt, 0.18));
  c.hline(5, 10, m.bodyBot + bob, darken(shirt, 0.25));
  if (look.overalls !== undefined) {
    c.rect(6, by + 3, 5, m.bodyBot - m.bodyTop - 2, look.overalls);
    c.rect(6, m.legTop, 5, 1, look.overalls);
  }
  if (look.apron !== undefined) c.rect(9, by + 2, 3, m.bodyBot - m.bodyTop + 3, look.apron);
  if (look.scarf !== undefined) {
    c.rect(5, by, 6, 2, look.scarf);
    c.rect(4, by + 2, 2, 3, look.scarf);
  }
  // arm
  const use = frame === 3;
  const sw = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  if (use) {
    c.rect(9, by - 4, 2, 6, shirt);
    c.rect(9, by - 6, 2, 2, look.skin);
  } else {
    const ax = 7 + Math.sign(sw);
    c.rect(ax, by + 1, 2, m.bodyBot - m.bodyTop - 2, darken(shirt, 0.1));
    c.rect(ax + (sw > 0 ? 1 : 0), m.bodyBot + bob - 1, 2, 2, look.skin);
  }
  // head
  const ht = m.headTop + bob;
  c.ellipse(8.5, ht + 6, 5, 5.6, look.skin);
  c.set(14, ht + 7, look.skin); // nose
  const eye = look.eyes ?? P.ink2;
  c.rect(11, ht + 6, 1, 2, eye);
  c.set(11, ht + 6, lighten(eye, 0.5));
  if (look.blush !== false) c.set(11, ht + 9, P.k2);
  c.set(13, ht + 9, darken(look.skin, 0.3));
  if (look.glasses) {
    c.rect(10, ht + 5, 3, 4, P.ink2);
    c.set(11, ht + 6, P.bl3);
    c.set(11, ht + 7, P.bl3);
  }
  if (look.beard !== undefined) {
    c.rect(8, ht + 9, 6, 3, look.beard);
    c.set(13, ht + 9, darken(look.skin, 0.3));
  }
  // hair (covers back of head)
  const h = look.hair, hd = darken(h, 0.25), hl = lighten(h, 0.2);
  const s = look.hairStyle;
  if (s === 'bald') {
    c.vline(4, ht + 5, ht + 7, h);
  } else if (s === 'afro') {
    c.ellipse(7, ht + 4.5, 6.5, 5.5, h);
    c.rect(10, ht + 5, 2, 1, h);
  } else if (s === 'curly') {
    c.ellipse(7.5, ht + 3.5, 6, 4, h);
    c.rect(3, ht + 4, 4, 5, h);
    for (let y = ht + 4; y < ht + 10; y += 2) c.set(2, y, h);
  } else {
    c.ellipse(8, ht + 3.5, 5.6, 3.6, h);
    c.rect(3, ht + 3, 5, 6, h);
    c.hline(9, 13, ht + 4, h);
    c.hline(6, 10, ht + 1, hl);
    if (s === 'spiky') { c.set(5, ht - 1, h); c.set(9, ht - 1, h); c.set(12, ht + 1, h); }
    if (s === 'long' || s === 'braids') { c.rect(3, ht + 8, 4, 6, h); c.vline(3, ht + 8, ht + 13, hd); }
    if (s === 'bob') c.rect(3, ht + 8, 4, 2, h);
    if (s === 'bun') c.ellipse(4, ht + 2, 2.4, 2.2, h);
    if (s === 'pony') { c.rect(1, ht + 4, 2, 5, h); c.set(2, ht + 9, hd); }
  }
  drawHat(c, look, ht, 2);
}

/** Shadow ellipse drawn under every character/animal. */
export function shadowSprite(w = 12): PixelCanvas {
  const c = new PixelCanvas(16, 6);
  c.ellipse(8, 3, w / 2, 2.2, 0x000000);
  return c;
}
