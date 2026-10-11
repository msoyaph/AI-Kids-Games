import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/config/enemies';
import {
  cloneTuning,
  diffTuning,
  mergeTuning,
  TUNING_DEFAULTS,
  TUNING_RANGES,
  xpToNextWith,
  type Range,
  type TuningGroup,
  type TuningIssue,
} from '../../src/config/tuning';
import { walkSpeed } from '../../src/sim/player';
import { simulateRun } from '../../src/sim/headless';
import { createWorld } from '../../src/sim/world';
import { currentBlock, renderDefaults, replaceBlock, TUNING_FILE } from '../../scripts/lib/tuningFile';

describe('tuning file', () => {
  it('every value has a range, every range has a value, and defaults sit inside their ranges', () => {
    for (const g of Object.keys(TUNING_RANGES) as TuningGroup[]) {
      const ranges = TUNING_RANGES[g] as Record<string, Range>;
      const vals = TUNING_DEFAULTS[g] as unknown as Record<string, unknown>;
      expect(Object.keys(vals).sort()).toEqual(Object.keys(ranges).sort());
      for (const [k, [min, max, step]] of Object.entries(ranges)) {
        expect(step).toBeGreaterThan(0);
        if (g === 'enemies' && k === 'perType') {
          for (const v of Object.values(vals[k] as Record<string, number>)) expect(v >= min && v <= max).toBe(true);
        } else {
          const v = vals[k] as number;
          expect(v, `${g}.${k}`).toBeGreaterThanOrEqual(min);
          expect(v, `${g}.${k}`).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('has a speed multiplier for every enemy type', () => {
    expect(Object.keys(TUNING_DEFAULTS.enemies.perType).sort()).toEqual(ENEMIES.map((e) => e.id).sort());
  });

  it('the generated block in tuning.ts matches the defaults (apply-tuning round-trips)', () => {
    const src = readFileSync(TUNING_FILE, 'utf8');
    expect(currentBlock(src)).toBe(renderDefaults(TUNING_DEFAULTS));
    // writing a change then reading it back yields exactly that change
    const changed = mergeTuning(TUNING_DEFAULTS, { movement: { slideFriction: 1.7 }, enemies: { perType: { ramhorn: 0.9 } } });
    const out = replaceBlock(src, changed);
    expect(out).toContain('slideFriction: 1.7,');
    expect(out).toContain('ramhorn: 0.9,');
    expect(currentBlock(out)).toBe(renderDefaults(changed));
    // everything outside the block is untouched
    expect(out.slice(0, out.indexOf('// @tuning-values-begin'))).toBe(src.slice(0, src.indexOf('// @tuning-values-begin')));
  });
});

describe('mergeTuning / diffTuning', () => {
  it('applies valid overrides and reports bad ones without throwing', () => {
    const issues: TuningIssue[] = [];
    const t = mergeTuning(TUNING_DEFAULTS, { movement: { jumpSpeed: 11, nope: 1, gravity: 9999 }, wat: {}, enemies: { perType: { gnatlet: 1.5, ghost: 2 } }, xp: { first: 'x' } }, issues);
    expect(t.movement.jumpSpeed).toBe(11);
    expect(t.movement.gravity).toBe(TUNING_DEFAULTS.movement.gravity);
    expect(t.enemies.perType.gnatlet).toBe(1.5);
    expect(issues.map((i) => i.path).sort()).toEqual(['enemies.perType.ghost', 'movement.gravity', 'movement.nope', 'wat', 'xp.first'].sort());
  });

  it('diff only contains changed values and merges back to the same tuning', () => {
    const t = cloneTuning();
    t.camera.distance = 13;
    t.enemies.perType.spitcap = 0.8;
    const d = diffTuning(TUNING_DEFAULTS, t);
    expect(d).toEqual({ camera: { distance: 13 }, enemies: { perType: { spitcap: 0.8 } } });
    expect(mergeTuning(TUNING_DEFAULTS, d)).toEqual(t);
    expect(diffTuning(TUNING_DEFAULTS, cloneTuning())).toEqual({});
  });

  it('never mutates the shipped defaults', () => {
    const before = JSON.stringify(TUNING_DEFAULTS);
    const t = mergeTuning(TUNING_DEFAULTS, { movement: { walkSpeed: 9 } });
    t.combat.levelHeal = 0.4;
    expect(JSON.stringify(TUNING_DEFAULTS)).toBe(before);
  });
});

describe('per-run tuning', () => {
  it('each world gets its own copy, so editing one run never leaks into another', () => {
    const a = createWorld({ seed: 1, characterId: 'thea', tuning: { movement: { walkSpeed: 10 } } });
    const b = createWorld({ seed: 1, characterId: 'thea' });
    expect(walkSpeed(a)).toBeGreaterThan(walkSpeed(b));
    a.tuning.movement.walkSpeed = 4;
    expect(b.tuning.movement.walkSpeed).toBe(TUNING_DEFAULTS.movement.walkSpeed);
    expect(a.player.xpNext).toBe(xpToNextWith(1, a.tuning.xp));
  });

  it('overrides change headless outcomes (simulate --tuning uses this path)', () => {
    const base = simulateRun({ characterId: 'thea', seed: 5, maxSeconds: 60 });
    const tuned = simulateRun({ characterId: 'thea', seed: 5, maxSeconds: 60, tuning: { spawns: { rateMult: 2.5 } } });
    expect(tuned.kills).not.toBe(base.kills);
  });
});
