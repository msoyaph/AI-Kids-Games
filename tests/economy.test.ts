import { describe, expect, it } from 'vitest';
import { buy, buyPrice, dailyStock, hotItem, isNativeFruit, sellPrice, sellSlot } from '../src/sim/economy';
import { countItem, give, money } from '../src/sim/inventory';
import { craft, canCraft, learnRecipe, knowsRecipe } from '../src/sim/crafting';
import { FRUITS } from '../src/data/fruit';
import { FOREIGN_FRUIT_MULT } from '../src/data/fruit';
import { item } from '../src/data/registry';
import { makeGame } from './helpers';

describe('economy', () => {
  it('sells items for their price and pays out Glints', () => {
    const g = makeGame(80);
    give(g, 'shell_scallop', 3);
    const slot = g.state.player.inv.findIndex((s) => s?.id === 'shell_scallop');
    const earned = sellSlot(g, slot);
    expect(earned).toBe(sellPrice(g, 'shell_scallop') * 3);
    expect(g.state.player.glints).toBe(earned);
    expect(countItem(g, 'shell_scallop')).toBe(0);
    expect(g.state.stats.glintsEarned).toBe(earned);
  });

  it('foreign fruit sells for more than native fruit', () => {
    const g = makeGame(81);
    const native = FRUITS[g.world.gen.nativeFruit]!;
    const foreign = FRUITS.find((f) => f.id !== native.id)!;
    expect(isNativeFruit(g, native.id)).toBe(true);
    expect(sellPrice(g, foreign.id)).toBe(foreign.price * FOREIGN_FRUIT_MULT);
    expect(sellPrice(g, native.id)).toBe(native.price);
  });

  it('key items cannot be sold', () => {
    const g = makeGame(82);
    give(g, 'ladder');
    const slot = g.state.player.inv.findIndex((s) => s?.id === 'ladder');
    expect(sellSlot(g, slot)).toBe(0);
    expect(countItem(g, 'ladder')).toBe(1);
  });

  it('the hot item doubles the sell price', () => {
    const g = makeGame(83);
    const hot = hotItem(g);
    expect(sellPrice(g, hot)).toBe(item(hot).price * 2);
  });

  it('daily stock is deterministic and changes between days', () => {
    const a = makeGame(84), b = makeGame(84);
    expect(dailyStock(a, 'shop')).toEqual(dailyStock(b, 'shop'));
    const d1 = dailyStock(a, 'shop').map((e) => e.id).join();
    a.state.clock.day = 7;
    expect(dailyStock(a, 'shop').map((e) => e.id).join()).not.toBe(d1);
    expect(dailyStock(a, 'cart').length).toBeLessThan(dailyStock(a, 'shop').length);
  });

  it('buying requires Glints; limited items sell out for the day', () => {
    const g = makeGame(85);
    const st = dailyStock(g, 'shop');
    const limited = st.find((e) => e.limited)!;
    expect(buy(g, limited)).toBe(false);
    money(g, limited.price * 3);
    expect(buy(g, limited)).toBe(true);
    expect(countItem(g, limited.id)).toBe(1);
    expect(buy(g, limited)).toBe(false);
    expect(g.state.player.glints).toBe(limited.price * 2);
    expect(buyPrice('sapling_round')).toBeGreaterThan(0);
  });
});

describe('crafting', () => {
  it('requires a known recipe and all ingredients', () => {
    const g = makeGame(90);
    expect(craft(g, 'r_net_flimsy')).toBe(false);
    learnRecipe(g, 'r_net_flimsy', 'test', true);
    expect(knowsRecipe(g, 'r_net_flimsy')).toBe(true);
    give(g, 'branch', 4);
    expect(canCraft(g, { id: 'r_net_flimsy', result: 'net_flimsy', ingredients: [{ id: 'branch', qty: 5 }], unlock: 'mission' })).toBe(false);
    expect(craft(g, 'r_net_flimsy')).toBe(false);
    give(g, 'branch', 3);
    expect(craft(g, 'r_net_flimsy')).toBe(true);
    expect(countItem(g, 'net_flimsy')).toBe(1);
    expect(countItem(g, 'branch')).toBe(2);
    expect(g.state.stats.crafted).toBe(1);
  });

  it('upgrade recipes consume the flimsy tool', () => {
    const g = makeGame(91);
    learnRecipe(g, 'r_net', 'test', true);
    give(g, 'net_flimsy');
    give(g, 'iron', 3);
    expect(craft(g, 'r_net')).toBe(true);
    expect(countItem(g, 'net_flimsy')).toBe(0);
    expect(countItem(g, 'net')).toBe(1);
  });

  it('crafting quantity recipes yields multiple items', () => {
    const g = makeGame(92);
    learnRecipe(g, 'r_lantern_kit', 'test', true);
    give(g, 'fiber', 3);
    give(g, 'glowstone', 1);
    give(g, 'timber', 2);
    expect(craft(g, 'r_lantern_kit')).toBe(true);
    expect(countItem(g, 'lantern_kit')).toBe(2);
  });
});
