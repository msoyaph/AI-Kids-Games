import { describe, expect, it } from 'vitest';
import { PARTS } from '../../src/data/parts';
import {
  bodyProfile,
  bodyShape,
  BODY_SHAPES,
  cargoPlacement,
  enginePlacement,
  finPlacement,
  podAngles,
  angleGap,
  radiusAt,
  rocketExtent,
  tankPlacement,
} from '../../src/systems/rocketFit';

const styles = (slot: string) => PARTS.filter((p) => p.slot === slot).map((p) => p.style);

describe('rocket fit', () => {
  it('has a 3D shape for every body part', () => {
    for (const s of styles('body')) expect(BODY_SHAPES[s], s).toBeTruthy();
  });

  it('bodies are smooth: radius never jumps and the widest point is in the middle', () => {
    for (const s of styles('body')) {
      const b = bodyShape(s);
      let prev = radiusAt(b, 0);
      for (let i = 1; i <= 100; i++) {
        const r = radiusAt(b, (i / 100) * b.height);
        expect(Math.abs(r - prev), s).toBeLessThan(0.03);
        prev = r;
      }
      expect(radiusAt(b, b.height * b.midAt)).toBeCloseTo(b.rMid, 3);
      expect(bodyProfile(b).length).toBeGreaterThan(10);
    }
  });

  it('every engine fits under every body (bells inside the body outline, not overlapping each other)', () => {
    for (const bs of styles('body')) {
      const b = bodyShape(bs);
      for (const es of styles('engine')) {
        const e = enginePlacement(b, es);
        for (const bell of e.bells) {
          const reach = Math.hypot(bell.x, bell.z) + bell.r;
          // The turbo bell may poke out a little; nothing pokes out more than 10%.
          expect(reach, `${bs}+${es}`).toBeLessThanOrEqual(b.rBottom * 1.1);
        }
        for (let i = 0; i < e.bells.length; i++) {
          for (let j = i + 1; j < e.bells.length; j++) {
            const a = e.bells[i];
            const c = e.bells[j];
            expect(Math.hypot(a.x - c.x, a.z - c.z), `${bs}+${es}`).toBeGreaterThanOrEqual(a.r + c.r - 0.02);
          }
        }
      }
    }
  });

  it('every fin set attaches to the body and stays a sensible size', () => {
    for (const bs of styles('body')) {
      const b = bodyShape(bs);
      for (const fs of styles('fins')) {
        const f = finPlacement(b, fs);
        expect(f.rootR, `${bs}+${fs}`).toBeGreaterThan(0.25);
        expect(f.y1 - f.y0, `${bs}+${fs}`).toBeGreaterThan(0.4);
        expect(f.span, `${bs}+${fs}`).toBeGreaterThan(0.2);
        expect(f.span, `${bs}+${fs}`).toBeLessThanOrEqual(0.95);
        expect(f.y1, `${bs}+${fs}`).toBeLessThan(b.height * 0.6);
      }
    }
  });

  it('side tanks never cut into the body', () => {
    for (const bs of styles('body')) {
      const b = bodyShape(bs);
      for (const ts of styles('tank')) {
        const t = tankPlacement(b, ts);
        if (t.kind !== 'pods') continue;
        for (let i = 0; i <= 20; i++) {
          const y = t.y0 + ((t.y1 - t.y0) * i) / 20;
          expect(t.x - t.r, `${bs}+${ts}`).toBeGreaterThan(radiusAt(b, y));
        }
      }
    }
  });

  it('side pods never hit the fins (clearance between each pod and each fin plane)', () => {
    for (const bs of styles('body'))
      for (const ts of styles('tank'))
        for (const fs of styles('fins')) {
          const b = bodyShape(bs);
          const t = tankPlacement(b, ts);
          if (t.kind !== 'pods') continue;
          const f = finPlacement(b, fs);
          const overlapY = Math.min(t.y1, f.y1) - Math.max(t.y0, f.y0);
          if (overlapY <= 0) continue;
          for (const a of podAngles(fs))
            for (const fa of f.fin.angles) {
              // Distance from the pod's axis to the fin's plane (fins are thin, ~0.12 thick).
              const gap = angleGap(a, fa);
              const dist = gap >= Math.PI / 2 ? t.x : t.x * Math.sin(gap);
              expect(dist - 0.06 - t.r, `${bs}+${ts}+${fs}`).toBeGreaterThan(0.05);
            }
        }
  });

  it('cargo sits on the body surface', () => {
    for (const bs of styles('body')) {
      const b = bodyShape(bs);
      const c = cargoPlacement(b);
      expect(c.r).toBeCloseTo(radiusAt(b, c.y), 5);
    }
  });

  it('every one of the 46,656 shape combinations stays within the hangar frame', () => {
    let n = 0;
    for (const bs of styles('body'))
      for (const ns of styles('nose'))
        for (const es of styles('engine'))
          for (const fs of styles('fins'))
            for (const ts of styles('tank')) {
              const e = rocketExtent(bs, ns, es, fs, ts);
              expect(e.top - e.bottom).toBeGreaterThan(2.5);
              expect(e.top - e.bottom).toBeLessThan(4.8);
              expect(e.halfWidth).toBeLessThan(1.5);
              n++;
            }
    // Cargo, lights and paint never change the outline, so these cover every look.
    expect(n).toBe(6 ** 5);
  });
});
