/** Shop logic: hours, stock, buying, selling to shopkeepers and services. */
import { formatClock } from '../core/math';
import { EXTRA_STOCK, HOME_HOURS, HOME_ROOMS, SHOPS, SHOP_BY_ROOM, type ShopEntry } from '../data/shops';
import { tryItem } from '../data/items';
import { TUNING } from '../tuning';
import { sellPrice } from './economy';
import { addItem, canFit, count, remove } from './inventory';
import { simInitHooks, type Sim } from './sim';
import { WEEKDAY_NAMES } from './state';
import { registerSystem } from './systems';

export type ServiceFn = (sim: Sim, e: ShopEntry) => { ok: boolean; msg?: string };
export const SERVICES: Record<string, ServiceFn> = {};

/** Hook for festivals / story to close shops (returns a reason or null). */
export const shopClosedHooks: ((sim: Sim, shopId: string) => string | null)[] = [];

export function shopHours(id: string): string {
  const s = SHOPS[id];
  const closed = s.closed.length ? ` (closed ${s.closed.map((d) => WEEKDAY_NAMES[d]).join(', ')})` : '';
  return `${formatClock(s.open)} – ${formatClock(s.close)}${closed}`;
}

export function shopOpen(sim: Sim, id: string): { open: boolean; reason?: string } {
  const s = SHOPS[id];
  if (!s) return { open: false };
  for (const h of shopClosedHooks) {
    const r = h(sim, id);
    if (r) return { open: false, reason: r };
  }
  const st = sim.state;
  if (s.closed.includes(st.day % 5)) return { open: false, reason: `${s.name} is closed on ${WEEKDAY_NAMES[st.day % 5]}s. Open ${shopHours(id)}.` };
  if (st.min < s.open || st.min >= s.close) return { open: false, reason: `${s.name} is closed right now. Open ${shopHours(id)}.` };
  return { open: true };
}

export function shopStock(sim: Sim, id: string): ShopEntry[] {
  const s = SHOPS[id];
  if (!s) return [];
  const out = s.stock(sim.state);
  for (const f of EXTRA_STOCK[id] ?? []) out.push(...f(sim.state));
  return out;
}

export function boughtToday(sim: Sim, shop: string, id: string): number {
  return sim.state.shopToday[`${shop}.${id}`] ?? 0;
}

export function buy(sim: Sim, shop: string, e: ShopEntry, qty = 1): { ok: boolean; msg?: string } {
  const p = sim.p;
  if (e.locked) return { ok: false, msg: e.locked };
  if (e.limit !== undefined && boughtToday(sim, shop, e.id) + qty > e.limit) return { ok: false, msg: 'Sold out for today!' };
  const cost = e.price * qty;
  if (p.coins < cost) return { ok: false, msg: "You don't have enough coins." };
  for (const [m, n] of e.mats ?? []) if (count(p.inv, m) < n * qty) return { ok: false, msg: `You need ${n * qty} ${tryItem(m)?.name ?? m}.` };
  if (e.service) {
    const fn = SERVICES[e.service];
    if (!fn) return { ok: false };
    const r = fn(sim, e);
    if (!r.ok) return r;
  } else {
    if (!canFit(p.inv, e.id, qty, 0)) return { ok: false, msg: 'Your bag is full!' };
    addItem(p.inv, e.id, qty, 0);
  }
  p.coins -= cost;
  for (const [m, n] of e.mats ?? []) remove(p.inv, m, n * qty);
  const k = `${shop}.${e.id}`;
  sim.state.shopToday[k] = (sim.state.shopToday[k] ?? 0) + qty;
  return { ok: true };
}

export function shopBuys(shop: string, id: string): boolean {
  const s = SHOPS[shop];
  const d = tryItem(id);
  if (!s || !d || d.price <= 0 || d.cat === 'tool') return false;
  return s.buys === 'all' || s.buys.includes(d.cat);
}

export function sellToShop(sim: Sim, shop: string, slot: number, n?: number): number {
  const s = sim.p.inv[slot];
  if (!s || !shopBuys(shop, s.id)) return 0;
  const take = Math.min(n ?? s.n, s.n);
  const v = sellPrice(sim, s.id, s.q) * take;
  s.n -= take;
  if (s.n <= 0) sim.p.inv[slot] = null;
  sim.p.coins += v;
  sim.p.earned += v;
  sim.state.col.shipped[s.id] = (sim.state.col.shipped[s.id] ?? 0) + take;
  return v;
}

/** Block entering closed shops and homes at night. */
export function doorGuard(sim: Sim, to: string): string | null {
  const shop = SHOP_BY_ROOM[to];
  if (shop) {
    const r = shopOpen(sim, shop);
    if (!r.open) return r.reason ?? 'Closed!';
  }
  if (HOME_ROOMS.includes(to) && (sim.state.min < HOME_HOURS.open || sim.state.min >= HOME_HOURS.close)) return "The door is locked. Everyone inside must be sleeping. Shh!";
  return null;
}

/** Bag upgrade service (general store). */
SERVICES.backpack = (sim) => {
  const inv = sim.p.inv;
  const next = TUNING.inventoryUpgrades.find((n) => n > inv.length);
  if (!next) return { ok: false, msg: 'Your bag is as big as it gets!' };
  while (inv.length < next) inv.push(null);
  return { ok: true, msg: `Your bag now holds ${next} items!` };
};

simInitHooks.push((sim) => sim.warpGuards.push(doorGuard));

registerSystem({
  id: 'shops',
  endDay(sim) {
    sim.state.shopToday = {};
  },
});
