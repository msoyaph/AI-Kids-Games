/**
 * The town order board and the Little Lark. Townsfolk post orders for things the farm can make right
 * now. Tap Deliver and the crate goes on the boat; the boat sails down the river to Larkford and comes
 * back with the coins and a thank-you. There are no deadlines: orders wait as long as you like, and
 * any order can be swapped for a new one, free.
 */
import { ANIMALS } from '../data/animals';
import { PEOPLE } from '../data/cast';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { TREES } from '../data/orchard';
import { MACHINE, RECIPES } from '../data/production';
import { animalsIn, isHome } from './animals';
import { count, take } from './inventory';
import { isMachine } from './production';
import type { Farm } from './state';
import { bump, earn, levelOf, roll } from './world';

export interface OrderItem { id: string; n: number }
export interface Order { id: number; who: string; items: OrderItem[]; coins: number; xp: number; story?: string; note?: string; /** A contract drop (src/sim/contracts.ts), not a board order. */ contract?: string }
export interface BoatState { crates: Order[]; cargo: Order[]; backAt: number | null; trips: number }

export const BOARD_SLOTS = 6;
/** Seconds of play for a round trip to Larkford. */
export const TRIP = 120;
/** Seconds before an empty board slot gets a new order. */
export const REFILL = 20;

export { roll };
const pick = <T>(farm: Farm, list: readonly T[]) => list[Math.floor(roll(farm) * list.length)]!;

/** Everything the farm can get right now: crops it may plant, fruit it grows, animal products, workshop goods. */
export function obtainable(farm: Farm): Set<string> {
  const level = levelOf(farm);
  const out = new Set<string>();
  // (rice needs a wet field, and the home plot always has some beside the river)
  for (const c of CROPS) if (c.level <= level) out.add(c.id);
  for (const o of farm.objects) {
    if (o.kind === 'tree') { const t = TREES.find(x => x.id === o.def); if (t) out.add(t.fruit); }
    if (isHome(o) && animalsIn(o).length) { const a = ANIMALS.find(x => x.home === o.def); if (a?.product) out.add(a.product); }
  }
  const machines = new Set(farm.objects.filter(isMachine).map(o => o.def));
  // goods whose ingredients can all be had (in chain order, so flour makes bread possible)
  for (let pass = 0; pass < 4; pass++) {
    for (const r of RECIPES) {
      if (r.level > level || !machines.has(r.machine) || !MACHINE[r.machine]) continue;
      if (Object.keys(r.inputs).every(i => out.has(i))) out.add(r.id);
    }
  }
  return out;
}

/** Everyday orders come from the townsfolk (Hattie and the fair judge only ask in the story). */
const ORDERERS = PEOPLE.filter(p => p.id !== 'hattie' && p.id !== 'penrose');

function giverFor(farm: Farm, ids: string[]): string {
  const kinds = ids.map(id => ITEMS[id]?.kind);
  const fits = ORDERERS.filter(p => ids.some((id, i) => p.likes.includes(id) || p.likes.includes(kinds[i] ?? '')));
  return pick(farm, fits.length ? fits : ORDERERS).id;
}

/** A fresh order for things the farm can make now (made-goods orders are a little rarer). */
export function makeOrder(farm: Farm): Order {
  const can = [...obtainable(farm)];
  const goods = can.filter(id => ITEMS[id]?.kind === 'good');
  const others = can.filter(id => ITEMS[id]?.kind !== 'good' && ITEMS[id]?.sellable);
  const lines = 1 + Math.floor(roll(farm) * Math.min(3, 1 + levelOf(farm) / 5));
  const items: OrderItem[] = [];
  for (let i = 0; i < lines; i++) {
    const useGood = goods.length && roll(farm) < 0.35;
    const id = pick(farm, useGood ? goods : others.length ? others : can);
    if (items.some(x => x.id === id)) continue;
    const kind = ITEMS[id]!.kind;
    const n = kind === 'good' ? 1 + Math.floor(roll(farm) * 2) : kind === 'animal' ? 2 + Math.floor(roll(farm) * 3) : 3 + Math.floor(roll(farm) * (3 + levelOf(farm) / 3));
    items.push({ id, n });
  }
  const value = items.reduce((s, x) => s + ITEMS[x.id]!.price * x.n, 0);
  const coins = Math.round(value * 1.45 + 8);
  const id = (farm.orderSeq = (farm.orderSeq ?? 0) + 1);
  return { id, who: giverFor(farm, items.map(x => x.id)), items, coins, xp: Math.max(4, Math.round(coins / 4)) };
}

