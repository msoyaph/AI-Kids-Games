import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { ALL_MAPS } from '../../src/data/maps';
import { musicIntensity } from '../../src/audio/intensity';
import { MIX } from '../../src/audio/mix';
import { composeMelody, layerTargets, THEME_TRACK, TRACKS } from '../../src/audio/music';
import { SFX, STINGERS } from '../../src/audio/sfx';
import { softClip } from '../../src/audio/synth';

const base = { wave: 1, totalWaves: 40, enemies: 0, lives: 20, maxLives: 20, bossAlive: false };

describe('adaptive music', () => {
  it('starts calm and builds with progress and crowd size', () => {
    const calm = musicIntensity(base);
    expect(layerTargets(TRACKS.reach!, calm)).toEqual({ action: 0, intense: 0 });
    const mid = musicIntensity({ ...base, wave: 20, enemies: 20 });
    expect(mid).toBeGreaterThan(calm);
    expect(layerTargets(TRACKS.reach!, mid).action).toBeGreaterThan(0.5);
    const crowded = musicIntensity({ ...base, wave: 30, enemies: 60 });
    expect(layerTargets(TRACKS.reach!, crowded).intense).toBeGreaterThan(0.5);
  });

  it('final wave, bosses and danger push it up', () => {
    expect(musicIntensity({ ...base, wave: 40, enemies: 3 })).toBeGreaterThanOrEqual(0.85);
    expect(musicIntensity({ ...base, wave: 5, bossAlive: true })).toBeGreaterThan(musicIntensity({ ...base, wave: 5 }));
    expect(musicIntensity({ ...base, wave: 5, lives: 3 })).toBeGreaterThan(musicIntensity({ ...base, wave: 5 }));
    // endless never "finishes"
    expect(musicIntensity({ ...base, totalWaves: Infinity, wave: 400, enemies: 0 })).toBeLessThan(0.85);
  });

  it('boss themes always play every layer', () => {
    for (const id of Object.keys(TRACKS).filter((k) => k.startsWith('boss.'))) expect(layerTargets(TRACKS[id]!, 0)).toEqual({ action: 1, intense: 1 });
  });

  it('every world has a track and every boss has a theme', () => {
    for (const m of ALL_MAPS) expect(TRACKS[THEME_TRACK[m.theme]!], m.theme).toBeDefined();
    for (const e of Object.values(ENEMIES).filter((e) => e.boss)) expect(TRACKS[`boss.${e.id}`], e.id).toBeDefined();
  });

  it('melodies are deterministic, 4 bars, and differ between tracks', () => {
    const a = composeMelody(TRACKS.reach!);
    expect(composeMelody(TRACKS.reach!)).toEqual(a);
    expect(a.every((n) => n.step >= 0 && n.step < 64 && n.len >= 1)).toBe(true);
    expect(composeMelody(TRACKS.rift!)).not.toEqual(a);
  });
});

describe('mix', () => {
  it('only names real sounds, with sane gains', () => {
    for (const k of Object.keys(MIX.tracks)) expect(TRACKS[k], k).toBeDefined();
    for (const k of Object.keys(MIX.sfx)) expect(k in SFX, k).toBe(true);
    for (const k of Object.keys(MIX.stingers)) expect(k in STINGERS, k).toBe(true);
    for (const g of [...Object.values(MIX.tracks), ...Object.values(MIX.sfx), ...Object.values(MIX.stingers)]) {
      expect(g).toBeGreaterThanOrEqual(0.15);
      expect(g).toBeLessThanOrEqual(3);
    }
  });

  it('the master ceiling is transparent when quiet and never reaches full scale', () => {
    for (const x of [0, 0.1, -0.5, 0.85]) expect(softClip(x)).toBeCloseTo(x, 6);
    for (const x of [0.9, 1, 1.5, 2, 10, -3]) expect(Math.abs(softClip(x))).toBeLessThan(0.981);
    // monotonic: louder in → louder (or equal) out
    let prev = -1;
    for (let x = 0; x <= 2; x += 0.01) {
      const y = softClip(x);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});
