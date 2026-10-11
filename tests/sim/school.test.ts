import { describe, expect, it } from 'vitest';
import { LESSONS, medalFor } from '../../src/data/school';
import { runLesson } from '../../src/sim/schoolRun';
import { expertStyle } from '../../src/sim/timeTrialRun';
import { findTrack } from '../../src/data/tracks/index';

describe('Driving School', () => {
  it('has 6 lessons on the 2 practice courses', () => {
    expect(LESSONS.length).toBe(6);
    for (const l of LESSONS) expect(findTrack(l.track).id).toBe(l.track);
  });

  it('medal thresholds are ordered', () => {
    for (const l of LESSONS) {
      const m = l.medals;
      if (l.scoring === 'time') expect(m.gold < m.silver && m.silver < m.bronze, l.id).toBe(true);
      else expect(m.gold > m.silver && m.silver > m.bronze, l.id).toBe(true);
      expect(medalFor(l, l.scoring === 'time' ? m.gold : m.gold)).toBe('gold');
    }
  });

  it.each(LESSONS.map((l) => l.id))('%s: every lesson ends, a skilled driver earns a medal, gold is reachable', (id) => {
    const runs = [3, 7, 11].map((seed) => runLesson(id, 1, seed, { ...expertStyle(1), turboBurst: true }));
    for (const r of runs) expect(r.sim.done).toBe(true);
    expect(runs.some((r) => r.medal !== null)).toBe(true);
    // gold must be physically possible: for points lessons the max available reaches the gold mark
    const l = LESSONS.find((x) => x.id === id)!;
    if (id === 'items') expect(runs[0].sim.targets.length + runs[0].sim.goo.length).toBeGreaterThanOrEqual(l.medals.gold);
    if (id === 'gliders') expect(runs[0].sim.rings.length).toBeGreaterThanOrEqual(l.medals.gold);
    if (id === 'steering') expect(runs[0].sim.gates.length).toBe(10);
  });

  it('the shortcut lesson rewards taking the shortcut', () => {
    const withSc = runLesson('shortcuts', 1, 3, { ...expertStyle(1), turboBurst: true });
    const without = runLesson('shortcuts', 1, 3, { ...expertStyle(1), turboBurst: true, shortcutChance: 0 });
    expect(withSc.score).toBeLessThan(without.score);
    expect(['silver', 'gold']).toContain(withSc.medal);
    expect(['bronze', null]).toContain(without.medal);
  });
});
