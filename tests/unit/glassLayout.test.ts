import { describe, expect, it } from 'vitest';
import {
  CONTROL_IDS,
  controlsOverlap,
  coversRect,
  defaultLayout,
  insideSafe,
  layoutProblems,
  MIN_TARGET,
  resolveLayout,
  stickBase,
  toLayoutItem,
  type Insets,
  type Rect,
} from '../../src/input/glassLayout';

const SCREENS: Array<[string, number, number, Insets]> = [
  ['phone', 852, 393, { l: 59, r: 59, t: 0, b: 21 }],
  ['phone, no notch', 844, 390, { l: 0, r: 0, t: 0, b: 0 }],
  ['tablet', 1194, 834, { l: 0, r: 0, t: 24, b: 20 }],
  ['small tablet', 1024, 768, { l: 0, r: 0, t: 0, b: 0 }],
];

/** Roughly where the HUD sits on touch screens (timer + boss bar, weapons, counters, bars). */
function hudRects(w: number, h: number, safe: Insets): Rect[] {
  const rem = 8 + 0.009 * Math.min(w, h);
  // on touch the counters sit left of the Pause corner: max(0.8rem, inset) + 66 px from the edge
  const trRight = w - (Math.max(0.8 * rem, safe.r) + 66);
  return [
    { l: w / 2 - Math.min(16 * rem, 0.3 * w), t: 0, r: w / 2 + Math.min(16 * rem, 0.3 * w), b: 9 * rem },
    { l: 0, t: 0, r: Math.max(0.8 * rem, safe.l) + 22 * rem, b: 7 * rem },
    { l: trRight - 7 * rem, t: 0, r: trRight, b: 6 * rem },
    { l: w / 2 - Math.min(14 * rem, 0.25 * w), t: h - 4.5 * rem, r: w / 2 + Math.min(14 * rem, 0.25 * w), b: h },
  ];
}

describe('glass touch layout', () => {
  for (const [name, w, h, safe] of SCREENS) {
    for (const size of ['s', 'm', 'l'] as const) {
      for (const lefty of [false, true]) {
        it(`${name}, size ${size}${lefty ? ', left-handed' : ''}: default layout fits, no overlaps, clear of the HUD`, () => {
          const p = resolveLayout(w, h, size, safe, lefty);
          expect(layoutProblems(p, hudRects(w, h, safe), w, h, safe)).toEqual([]);
          for (const id of CONTROL_IDS) expect(p[id].d).toBeGreaterThanOrEqual(MIN_TARGET);
        });
      }
    }
  }

  it('the stick base is 112–172 px at Medium and scales with size', () => {
    expect(stickBase(852, 393, 'm')).toBeCloseTo(117.9, 1);
    expect(stickBase(1194, 834, 'm')).toBe(172);
    expect(stickBase(400, 300, 'm')).toBe(112);
    expect(stickBase(852, 393, 's')).toBeLessThan(stickBase(852, 393, 'm'));
    expect(stickBase(852, 393, 'l')).toBeGreaterThan(stickBase(852, 393, 'm'));
  });

  it('left-handed mirrors the stick and buttons; Pause stays top-right', () => {
    const [, w, h, safe] = SCREENS[0];
    const r = resolveLayout(w, h, 'm', safe, false);
    const l = resolveLayout(w, h, 'm', safe, true);
    for (const id of ['stick', 'jump', 'slide'] as const) {
      expect(l[id].x).toBeCloseTo(w - r[id].x, 6);
      expect(l[id].y).toBeCloseTo(r[id].y, 6);
    }
    expect(l.pause).toEqual(r.pause);
    expect(defaultLayout(w, h, 'm', safe, true).stick.x).toBeGreaterThan(w / 2);
  });

  it('a moved control round-trips through its stored corner anchor, across screen sizes', () => {
    const [, w, h, safe] = SCREENS[2];
    const moved = { x: 300, y: 600, d: 0 };
    const item = toLayoutItem(moved, 1.1, w, h, safe);
    expect(item.ax).toBe(0);
    expect(item.ay).toBe(1);
    const back = resolveLayout(w, h, 'm', safe, false, { jump: item }).jump;
    expect(back.x).toBeCloseTo(300, 6);
    expect(back.y).toBeCloseTo(600, 6);
    // a different screen keeps it near the same corner
    const other = resolveLayout(1024, 768, 'm', { l: 0, r: 0, t: 0, b: 0 }, false, { jump: item }).jump;
    expect(other.x).toBeLessThan(1024 / 2);
    expect(other.y).toBeGreaterThan(768 / 2);
  });

  it('stored positions are clamped back inside the safe area; sizes stay within limits', () => {
    const [, w, h, safe] = SCREENS[0];
    const p = resolveLayout(w, h, 'm', safe, false, { jump: { ax: 1, ay: 1, dx: 0, dy: 0, s: 9 }, slide: { ax: 0, ay: 0, dx: 0, dy: 0, s: 0.1 } });
    expect(insideSafe(p.jump, w, h, safe)).toBe(true);
    expect(insideSafe(p.slide, w, h, safe)).toBe(true);
    expect(p.slide.d).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(p.jump.d).toBeLessThanOrEqual(stickBase(w, h, 'm') * 0.64 * 1.25 + 1e-6);
  });

  it('flags overlaps and HUD cover', () => {
    expect(controlsOverlap({ x: 0, y: 0, d: 60 }, { x: 62, y: 0, d: 60 })).toBe(true);
    expect(controlsOverlap({ x: 0, y: 0, d: 60 }, { x: 70, y: 0, d: 60 })).toBe(false);
    expect(coversRect({ x: 50, y: 50, d: 40 }, { l: 60, t: 0, r: 100, b: 100 })).toBe(true);
    expect(coversRect({ x: 10, y: 50, d: 40 }, { l: 60, t: 0, r: 100, b: 100 })).toBe(false);
    const [, w, h, safe] = SCREENS[1];
    const p = resolveLayout(w, h, 'm', safe, false);
    p.slide = { ...p.jump };
    expect(layoutProblems(p, [], w, h, safe)).toEqual(['jump', 'slide']);
  });
});
