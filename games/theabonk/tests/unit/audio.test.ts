import { describe, expect, it } from 'vitest';
import { ceilingCurve } from '../../src/audio/Audio';
import { LIMIT_CEILING_DB, LOUDNESS_TARGET, MIX } from '../../src/audio/mix';
import { bossSong, runSong, SONGS } from '../../src/audio/Music';
import { SFX_NAMES } from '../../src/config/sfx';

describe('mix', () => {
  it('the limiter curve never passes the ceiling and leaves quiet audio untouched', () => {
    const c = ceilingCurve(LIMIT_CEILING_DB);
    const ceil = Math.pow(10, LIMIT_CEILING_DB / 20);
    for (const v of c) expect(Math.abs(v)).toBeLessThanOrEqual(ceil + 1e-6);
    // the middle of the curve (|x| < 0.5) is linear
    const n = c.length;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      if (Math.abs(x) < 0.5) expect(c[i]).toBeCloseTo(x, 5);
    }
  });

  it('every weapon / world sound has a mix entry with a valid category', () => {
    for (const n of SFX_NAMES) {
      expect(MIX[n], n).toBeDefined();
      expect(LOUDNESS_TARGET[MIX[n].cat]).toBeDefined();
      expect(MIX[n].gain).toBeGreaterThan(0);
    }
  });

  it('songs: three across the night per map, boss and final themes', () => {
    expect([runSong('meadow', 0.1), runSong('meadow', 0.5), runSong('meadow', 0.9)]).toEqual(['runA', 'runB', 'runC']);
    expect([runSong('rimewood', 0.1), runSong('rimewood', 0.5), runSong('rimewood', 0.9)]).toEqual(['rimeA', 'rimeB', 'rimeC']);
    expect(bossSong('meadow', true)).toBe('final');
    expect(bossSong('rimewood', true)).toBe('oldRime');
    expect(bossSong('rimewood', false)).toBe('rimeBoss');
    for (const s of Object.values(SONGS)) expect(s.chords.length).toBeGreaterThan(0);
  });
});
