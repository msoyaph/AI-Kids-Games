/**
 * Neighbour farms, run by the computer: Plumridge Orchard, Nannyberry Farm and Reedmere. Each day
 * every neighbour offers one fair swap. A co-op order is filled together: the neighbour adds their
 * share as time passes, you add yours, and nobody is ever late. Now and then a neighbour visits,
 * strolls round your farm, says what they think of it, and leaves a small gift. Friendship (hearts)
 * grows with every trade, co-op and visit.
 */
import { hashInts, noise } from '../core/rng';
import { NEIGHBOR, NEIGHBORS } from '../data/cast';
import { ITEMS } from '../data/items';
import { dayIndex, DAY_SEC } from './clock';
import { add, count, take } from './inventory';
import { beauty } from './decorate';
import { obtainable, roll } from './orders';
import type { Farm } from './state';
import { bump, earn, levelOf } from './world';

export interface NeighborState { hearts: number; tradedDay: number; visits: number }
export interface Coop { neighbor: string; item: string; need: number; mine: number; theirs: number; coins: number; startedAt: number }
export interface Trade { neighbor: string; give: { id: string; n: number }; want: { id: string; n: number } }

/** Trades and co-ops start at this farm level (the story introduces the neighbours around then). */
export const NEIGHBOR_LEVEL = 5;
/** A neighbour drops by about every day and a half of play. */
export const VISIT_EVERY = DAY_SEC * 1.5;

export function neighborState(farm: Farm, id: string): NeighborState {
  return (farm.neighbors[id] ??= { hearts: 0, tradedDay: -1, visits: 0 });
}

const befriend = (farm: Farm, id: string, amount: number) => {
  const s = neighborState(farm, id);
  s.hearts = Math.min(5, s.hearts + amount);
  // the first good friend gives the Country Set
  if (s.hearts >= 3 && !farm.flags['set:country']) farm.flags['set:country'] = 1;
};

/** Today's swap with a neighbour (or null when they've traded today or have nothing you can use). */
export function tradeOffer(farm: Farm, id: string): Trade | null {
  const n = NEIGHBOR[id];
  if (!n || levelOf(farm) < NEIGHBOR_LEVEL) return null;
  const day = dayIndex(farm.t);
  if (neighborState(farm, id).tradedDay === day) return null;
  const can = obtainable(farm);
  const wants = n.wants.filter(w => can.has(w));
  if (!wants.length) return null;
  const h = hashInts(farm.seed, day, id.length, id.charCodeAt(0));
  const wantId = wants[h % wants.length]!;
  const giveId = n.gives[(h >>> 8) % n.gives.length]!;
  const wantN = 3 + ((h >>> 16) % 4);
  // fair, with a little extra for being a good neighbour
  const giveN = Math.max(1, Math.round((ITEMS[wantId]!.price * wantN * 1.15) / ITEMS[giveId]!.price));
  return { neighbor: id, give: { id: giveId, n: giveN }, want: { id: wantId, n: wantN } };
}

export function acceptTrade(farm: Farm, t: Trade): { ok: true } | { ok: false; why: string } {
  if (count(farm, t.want.id) < t.want.n) return { ok: false, why: `You need ${t.want.n} ${ITEMS[t.want.id]!.name}.` };
  take(farm, t.want.id, t.want.n);
  add(farm, t.give.id, 2, t.give.n);
  neighborState(farm, t.neighbor).tradedDay = dayIndex(farm.t);
  befriend(farm, t.neighbor, 0.5);
  farm.xp += 5;
  bump(farm, 'trades');
  return { ok: true };
}

/** Starts a co-op order with a neighbour (one at a time). */
export function startCoop(farm: Farm): Coop | null {
  if (farm.coop || levelOf(farm) < NEIGHBOR_LEVEL + 1) return null;
  const can = [...obtainable(farm)].filter(id => ITEMS[id]?.kind === 'crop' || ITEMS[id]?.kind === 'good');
  if (!can.length) return null;
  const n = NEIGHBORS[Math.floor(roll(farm) * NEIGHBORS.length)]!;
  const item = can[Math.floor(roll(farm) * can.length)]!;
  const good = ITEMS[item]!.kind === 'good';
  const need = good ? 6 + Math.floor(roll(farm) * 4) : 20 + Math.floor(roll(farm) * 16);
  farm.coop = { neighbor: n.id, item, need, mine: 0, theirs: 0, coins: Math.round(ITEMS[item]!.price * need * 1.6), startedAt: farm.t };
  return farm.coop;
}

/** Add your share. Returns how many were added. */
export function giveToCoop(farm: Farm, n: number): number {
  const c = farm.coop;
  if (!c) return 0;
  const room = c.need - c.mine - c.theirs;
  const k = Math.min(n, room, count(farm, c.item));
  if (k <= 0) return 0;
  take(farm, c.item, k);
  c.mine += k;
  return k;
}

/** The neighbour adds their share as time passes (up to half, never more than needed). */
function coopWork(farm: Farm): Coop | null {
  const c = farm.coop;
  if (!c) return null;
  const theirTarget = Math.floor(c.need / 2);
  const due = Math.min(theirTarget, Math.floor((farm.t - c.startedAt) / 40));
  c.theirs = Math.max(c.theirs, Math.min(due, c.need - c.mine));
  if (c.mine + c.theirs >= c.need) {
    earn(farm, c.coins);
    farm.xp += Math.round(c.coins / 4);
    befriend(farm, c.neighbor, 1);
    farm.coop = null;
    bump(farm, 'coops');
    return c;
  }
  return null;
}

/** A visit: who, what they think (from the beauty rating), and the gift they leave. */
export interface Visit { neighbor: string; beauty: number; tier: string; gift: { coins: number; item?: { id: string; n: number } } }

function visitTick(farm: Farm): Visit | null {
  if (levelOf(farm) < NEIGHBOR_LEVEL) return null;
  const last = farm.flags.lastVisitAt ?? farm.t;
  if (farm.flags.lastVisitAt === undefined) { farm.flags.lastVisitAt = farm.t; return null; }
  if (farm.t - last < VISIT_EVERY) return null;
  farm.flags.lastVisitAt = farm.t;
  const n = NEIGHBORS[Math.floor(noise(farm.seed, Math.floor(farm.t), 51) * NEIGHBORS.length)]!;
  const b = beauty(farm);
  const coins = 10 + Math.round(b.score / 2);
  earn(farm, coins);
  const itemId = n.gives[Math.floor(noise(farm.seed, Math.floor(farm.t), 52) * n.gives.length)]!;
  const item = b.score >= 25 ? { id: itemId, n: 2 } : undefined;
  if (item) add(farm, item.id, 2, item.n);
  const s = neighborState(farm, n.id);
  s.visits++;
  bump(farm, 'visits');
  befriend(farm, n.id, 0.5);
  return { neighbor: n.id, beauty: b.score, tier: b.tier, gift: { coins, item } };
}

/** Neighbours' doings as time passes. */
export function neighborsTick(farm: Farm): { coopDone: Coop | null; visit: Visit | null } {
  return { coopDone: coopWork(farm), visit: visitTick(farm) };
}
