import { describe, expect, it } from 'vitest';
import { compose, exploreTrack, TRACKS } from '../../src/audio/music';
import { THEMES } from '../../src/data/themes';

describe('procedural music', () => {
  for (const [name, def] of Object.entries(TRACKS)) {
    it(`${name}: composes a deterministic, in-range 8-bar loop`, () => {
      const a = compose(def);
      const b = compose(def);
      expect(a).toEqual(b);
      const steps = def.chords.length * 16;
      expect(a.length).toBeGreaterThan(30);
      for (const e of a) {
        expect(e.step).toBeGreaterThanOrEqual(0);
        expect(e.step).toBeLessThan(steps);
        expect(e.len).toBeGreaterThan(0);
        if (e.kind === 'lead' || e.kind === 'bell') {
          expect(e.midi).toBeGreaterThan(48);
          expect(e.midi).toBeLessThan(110);
        }
      }
      // The melody ends the loop on the key's root so it repeats smoothly.
      const leads = a.filter((e) => e.kind === 'lead');
      expect(leads[leads.length - 1].midi % 12).toBe(def.root % 12);
    });
  }

  it('every exploration theme has a track', () => {
    for (const id of Object.keys(THEMES)) expect(TRACKS[exploreTrack(id)], id).toBeTruthy();
  });
});
