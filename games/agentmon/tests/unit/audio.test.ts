import { describe, expect, it } from 'vitest';
import { compose, SONG_FOR, TRACKS } from '../../src/audio/music';
import { MAPS } from '../../src/data/maps/index';

describe('music', () => {
  it('has about twenty original tracks, each from a two-bar motif', () => {
    expect(Object.keys(TRACKS).length).toBeGreaterThanOrEqual(20);
    for (const [id, t] of Object.entries(TRACKS)) {
      expect(t.motif.reduce((n, [, len]) => n + len, 0), `${id} motif is two bars of eighths`).toBe(16);
      expect(t.tempo >= 60 && t.tempo <= 160, `${id} tempo`).toBe(true);
    }
  });

  it('gives every place and scene a song that exists', () => {
    for (const m of Object.values(MAPS)) expect(SONG_FOR[m.music] ?? TRACKS[m.music], `${m.id} plays ${m.music}`).toBeDefined();
    for (const [id, s] of Object.entries(SONG_FOR)) expect(TRACKS[s.track], id).toBeDefined();
  });

  it('composes loops that stay in a comfortable range', () => {
    for (const id of Object.keys(SONG_FOR)) {
      const c = compose(id);
      for (const n of [...c.lead, ...c.bass, ...c.pad]) {
        expect(n.n >= 30 && n.n <= 100, `${id} note ${n.n}`).toBe(true);
        expect(n.step >= 0 && n.step < c.steps, `${id} step ${n.step}`).toBe(true);
      }
      expect(c.lead.length).toBeGreaterThan(12);
    }
  });
});
