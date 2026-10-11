import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/data/tracks/index';
import { staffGhost } from '../../src/game/modes/timeTrial';
import { staffReferences } from '../../src/sim/timeTrialRun';

describe('staff ghosts', () => {
  it.each(TRACKS.map((t) => t.id))('%s: Pro AI > staff ghost > strong bot', (id) => {
    const ref = staffReferences(id);
    const staff = staffGhost(id).time;
    expect(ref.strong).toBeLessThan(ref.proBest);
    expect(staff).toBeGreaterThan(ref.strong);
    expect(staff).toBeLessThan(ref.proBest);
  });
});
