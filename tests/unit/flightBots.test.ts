import { describe, expect, it } from 'vitest';
import { COURSES, medalFor } from '../../src/data/races';
import { SYSTEMS } from '../../src/data/bodies';
import { tuning } from '../../src/systems/difficulty';
import { ACE, botRace, botTrip, CAREFUL_KID } from '../../src/systems/flightBot';

describe('3D flight bots: every trip can be flown', () => {
  const ordered = SYSTEMS.filter((s) => s.id !== 'wormhole' && s.id !== 'zephyra').sort((a, b) => a.order - b.order);
  for (const diff of ['easy', 'normal'] as const) {
    it(`${diff}: a careful kid reaches the next planet on the starter rocket without running out of fuel`, () => {
      const times: number[] = [];
      for (let i = 0; i < ordered.length - 1; i++) {
        const r = botTrip(ordered[i].id, ordered[i + 1].id, diff, CAREFUL_KID, undefined, `trip${i}`);
        expect(r.arrived, `${ordered[i].id}->${ordered[i + 1].id}`).toBe(true);
        expect(r.minFuelFrac, `${ordered[i].id}->${ordered[i + 1].id}`).toBeGreaterThan(0.05);
        times.push(r.seconds);
      }
      // Trips are short and snappy: well under a minute and a half.
      for (const t of times) expect(t).toBeLessThan(90);
      console.log(`[${diff}] trip seconds:`, times.map((t) => t.toFixed(1)).join(', '));
    });
  }
});

describe('3D ring races', () => {
  for (const c of COURSES.filter((x) => !x.practice)) {
    it(`${c.name}: gold is reachable for an ace, and a careful kid finishes on Easy with a medal`, () => {
      const ace = botRace(c.id, c.system as never, 'normal', ACE);
      expect(ace, c.id).not.toBeNull();
      expect(medalFor(c, ace!, 1), `${c.id} ace ${ace}`).toBe('gold');
      const kid = botRace(c.id, c.system as never, 'easy', { skill: 0.7, boosts: false, wobble: 0.2 });
      expect(kid, c.id).not.toBeNull();
      expect(medalFor(c, kid!, tuning('easy').raceTimeMult), `${c.id} kid ${kid}`).not.toBe('none');
      // Careful flying (no boosts) on Normal earns a medal too.
      const careful = botRace(c.id, c.system as never, 'normal', { skill: 0.75, boosts: false, wobble: 0.25 });
      expect(medalFor(c, careful!, 1), `${c.id} careful ${careful}`).not.toBe('none');
      console.log(`${c.id}: ace ${ace!.toFixed(1)}s (gold ${c.medals.gold}), easy kid ${kid!.toFixed(1)}s (bronze ${(c.medals.bronze * tuning('easy').raceTimeMult).toFixed(0)})`);
    });
  }
  it('the training rings can be flown', () => {
    expect(botRace('training', 'earth', 'easy', CAREFUL_KID)).not.toBeNull();
  });
});
