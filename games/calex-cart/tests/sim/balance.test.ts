import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/data/tracks/index';
import { RACERS } from '../../src/data/racers';
import { runHeadlessRace } from '../../src/sim/headless';
import type { SpeedClass } from '../../src/data/types';

const entries = (list = RACERS.slice(0, 8)) => list.map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));

describe('every track is completable by the AI', () => {
  for (const t of TRACKS) {
    it(`${t.name}: rookie / pro / champion / mirror`, () => {
      const classes: Array<[SpeedClass, boolean]> = [
        ['rookie', false],
        ['pro', false],
        ['champion', false],
        ['champion', true],
      ];
      const winners: number[] = [];
      for (const [c, mirror] of classes) {
        const r = runHeadlessRace({ trackId: t.id, speedClass: c, mirror, entries: entries(), seed: 5, items: true });
        const finished = r.projected.filter((p) => !p).length;
        expect(finished, `${c}${mirror ? ' mirror' : ''}`).toBeGreaterThanOrEqual(7);
        winners.push(r.winnerTime);
      }
      // speed classes feel different: rookie slower than pro slower than champion
      expect(winners[0]).toBeGreaterThan(winners[1]);
      expect(winners[1]).toBeGreaterThan(winners[2]);
    });
  }
});

describe('no weight class dominates', () => {
  it('identical AI drivers finish evenly across light / medium / heavy', () => {
    const byClass: Record<string, number[]> = { light: [], medium: [], heavy: [] };
    const group = [RACERS[1], RACERS[3], RACERS[0], RACERS[2], RACERS[8], RACERS[11]]; // 2 light, 2 medium, 2 heavy
    let seed = 1;
    for (const t of TRACKS.slice(0, 6)) {
      for (let rot = 0; rot < 3; rot++) {
        const grid = group.map((_, i) => (i + rot * 2) % group.length);
        const r = runHeadlessRace({ trackId: t.id, speedClass: 'pro', entries: entries(group), seed: seed++, items: true, personality: 'balanced', equalSkill: true, gridOrder: grid });
        group.forEach((g, i) => byClass[g.weight].push((r.ranks[i] - 1) / (group.length - 1)));
      }
    }
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    for (const w of ['light', 'medium', 'heavy']) {
      expect(avg(byClass[w]), w).toBeGreaterThan(0.3);
      expect(avg(byClass[w]), w).toBeLessThan(0.7);
    }
  });

  it('racers added after launch (Yuki…) are neither dominant nor hopeless, on old and Frost tracks', () => {
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    for (let n = 12; n < RACERS.length; n++) {
      const group = [RACERS[n], RACERS[2], RACERS[5], RACERS[7], RACERS[8], RACERS[11]];
      const pos: number[] = [];
      let seed = 500;
      for (const t of [...TRACKS.slice(0, 3), ...TRACKS.slice(-3)]) {
        for (let rot = 0; rot < 2; rot++) {
          const grid = group.map((_, i) => (i + rot * 3) % group.length);
          const r = runHeadlessRace({ trackId: t.id, speedClass: 'pro', entries: entries(group), seed: seed++, items: false, personality: 'balanced', equalSkill: true, gridOrder: grid });
          pos.push((r.ranks[0] - 1) / (group.length - 1));
        }
      }
      expect(avg(pos), RACERS[n].name).toBeGreaterThan(0.25);
      expect(avg(pos), RACERS[n].name).toBeLessThan(0.75);
    }
  });
});
