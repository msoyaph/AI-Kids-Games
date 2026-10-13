import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fromRows } from '../../src/core/bits';
import { hash32, Rng } from '../../src/core/rng';
import data from '../../src/data/levels.json';
import fixture from '../fixtures/adventure-solutions.json';
import { findLines, newLines } from '../../src/sim/board';
import { casualChoice } from '../../src/sim/bot';
import { goalText, LEVELS_PER_WORLD, levelGame, levelOpen, starsFor, totalStars, worldDone, worldOpen, WORLDS, type Level } from '../../src/sim/adventure';
import { canMove, place } from '../../src/sim/game';
import { RULES_VERSION } from '../../src/save/run';

const levels = data.levels as Level[];
const FLOOR = [0.9, 0.75, 0.6, 0.45];

describe('Adventure levels', { timeout: 120_000 }, () => {
  it('are 60 levels, 15 in each of 4 worlds, with well-formed data', () => {
    expect(levels).toHaveLength(60);
    const lines = newLines();
    levels.forEach((l, i) => {
      expect(l.world).toBe(Math.floor(i / LEVELS_PER_WORLD));
      expect(l.n).toBe((i % LEVELS_PER_WORLD) + 1);
      expect(l.layout).toHaveLength(8);
      for (const row of l.layout) expect(row, l.id).toMatch(/^[.1-6gs]{8}$/);
      const [lo, hi] = fromRows(l.layout);
      expect(findLines(lo, hi, lines).count, `${l.id} starts with a full line`).toBe(0);
      const all = l.layout.join('');
      if (l.goal.kind === 'items') expect(all.split('g').length - 1, l.id).toBeGreaterThanOrEqual(l.goal.target);
      if (l.goal.kind === 'stones') expect(all.split('s').length - 1, l.id).toBeGreaterThanOrEqual(l.goal.target);
      expect(l.par3).toBeLessThanOrEqual(l.par2);
      expect(l.par2).toBeLessThanOrEqual(l.moves);
      // no timers in the first two worlds; an optional clock badge after that
      if (l.world < 2) expect(l.clock, l.id).toBeUndefined(); else expect(l.clock, l.id).toBeGreaterThan(0);
      expect(goalText(l)).toMatch(/^(Clear|Collect|Break|Score) \d+/);
    });
  });
  it('match the solutions they were proved with (rerun npm run levels after changing the rules)', () => {
    const hash = createHash('sha256').update(JSON.stringify(levels)).digest('hex');
    expect(fixture.dataHash, 'levels.json changed without npm run levels').toBe(hash);
    expect(fixture.rulesVersion).toBe(RULES_VERSION);
    expect(data.rulesVersion).toBe(RULES_VERSION);
  });
  it('can all be won with 3 stars: the stored solutions replay through the real rules', () => {
    for (const l of levels) {
      const solution = fixture.solutions.find(s => s.id === l.id)!;
      const g = levelGame(l);
      for (const [slot, pos] of solution.moves) expect(place(g, slot, pos), `${l.id}: move ${g.moves + 1} is illegal`).not.toBeNull();
      expect(g.end, l.id).toBe('goal');
      expect(starsFor(l, g), l.id).toBe(3);
    }
  });
  it('are kind to young players: a casual player gets 1 star often enough in every world', () => {
    for (let w = 0; w < 4; w++) {
      let won = 0, tries = 0;
      for (const l of levels.filter(x => x.world === w)) for (let t = 0; t < 20; t++, tries++) {
        const g = levelGame(l), rng = new Rng(hash32(l.seed, 1000 + t));
        while (!g.over && canMove(g)) { const c = casualChoice(g, rng); if (!c) break; place(g, c.slot, c.pos); }
        if (starsFor(l, g) > 0) won++;
      }
      expect(won / tries, `world ${w + 1}`).toBeGreaterThanOrEqual(FLOOR[w]! - 0.05);
    }
  });
  it('give stars for the goal, and more for fewer moves', () => {
    const l = levels[0]!;
    expect(starsFor(l, { end: 'goal', moves: l.par3 })).toBe(3);
    expect(starsFor(l, { end: 'goal', moves: l.par3 + 1 })).toBe(2);
    expect(starsFor(l, { end: 'goal', moves: l.par2 + 1 })).toBe(1);
    expect(starsFor(l, { end: 'moves', moves: l.moves })).toBe(0);
    expect(starsFor(l, { end: 'stuck', moves: 3 })).toBe(0);
  });
  it('open worlds with stars and levels one after another', () => {
    const none = '0'.repeat(60);
    expect(levelOpen(none, 0)).toBe(true);
    expect(levelOpen(none, 1)).toBe(false);
    expect(levelOpen('1' + '0'.repeat(59), 1)).toBe(true);
    expect(worldOpen(none, 1)).toBe(false);
    const twenty = '3'.repeat(6) + '2'.repeat(1) + '0'.repeat(53); // 20 stars
    expect(totalStars(twenty)).toBe(20);
    expect(worldOpen(twenty, 1)).toBe(true); expect(levelOpen(twenty, 15)).toBe(true); expect(levelOpen(twenty, 16)).toBe(false);
    expect(worldOpen(twenty, 2)).toBe(false);
    expect(WORLDS.map(w => w.needs)).toEqual([0, 20, 55, 95]);
    expect(worldDone('1'.repeat(15) + '0'.repeat(45), 0)).toBe(true);
    expect(worldDone('1'.repeat(14) + '0'.repeat(46), 0)).toBe(false);
  });
});
