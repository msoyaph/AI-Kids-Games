// Selling, buying and the shop's daily rotating stock.
import { dayRng } from '../core/rng';
import { BUY_MULT, FLIMSY_TOOL_PRICE, HOT_ITEM_MULT, SAPLING_PRICE, SEED_PRICE } from '../data/economy';
import { FOREIGN_FRUIT_MULT, FRUITS } from '../data/fruit';
import { BUY_PRICE, FURNITURE_SHOP, RECIPES, SURFACE_SHOP, item } from '../data/registry';
import { SEED_ITEMS } from '../data/items';
import type { Game } from './game';
import { give, money, removeAt, roomFor, stat } from './inventory';

export function isNativeFruit(g: Game, id: string): boolean {
  return FRUITS[g.world.gen.nativeFruit]?.id === id;
}

/** Today's hot item (a craftable furniture piece that sells for double). */
export function hotItem(g: Game): string {
  const craftables = RECIPES.filter((r) => item(r.result).cat === 'furniture' && (r.unlock === 'start' || r.unlock === 'mission' || r.unlock === 'card'));
  return dayRng(g.state.seed, g.state.clock.day, 'hot').pick(craftables).result;
}

export function sellPrice(g: Game, id: string): number {
  const def = item(id);
  if (def.key) return 0;
  let p = def.price;
  if (def.cat === 'fruit' && FRUITS.some((f) => f.id === id) && !isNativeFruit(g, id)) p *= FOREIGN_FRUIT_MULT;
  if (id === hotItem(g)) p *= HOT_ITEM_MULT;
  return p;
}

export function canSell(id: string): boolean {
  const def = item(id);
  return !def.key && def.price > 0;
}

/** Sell `qty` from a pocket slot. Returns Glints earned. */
export function sellSlot(g: Game, slot: number, qty?: number): number {
  const s = g.state.player.inv[slot];
  if (!s || !canSell(s.id)) return 0;
  const n = Math.min(qty ?? s.qty, s.qty);
  const each = sellPrice(g, s.id);
  const id = s.id;
  removeAt(g, slot, n, 'sell');
  const total = each * n;
  money(g, total);
  stat(g, 'itemsSold', n);
  g.emit('itemSold', { id, qty: n, total, category: item(id).cat });
  g.emit('sfx', { name: 'coins' });
  return total;
}

export interface StockEntry {
  id: string;
  price: number;
  /** limited (one per day) */
  limited: boolean;
}

export type ShopStage = 'cart' | 'shop';

export function buyPrice(id: string): number {
  const def = item(id);
  if (BUY_PRICE[id]) return BUY_PRICE[id]!;
  if (def.cat === 'seed') return SEED_PRICE;
  if (def.cat === 'sapling') return SAPLING_PRICE;
  if (def.tool && !def.tool.sturdy) return FLIMSY_TOOL_PRICE;
  return def.price * BUY_MULT;
}

/** Deterministic stock for a day. The cart sells only basics. */
export function dailyStock(g: Game, stage: ShopStage): StockEntry[] {
  const rng = dayRng(g.state.seed, g.state.clock.day, 'shop');
  const out: StockEntry[] = [];
  const add = (id: string, limited: boolean) => out.push({ id, price: buyPrice(id), limited });
  const seeds = rng.shuffle([...SEED_ITEMS]).slice(0, stage === 'cart' ? 2 : 4);
  seeds.forEach((s) => add(s.id, false));
  add('sapling_round', false);
  if (stage === 'shop') add('sapling_pine', false);
  // an imported (non-native) fruit every day
  const foreign = FRUITS.filter((_, i) => i !== g.world.gen.nativeFruit);
  add(rng.pick(foreign).id, false);
  for (const t of ['net_flimsy', 'rod_flimsy', 'shovel_flimsy', 'axe_flimsy', 'can_flimsy']) add(t, false);
  if (stage === 'shop') {
    rng.shuffle([...FURNITURE_SHOP]).slice(0, 5).forEach((f) => add(f.id, true));
    const walls = SURFACE_SHOP.filter((s) => s.kind === 'wallpaper');
    const floors = SURFACE_SHOP.filter((s) => s.kind === 'flooring');
    if (walls.length) add(rng.pick(walls).id, true);
    if (floors.length) add(rng.pick(floors).id, true);
  } else {
    rng.shuffle([...FURNITURE_SHOP]).slice(0, 1).forEach((f) => add(f.id, true));
  }
  return out;
}

export function dailyShopReset(g: Game): void {
  if (g.state.shop.day !== g.state.clock.day) g.state.shop = { day: g.state.clock.day, sold: [] };
}

export function buy(g: Game, e: StockEntry, qty = 1): boolean {
  const total = e.price * qty;
  if (g.state.player.glints < total) {
    g.toast("You don't have enough Glints.", 'warn');
    return false;
  }
  if (e.limited && g.state.shop.sold.includes(e.id)) return false;
  if (roomFor(g, e.id, qty) < qty) {
    g.toast('Your pockets are full!', 'warn');
    return false;
  }
  money(g, -total);
  give(g, e.id, qty, 'buy');
  if (e.limited) g.state.shop.sold.push(e.id);
  stat(g, 'itemsBought', qty);
  g.emit('itemBought', { id: e.id, qty, total });
  g.emit('sfx', { name: 'coins' });
  return true;
}
