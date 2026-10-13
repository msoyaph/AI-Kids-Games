import { describe, expect, it } from 'vitest';
import { gainXp, grow, growthTarget, learnMove, levelForXp, makeCreature, maxEnergy, movesAtLevel, statsFor, xpForLevel } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import { TUNING } from '../../src/tuning';
import { dex, species } from './fixtures';

describe('stats and levels', () => {
  it('grows every stat with level', () => {
    const s = species['fx-flare']!;
    let prev = statsFor(s, 1, 'cheerful');
    for (let level = 2; level <= 50; level++) {
      const now = statsFor(s, level, 'cheerful');
      for (const k of ['energy', 'power', 'guard', 'speed'] as const) expect(now[k]).toBeGreaterThanOrEqual(prev[k]);
      prev = now;
    }
    expect(prev.energy).toBeGreaterThan(statsFor(s, 1, 'cheerful').energy * 5);
  });

  it('personalities lift one stat a little and never lower any', () => {
    const s = species['fx-flare']!;
    const plain = statsFor(s, 30, 'curious'); // lifts speed
    const brave = statsFor(s, 30, 'brave'); // lifts power
    expect(brave.power).toBeGreaterThan(plain.power);
    expect(brave.speed).toBeLessThan(plain.speed);
    expect(brave.guard).toBe(plain.guard);
    expect(brave.power / plain.power).toBeLessThanOrEqual(1 + TUNING.stats.personalityLift + 0.02);
  });

  it('experience needed rises every level, and levelForXp undoes xpForLevel', () => {
    for (let level = 2; level <= 50; level++) {
      expect(xpForLevel(level)).toBeGreaterThan(xpForLevel(level - 1));
      expect(levelForXp(xpForLevel(level))).toBe(level);
      expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
    expect(levelForXp(10 ** 9)).toBe(TUNING.stats.maxLevel);
  });
});

describe('making creatures', () => {
  it('is deterministic for a seed and starts with full energy and its moves', () => {
    const a = makeCreature(dex, { species: 'fx-flare', level: 10 }, new Rng(5));
    const b = makeCreature(dex, { species: 'fx-flare', level: 10 }, new Rng(5));
    expect(a).toEqual(b);
    expect(a.energy).toBe(maxEnergy(dex, a));
    expect(a.moves).toEqual(['bump', 'flare-hit', 'pump', 'toast']);
    expect(a.xp).toBe(xpForLevel(10));
  });

  it('knows at most the last four moves it would have learned', () => {
    expect(movesAtLevel(species['fx-flare']!, 30)).toEqual(['pump', 'toast', 'shield', 'big-flare']);
  });
});

describe('experience and growing', () => {
  it('levels up, raises energy with max energy, and fills empty move slots', () => {
    const c = makeCreature(dex, { species: 'fx-tide', level: 3 }, new Rng(1));
    expect(c.moves).toEqual(['bump', 'tide-hit']);
    const before = maxEnergy(dex, c);
    const r = gainXp(dex, c, xpForLevel(10) - c.xp);
    expect(r).toMatchObject({ from: 3, to: 10, newMoves: [] });
    expect(c.moves).toEqual(['bump', 'tide-hit', 'soak', 'snack-time']);
    expect(c.energy).toBe(maxEnergy(dex, c));
    expect(maxEnergy(dex, c)).toBeGreaterThan(before);
  });

  it('asks before swapping a move when four are known', () => {
    const c = makeCreature(dex, { species: 'fx-flare', level: 12 }, new Rng(2));
    expect(c.moves).toHaveLength(4);
    const r = gainXp(dex, c, xpForLevel(16) - c.xp);
    expect(r.newMoves).toEqual(['big-flare']);
    expect(c.moves).not.toContain('big-flare');
    learnMove(c, 'big-flare', 0);
    expect(c.moves[0]).toBe('big-flare');
  });

  it('can grow at the growth level, keeps its friend details, and can wait a level', () => {
    const c = makeCreature(dex, { species: 'fx-flare', level: 15, nick: 7 }, new Rng(3));
    c.friendship = 40;
    expect(growthTarget(dex, c)).toBeUndefined();
    const r = gainXp(dex, c, xpForLevel(16) - c.xp);
    expect(r.canGrow).toBe('fx-flare2');
    c.holdGrowth = true; // "Not yet"
    expect(growthTarget(dex, c)).toBeUndefined();
    gainXp(dex, c, xpForLevel(17) - c.xp);
    expect(growthTarget(dex, c)).toBe('fx-flare2');
    const moves = [...c.moves];
    grow(dex, c);
    expect(c.species).toBe('fx-flare2');
    expect(c.nick).toBe(7);
    expect(c.friendship).toBe(40);
    expect(c.level).toBe(17);
    expect(c.moves.slice(0, moves.length)).toEqual(moves);
    expect(c.energy).toBe(maxEnergy(dex, c));
  });

  it('never goes past the top level', () => {
    const c = makeCreature(dex, { species: 'fx-tide', level: 49 }, new Rng(4));
    gainXp(dex, c, 10 ** 9);
    expect(c.level).toBe(TUNING.stats.maxLevel);
    expect(c.xp).toBe(xpForLevel(TUNING.stats.maxLevel));
  });
});
