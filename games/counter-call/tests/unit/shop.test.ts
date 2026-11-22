import { describe, expect, it } from 'vitest';
import { UPGRADES, UPGRADE_BY_ID } from '../../src/data/upgrades';
import { buy, levelOf, nextCost } from '../../src/shop';
import { modsFor } from '../../src/sim';
import { defaultSave } from '../../src/storage';

describe('the shop', () => {
  it('sells each level once, for its price', () => {
    const [first, second, third] = UPGRADE_BY_ID.shoes.costs;
    let data = { ...defaultSave(), coins: first + second };
    expect(nextCost(data, 'shoes')).toBe(first);
    data = buy(data, 'shoes')!;
    expect(data.coins).toBe(second);
    expect(levelOf(data, 'shoes')).toBe(1);
    data = buy(data, 'shoes')!;
    expect(data.coins).toBe(0);
    expect(levelOf(data, 'shoes')).toBe(2);
    expect(nextCost(data, 'shoes')).toBe(third);
  });

  it('refuses when there are too few coins or nothing left to buy', () => {
    const poor = { ...defaultSave(), coins: UPGRADE_BY_ID.shoes.costs[0] - 1 };
    expect(buy(poor, 'shoes')).toBeNull();
    expect(poor.upgrades).toEqual({});
    const full = { ...defaultSave(), coins: 9999, upgrades: { tray: 1 } };
    expect(nextCost(full, 'tray')).toBeNull();
    expect(buy(full, 'tray')).toBeNull();
    expect(levelOf({ ...defaultSave(), upgrades: { tray: 7, cake: -2 } }, 'tray')).toBe(1);
    expect(levelOf({ ...defaultSave(), upgrades: { tray: 7, cake: -2 } }, 'cake')).toBe(0);
  });

  it('makes every upgrade change something in the game', () => {
    const base = JSON.stringify(modsFor('minty'));
    for (const up of UPGRADES) {
      expect(up.costs.length, up.id).toBeGreaterThan(0);
      expect([...up.costs].sort((a, b) => a - b), up.id).toEqual(up.costs);
      expect(JSON.stringify(modsFor('minty', { [up.id]: 1 })), up.id).not.toBe(base);
      expect(UPGRADE_BY_ID[up.id]).toBe(up);
    }
  });
});
