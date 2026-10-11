import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../src/data/maps/types';
import { sellValue, totalCost, TOWERS } from '../../src/data/towers';
import { coinScale, waveClearBonus } from '../../src/data/waves';
import { Game } from '../../src/sim/Game';

const FIELD: MapDef = {
  id: 'field',
  name: 'Field',
  world: 1,
  theme: 'meadow',
  style: 'maze',
  story: '',
  grid: ['..........', 'S........C', '..........'],
  waves: 3,
};

function game(coins = 1000, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): Game {
  return new Game({ map: FIELD, difficulty, mode: 'campaign', startCoins: coins });
}

describe('economy', () => {
  it('building costs the level-1 price', () => {
    const g = game(100);
    g.build('arrow', 3, 0);
    expect(g.coins).toBe(100 - TOWERS.arrow.levels[0]!.cost);
  });

  it('cannot build without enough coins', () => {
    const g = game(10);
    expect(g.canBuild('arrow', 3, 0)).toEqual({ ok: false, reason: 'coins' });
    expect(g.build('arrow', 3, 0)).toBeNull();
    expect(g.coins).toBe(10);
  });

  it('upgrades cost the next level price and cap at level 4', () => {
    const g = game(10000);
    const t = g.build('cannon', 3, 0)!;
    for (let lv = 2; lv <= 4; lv++) {
      const before = g.coins;
      expect(g.upgrade(t)).toBe(true);
      expect(before - g.coins).toBe(TOWERS.cannon.levels[lv - 1]!.cost);
      expect(t.level).toBe(lv);
    }
    expect(g.upgrade(t)).toBe(false);
    expect(t.invested).toBe(totalCost('cannon', 4));
  });

  it('selling refunds 75% of everything invested', () => {
    const g = game(10000);
    const t = g.build('arrow', 3, 0)!;
    g.upgrade(t);
    const invested = t.invested;
    const before = g.coins;
    expect(g.sell(t)).toBe(Math.floor(invested * 0.75));
    expect(g.coins).toBe(before + Math.floor(invested * 0.75));
    expect(sellValue(100)).toBe(75);
    expect(g.towerAt(3, 0)).toBeUndefined();
  });

  it('element towers need their element unlocked; combos need both', () => {
    const g = game(10000);
    expect(g.canBuild('flame', 3, 0).reason).toBe('locked');
    g.chooseElement('fire');
    expect(g.canBuild('flame', 3, 0).ok).toBe(true);
    expect(g.canBuild('steam', 3, 0).reason).toBe('locked');
    g.crystals = 1;
    g.chooseElement('water');
    expect(g.canBuild('steam', 3, 0).ok).toBe(true);
  });

  it('crystals: one at the start, picking spends it, no duplicates', () => {
    const g = game();
    expect(g.crystals).toBe(1);
    expect(g.chooseElement('earth')).toBe(true);
    expect(g.crystals).toBe(0);
    expect(g.chooseElement('fire')).toBe(false);
    g.crystals = 1;
    expect(g.chooseElement('earth')).toBe(false);
  });

  it('interest is a small % of saved coins, capped per wave', () => {
    expect(waveClearBonus(1)).toBe(5);
    expect(waveClearBonus(10)).toBe(19);
    expect(coinScale(1)).toBe(1);
    expect(coinScale(21)).toBeCloseTo(2.1, 5);
  });

  it('difficulty changes lives and starting coins', () => {
    expect(game(100, 'easy').lives).toBe(30);
    expect(game(100, 'easy').coins).toBe(150);
    expect(game(100, 'hard').lives).toBe(10);
  });
});
