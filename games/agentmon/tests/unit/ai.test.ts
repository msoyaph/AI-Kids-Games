import { describe, expect, it } from 'vitest';
import { chooseAction, scoreOptions, suggestMove } from '../../src/core/battle/ai';
import { active, isAllowed, resolveTurn, startBattle, type Battle } from '../../src/core/battle/engine';
import { makeCreature, maxEnergy } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import type { Creature, Difficulty } from '../../src/core/types';
import { dex } from './fixtures';

const mk = (species: string, level: number, moves: string[]): Creature => {
  const c = makeCreature(dex, { species, level, personality: 'curious' }, new Rng(level));
  c.moves = moves;
  return c;
};
const battle = (player: Creature[], foe: Creature[], kind: 'wild' | 'trainer' = 'trainer'): Battle =>
  startBattle(dex, { kind, player, foe, difficulty: 'normal', seed: 3 });

describe('the AI picks sensible moves', () => {
  it('prefers a strong-against move over a neutral one (Normal and Hard)', () => {
    for (const level of ['normal', 'hard'] as Difficulty[]) {
      const b = battle([mk('fx-flare', 20, ['bump'])], [mk('fx-tide', 20, ['tide-hit', 'leaf-hit', 'bump'])]);
      const a = chooseAction(dex, b, 1, level, new Rng(1));
      expect(a, level).toEqual({ type: 'move', move: 'tide-hit' });
    }
  });

  it('finishes a tired foe with the cheap bump rather than spending big', () => {
    const b = battle([mk('fx-gust', 20, ['bump'])], [mk('fx-flare', 30, ['bump', 'big-flare'])]);
    active(b, 0).energy = 5;
    expect(chooseAction(dex, b, 1, 'normal', new Rng(2))).toEqual({ type: 'move', move: 'bump' });
  });

  it('rests when low and safe, and keeps bumping when resting would not help', () => {
    // The foe can't finish this sturdy friend, and isn't in danger: resting is the smart turn.
    const safe = battle([mk('fx-slow', 30, ['bump'])], [mk('fx-stone', 30, ['bump', 'stone-hit'])]);
    const me = active(safe, 1);
    me.energy = Math.floor(maxEnergy(dex, me) * 0.15);
    expect(chooseAction(dex, safe, 1, 'normal', new Rng(3))).toEqual({ type: 'rest' });

    const doomed = battle([mk('fx-tide', 40, ['tide-hit'])], [mk('fx-flare', 10, ['bump', 'flare-hit'])]);
    active(doomed, 1).energy = 3;
    expect(chooseAction(dex, doomed, 1, 'normal', new Rng(3)).type).toBe('move');
  });

  it('never picks something it is not allowed to do, at any level', () => {
    for (const level of ['easy', 'normal', 'hard'] as Difficulty[]) {
      for (let seed = 0; seed < 60; seed++) {
        const b = battle([mk('fx-tide', 20, ['tide-hit', 'bump']), mk('fx-leaf', 20, ['leaf-hit'])], [mk('fx-flare', 20, ['bump', 'big-flare', 'shield', 'pump']), mk('fx-stone', 20, ['stone-hit'])]);
        const foe = active(b, 1);
        foe.energy = 1 + (seed % maxEnergy(dex, foe));
        const a = chooseAction(dex, b, 1, level, new Rng(seed));
        expect(isAllowed(dex, b, 1, a), `${level} ${seed} ${JSON.stringify(a)}`).toBe(true);
      }
    }
  });

  it('Hard switches out of a bad matchup when a teammate resists it', () => {
    const b = battle([mk('fx-tide', 25, ['tide-hit'])], [mk('fx-flare', 25, ['flare-hit', 'bump']), mk('fx-leaf', 25, ['leaf-hit'])]);
    expect(chooseAction(dex, b, 1, 'hard', new Rng(4))).toEqual({ type: 'switch', to: 1 });
    // Normal never switches on its own.
    expect(chooseAction(dex, b, 1, 'normal', new Rng(4)).type).not.toBe('switch');
  });

  it('Easy sometimes picks another sensible option, Normal mostly the best', () => {
    const picks = (level: Difficulty) => {
      const seen = new Map<string, number>();
      for (let seed = 0; seed < 200; seed++) {
        const b = battle([mk('fx-flare', 20, ['bump'])], [mk('fx-tide', 20, ['tide-hit', 'bump', 'pump'])]);
        const a = chooseAction(dex, b, 1, level, new Rng(seed));
        const key = a.type === 'move' ? a.move : a.type;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      return seen;
    };
    const easy = picks('easy'), normal = picks('normal');
    expect(normal.get('tide-hit')).toBeGreaterThan(180);
    expect(easy.get('tide-hit')).toBeLessThan(180);
    expect(easy.get('tide-hit')).toBeGreaterThan(80);
  });

  it('scores a sleep move highly only while the foe is awake', () => {
    const b = battle([mk('fx-flare', 20, ['bump'])], [mk('fx-glow', 20, ['lullaby', 'bump'])]);
    const before = scoreOptions(dex, b, 1, false).find(o => o.action.type === 'move' && o.action.move === 'lullaby')!.score;
    resolveTurn(dex, b, { type: 'move', move: 'bump' }, { type: 'move', move: 'lullaby' });
    const after = scoreOptions(dex, b, 1, false).find(o => o.action.type === 'move' && o.action.move === 'lullaby')!.score;
    expect(after).toBeLessThan(before);
  });

  it('suggests the strong-against move as the player hint', () => {
    const b = battle([mk('fx-tide', 20, ['bump', 'tide-hit', 'leaf-hit'])], [mk('fx-flare', 20, ['bump'])], 'wild');
    expect(suggestMove(dex, b)).toBe('tide-hit');
  });
});