/** Fill empty board slots as their wait runs out. Returns how many new orders arrived. */
export function refillBoard(farm: Farm): number {
  let added = 0;
  if (farm.orders.length >= BOARD_SLOTS) { farm.nextOrderAt = null; return 0; }
  if (farm.nextOrderAt === null) farm.nextOrderAt = farm.t + REFILL;
  while (farm.orders.length < BOARD_SLOTS && farm.nextOrderAt !== null && farm.t >= farm.nextOrderAt) {
    farm.orders.push(makeOrder(farm));
    added++;
    farm.nextOrderAt = farm.orders.length < BOARD_SLOTS ? farm.nextOrderAt + REFILL : null;
  }
  return added;
}

export const canFill = (farm: Farm, o: Order) => o.items.every(x => count(farm, x.id) >= x.n);

/** What the story requests on the board still need, by item (helpers leave these alone). */
export function storyNeeds(farm: Farm): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of farm.orders) if (o.story) for (const x of o.items) out.set(x.id, (out.get(x.id) ?? 0) + x.n);
  return out;
}

/** Would using `n` of an item leave too few for the story requests? */
export const neededForStory = (farm: Farm, id: string, n: number, needs = storyNeeds(farm)) => needs.has(id) && count(farm, id) - n < needs.get(id)!;

/** Send an order's crate down to the dock (the boat takes it on its next trip). */
export function deliver(farm: Farm, orderId: number): { ok: true } | { ok: false; why: string } {
  const i = farm.orders.findIndex(o => o.id === orderId);
  const o = farm.orders[i];
  if (!o) return { ok: false, why: 'That order is gone.' };
  if (!canFill(farm, o)) return { ok: false, why: 'You don’t have everything yet.' };
  for (const x of o.items) take(farm, x.id, x.n);
  farm.orders.splice(i, 1);
  farm.boat.crates.push(o);
  if (farm.nextOrderAt === null) farm.nextOrderAt = farm.t + REFILL;
  sail(farm);
  return { ok: true };
}

/** A crate for the boat that isn't from the board (a contract drop): it sails with the next trip. */
export function queueCrate(farm: Farm, o: Order) {
  farm.boat.crates.push(o);
  sail(farm);
}

/** Swap an order for a new one, free (a fresh one arrives soon). Story requests stay. */
export function skipOrder(farm: Farm, orderId: number): boolean {
  const i = farm.orders.findIndex(o => o.id === orderId && !o.story);
  if (i < 0) return false;
  farm.orders.splice(i, 1);
  if (farm.nextOrderAt === null) farm.nextOrderAt = farm.t + REFILL / 2;
  return true;
}

/** How many crates fit on the boat (the Riverside's second landing makes room for two). */
export const boatCapacity = (farm: Farm) => (farm.unlocked.includes('riverside') ? 2 : 1);

/** If the boat is home and crates are waiting, off it goes. */
function sail(farm: Farm) {
  const b = farm.boat;
  if (b.backAt !== null || !b.crates.length) return;
  b.cargo = b.crates.splice(0, boatCapacity(farm));
  b.backAt = farm.t + TRIP;
}

/** The boat comes home: coins and XP for every delivered order. Returns the orders delivered. */
export function boatTick(farm: Farm): Order[] {
  const b = farm.boat;
  if (b.backAt === null) { sail(farm); return []; }
  if (farm.t < b.backAt) return [];
  const done = b.cargo;
  for (const o of done) {
    earn(farm, o.coins);
    farm.xp += o.xp;
    if (!o.contract) bump(farm, 'orders');
    if (o.story) bump(farm, `story:${o.story}`);
  }
  b.cargo = [];
  b.backAt = null;
  b.trips++;
  sail(farm);
  return done;
}

/** 0..1 along the trip (0 at the dock, 0.5 in town, 1 home again), or null at the dock. */
export function boatTrip(farm: Farm): number | null {
  const b = farm.boat;
  return b.backAt === null ? null : Math.min(1, Math.max(0, 1 - (b.backAt - farm.t) / TRIP));
}

/** For "while you were away": the boat gets back sooner. */
export function boatCatchUp(farm: Farm, seconds: number) {
  if (farm.boat.backAt !== null) farm.boat.backAt = Math.max(farm.t, farm.boat.backAt - seconds);
}
