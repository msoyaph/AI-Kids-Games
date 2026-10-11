import { describe, expect, it } from 'vitest';
import { STICK, clampKnob, floatingOrigin, stickResponse } from '../../src/input/touch/stick';
import { bestDefaultLayout, touchHudScale, CONTROL_IDS, MIN_TARGET, defaultLayout, diameters, hudRects, layoutProblems, solveLayout, stickZone, targetSize, type Layout, type Viewport } from '../../src/input/touch/layout';
import { DEFAULT_TOUCH_CONFIG, sanitizeTouchConfig } from '../../src/input/touch/config';

const R = 40; // knob travel radius (px)

describe('joystick response', () => {
  it('has a small dead zone, a gentle curve and full lock before the edge', () => {
    expect(stickResponse(0, R)).toBe(0);
    expect(stickResponse(R * STICK.deadZone * 0.99, R)).toBe(0);
    expect(stickResponse(R * 0.2, R)).toBeGreaterThan(0);
    expect(stickResponse(R * 0.5, R)).toBeLessThan(0.5); // gentle in the middle
    expect(stickResponse(R * STICK.fullLock, R)).toBe(1);
    expect(stickResponse(R * 3, R)).toBe(1);
  });
  it('is symmetric and monotonic', () => {
    let prev = -Infinity;
    for (let x = -R; x <= R; x += 1) {
      const v = stickResponse(x, R);
      expect(v).toBeCloseTo(-stickResponse(-x, R), 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it('only the horizontal axis steers; the knob stays on its circle', () => {
    const k = clampKnob(30, 40, R);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(R, 6);
    expect(stickResponse(clampKnob(0, -90, R).x, R)).toBe(0);
  });
  it('a floating stick appears under the thumb but never off screen', () => {
    const b = { left: 0, top: 0, right: 800, bottom: 400 };
    expect(floatingOrigin(200, 250, 66, b)).toEqual({ x: 200, y: 250 });
    expect(floatingOrigin(10, 390, 66, b)).toEqual({ x: 66, y: 334 });
  });
});

const phone: Viewport = { w: 844, h: 390, safe: { l: 47, t: 0, r: 47, b: 21 }, hudScale: 1 };
const shortPhone: Viewport = { w: 750, h: 342, safe: { l: 0, t: 0, r: 0, b: 0 }, hudScale: 1 };
const tablet: Viewport = { w: 1080, h: 810, safe: { l: 0, t: 20, r: 0, b: 20 }, hudScale: 1 };
const tabletPortrait: Viewport = { w: 810, h: 1080, safe: { l: 0, t: 20, r: 0, b: 20 }, hudScale: 1 };

describe('touch layout', () => {
  for (const [name, vp] of [['phone', phone], ['short phone', shortPhone], ['tablet', tablet], ['tablet portrait', tabletPortrait], ['phone at HUD 150 % (capped to 125 % with touch)', { ...phone, hudScale: touchHudScale(1.5, phone.h) }], ['tablet at HUD 150 %', { ...tablet, hudScale: touchHudScale(1.5, tablet.h) }]] as Array<[string, Viewport]>) {
    for (const size of ['small', 'medium', 'large'] as const) {
      for (const lefty of [false, true]) {
        it(`${name} · ${size}${lefty ? ' · left-handed' : ''}: default layout is legal (safe area, no overlaps, off the HUD)`, () => {
          const hud = hudRects(vp, lefty);
          const L = bestDefaultLayout(vp, size, lefty, hud);
          expect(layoutProblems(L, vp, hud)).toEqual([]);
          // it only steps down a size when it has to: Medium always fits as asked
          if (size !== 'large') expect(L.drift.d).toBe(defaultLayout(vp, size, lefty).drift.d);
        });
      }
    }
  }
  it('every touch target is at least 48 px, even at Small', () => {
    const d = diameters(phone, 'small');
    for (const id of CONTROL_IDS) expect(targetSize(d[id])).toBeGreaterThanOrEqual(MIN_TARGET);
  });
  it('left-handed swaps the stick and the buttons', () => {
    const r = defaultLayout(phone, 'medium', false);
    const l = defaultLayout(phone, 'medium', true);
    expect(r.stick.x).toBeLessThan(phone.w / 2);
    expect(l.stick.x).toBeGreaterThan(phone.w / 2);
    expect(l.drift.x).toBeLessThan(phone.w / 2);
    expect(stickZone(phone, true).x).toBeGreaterThan(0);
  });
  it('the solver pushes a control out of the HUD, off the screen edge and off another control', () => {
    const vp = tablet;
    const hud = hudRects(vp);
    const L: Layout = defaultLayout(vp, 'medium', false);
    const bad: Layout = { ...L, item: { ...L.item, x: L.drift.x, y: L.drift.y }, brake: { ...L.brake, x: -50, y: vp.h + 50 }, look: { ...L.look, x: hud[1].x + 10, y: hud[1].y + 10 } };
    expect(layoutProblems(bad, vp, hud).length).toBeGreaterThan(0);
    const fixed = solveLayout(bad, vp, hud, ['item']);
    expect(layoutProblems(fixed.layout, vp, hud)).toEqual([]);
    // the pinned control (the one being dragged) stays where the finger put it
    expect(fixed.layout.item.x).toBeCloseTo(L.drift.x, 0);
  });
});

describe('touch settings', () => {
  it('repairs broken values and keeps good ones', () => {
    expect(sanitizeTouchConfig(undefined)).toEqual(DEFAULT_TOUCH_CONFIG);
    expect(sanitizeTouchConfig({ size: 'huge', opacity: 9, leftHanded: 'yes' })).toEqual({ ...DEFAULT_TOUCH_CONFIG, opacity: 1 });
    expect(sanitizeTouchConfig({ stick: 'fixed', size: 'large', opacity: 0.6, leftHanded: true, highContrast: true })).toEqual({ stick: 'fixed', size: 'large', opacity: 0.6, leftHanded: true, highContrast: true });
  });
});
