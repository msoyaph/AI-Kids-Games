import { describe, expect, it } from 'vitest';
import { SONGS, findSong } from '../../src/data/songs';
import { buildScore } from '../../src/audio/music';
import { TRACKS } from '../../src/data/tracks/index';
import { ARENAS } from '../../src/data/arenas';

describe('procedural music', () => {
  it('every song builds a full 8-bar score with melody, bass and drums', () => {
    for (const s of SONGS) {
      const score = buildScore(s);
      const count = (arr: unknown[][]): number => arr.reduce((a, b) => a + b.length, 0);
      expect(score.steps, s.id).toBe(s.chords.length * 16);
      expect(count(score.lead), s.id).toBeGreaterThan(12);
      expect(count(score.bass), s.id).toBeGreaterThan(4);
      if (s.drums !== 'none') expect(count(score.drums), s.id).toBeGreaterThan(16);
      for (const step of score.lead) for (const e of step) {
        expect(e.midi).toBeGreaterThan(40);
        expect(e.midi).toBeLessThan(100);
      }
    }
  });

  it('is deterministic', () => {
    const a = JSON.stringify(buildScore(SONGS[3]));
    const b = JSON.stringify(buildScore(SONGS[3]));
    expect(a).toBe(b);
  });

  it('every track and arena has its own song', () => {
    for (const t of TRACKS) expect(findSong(t.music).id, t.id).toBe(t.music);
    for (const a of ARENAS) expect(findSong(a.music).id, a.id).toBe(a.music);
  });
});
