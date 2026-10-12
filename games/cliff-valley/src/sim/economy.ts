/** Prices and the shipping bin (paid overnight with a summary). */
import { tryItem } from '../data/items';
import { TUNING } from '../tuning';
import { hasPerk } from './skills';
import type { Sim } from './sim';
import { registerSystem, type DayReport } from './systems';
import type { ItemStack } from './types';

/** Coins the player gets for one item of quality q. */
export function sellPrice(sim: Sim | null, id: string, q = 0): number {
  const d = tryItem(id);
  if (!d || d.price <= 0) return 0;
  let p = d.price * (d.quality ? TUNING.qualityMult[q] ?? 1 : 1);
  if (sim) {
    if ((d.cat === 'crop' || d.cat === 'fruit' || d.cat === 'flower') && hasPerk(sim, 'tiller')) p *= 1.1;
    if (d.cat === 'animal' && hasPerk(sim, 'rancher')) p *= 1.2;
    if (d.cat === 'artisan' && hasPerk(sim, 'artisan')) p *= 1.25;
    if ((d.cat === 'fish' || d.cat === 'crab') && hasPerk(sim, 'angler')) p *= 1.25;
    if ((d.cat === 'gem' || d.cat === 'mineral') && hasPerk(sim, 'gemologist')) p *= 1.3;
    if (d.cat === 'forage' && hasPerk(sim, 'gatherer')) p *= 1.2;
    if (d.cat === 'food' && hasPerk(sim, 'chef')) p *= 1.2;
  }
  return Math.floor(p);
}

export function canShip(id: string): boolean {
  const d = tryItem(id);
  return !!d && d.price > 0 && d.cat !== 'tool';
}

/** Move a stack (or part) from the bag into the shipping bin. */
export function shipFromSlot(sim: Sim, slot: number, n?: number): boolean {
  const s = sim.p.inv[slot];
  if (!s || !canShip(s.id)) return false;
  const take = Math.min(n ?? s.n, s.n);
  const prev = sim.state.bin.find((b) => b.id === s.id && b.q === s.q);
  if (prev) prev.n += take;
  else sim.state.bin.push({ id: s.id, n: take, q: s.q });
  s.n -= take;
  if (s.n <= 0) sim.p.inv[slot] = null;
  sim.state.flags.shippedOnce = 1;
  return true;
}

/** Take the last shipped stack back out of the bin. */
export function unshipLast(sim: Sim): ItemStack | null {
  const last = sim.state.bin.pop();
  if (!last) return null;
  sim.give(last.id, last.n, last.q, true);
  return last;
}

export function binValue(sim: Sim): number {
  return sim.state.bin.reduce((t, s) => t + sellPrice(sim, s.id, s.q) * s.n, 0);
}

function endDay(sim: Sim, r: DayReport): void {
  const st = sim.state;
  let total = 0;
  for (const s of st.bin) {
    const v = sellPrice(sim, s.id, s.q) * s.n;
    total += v;
    r.shipped.push({ id: s.id, n: s.n, q: s.q, v });
    st.col.shipped[s.id] = (st.col.shipped[s.id] ?? 0) + s.n;
  }
  st.bin = [];
  r.total = total;
  st.player.coins += total;
  st.player.earned += total;
  st.stats.shippedValue += total;
  st.lastShip = { items: r.shipped.map((x) => ({ id: x.id, n: x.n, v: x.v })), total };
}

registerSystem({ id: 'shipping', endDay });
