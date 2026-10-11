import { describe, expect, it } from 'vitest';
import { addToPockets, countItem, give, removeItem, roomFor, setPocketSize, swapSlots } from '../src/sim/inventory';
import { equipKind, equippedTool, wearTool } from '../src/sim/tools';
import { makeGame } from './helpers';

describe('inventory', () => {
  it('stacks up to the item stack size and fills new slots', () => {
    const g = makeGame();
    expect(addToPockets(g, 'branch', 45)).toBe(0);
    expect(countItem(g, 'branch')).toBe(45);
    const slots = g.state.player.inv.filter((s) => s?.id === 'branch');
    expect(slots.map((s) => s!.qty).sort()).toEqual([15, 30]);
  });

  it('reports room and overflows to storage via give()', () => {
    const g = makeGame();
    for (let i = 0; i < 20; i++) addToPockets(g, 'fish_' + i, 1);
    expect(roomFor(g, 'timber', 5)).toBe(0);
    const r = give(g, 'timber', 5);
    expect(r.storage).toBe(5);
    expect(g.state.home.storage.find((s) => s.id === 'timber')?.qty).toBe(5);
  });

  it('removes items atomically', () => {
    const g = makeGame();
    give(g, 'stone', 3);
    expect(removeItem(g, 'stone', 5)).toBe(false);
    expect(countItem(g, 'stone')).toBe(3);
    expect(removeItem(g, 'stone', 2)).toBe(true);
    expect(countItem(g, 'stone')).toBe(1);
  });

  it('upgrades pockets and swaps slots', () => {
    const g = makeGame();
    setPocketSize(g, 30);
    expect(g.state.player.inv.length).toBe(30);
    give(g, 'clay', 1);
    swapSlots(g, 0, 29);
    expect(g.state.player.inv[29]?.id).toBe('clay');
  });

  it('tools wear out and break, then a spare is equipped', () => {
    const g = makeGame();
    give(g, 'axe_flimsy', 2);
    expect(equipKind(g, 'axe')).toBe(true);
    const t = equippedTool(g)!;
    const dur = t.s.dur!;
    for (let k = 0; k < dur; k++) wearTool(g);
    expect(countItem(g, 'axe_flimsy')).toBe(1);
    expect(equippedTool(g)?.kind).toBe('axe');
  });

  it('marks items as owned in the catalog', () => {
    const g = makeGame();
    give(g, 'shell_spiral', 1);
    expect(g.state.catalog.owned.shell_spiral).toBeGreaterThan(0);
  });
});
