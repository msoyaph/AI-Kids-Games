/**
 * Your farm stand on the Larkford square (open from chapter 2). Put things from the barn on its
 * shelves and set a price for each, from 60% to 160% of a fair stand price (a stand sells straight to
 * the town, so a fair price is a bit above the market's). A shopper comes by every so often while you
 * play and looks at every shelf:
 *
 *   P(buy) = base × (1.8 − price)^1.4 × (1 + 0.08 × kinds on the stand), at most 0.9
 *
 * where `price` is the slider (1 = fair) and `base` depends on the item and the season (lemonade in
 * summer, soup in winter…). A low price sells fast but earns less each; a high one earns more each
 * but sells slowly. Nothing spoils on the stand, and anything can go back to the barn. The worst a
 * pricing mistake does is sell a bit less, and the stand's page in the Ledger says what happened.
 */
import { ITEMS, itemDef } from '../data/items';
import { dayIndex, seasonOf, type Season } from './clock';
import { add, count, roomLeft, take, type Stars } from './inventory';
import { priceOf } from './market';
import type { Farm } from './state';
import { bump, earn, roll } from './world';

export interface StandSlot { item: string | null; stars: Stars; n: number; price: number; keep: number }
export interface StandDay { day: number; sold: Record<string, { n: number; coins: number; price: number; left: number }> }
export interface StandState { slots: StandSlot[]; nextShopperAt: number; days: StandDay[] }

export const STAND_MARKUP = 1.4;
export const PRICE_MIN = 0.6, PRICE_MAX = 1.6, PRICE_STEP = 0.1;
/** Most of one thing a shelf holds. */
export const SHELF_MAX = 12;
/** Seconds of play between shoppers. */
export const SHOPPER_EVERY = 25;
/** Days of sales the stand remembers (for its Ledger page). */
const DAYS_KEPT = 4;

export const newStand = (): StandState => ({ slots: [], nextShopperAt: 0, days: [] });

export const standOpen = (farm: Farm) => farm.story.chapter >= 1;

/** Shelves: six, and more through the Farm Lab. */
export const shelfCount = (farm: Farm) => 6 + (farm.flags['lab:stand1'] ? 2 : 0) + (farm.flags['lab:stand2'] ? 2 : 0);

export function shelves(farm: Farm): StandSlot[] {
  const s = farm.stand.slots;
  while (s.length < shelfCount(farm)) s.push({ item: null, stars: 1, n: 0, price: 1, keep: 6 });
  return s;
}

/** The word for a price on the slider. */
export function priceWord(p: number): string {
  if (p < 0.85) return 'Bargain';
  if (p <= 1.15) return 'Fair';
  if (p <= 1.35) return 'A bit pricey';
  return 'Pricey';
}

/** Coins for one, at the shelf's price. */
export const shelfPrice = (farm: Farm, slot: StandSlot) => (slot.item ? Math.max(1, Math.round(priceOf(farm, slot.item, slot.stars) * STAND_MARKUP * slot.price)) : 0);

/** What the town wants in each season, beyond the everyday. */
export const WANTED: Record<Season, string[]> = {
  spring: ['strawberry', 'bokchoy', 'chamomiletea', 'honey', 'rhubarbjam'],
  summer: ['lemonade', 'melonjuice', 'watermelon', 'strawberryjam', 'cucumber', 'yogurt'],
  autumn: ['pumpkinpie', 'pumpkin', 'squashsoup', 'plumjam', 'bread'],
  winter: ['veggiesoup', 'squashsoup', 'sweater', 'scarf', 'chamomiletea', 'cake'],
};

/** How keen a shopper is on an item today (before the price). */
export function demand(id: string, season: Season): number {
  const d = ITEMS[id];
  if (!d) return 0;
  let base = d.kind === 'good' ? 0.32 : 0.28;
  if (d.base) base += 0.06; // a variety is a treat
  if (d.seasons?.includes(season)) base += 0.05;
  if (WANTED[season].includes(id) || (d.base && WANTED[season].includes(d.base))) base += 0.15;
  return base;
}

export function buyChance(id: string, season: Season, price: number, kinds: number): number {
  return Math.min(0.9, Math.max(0, demand(id, season) * Math.pow(Math.max(0, 1.8 - price), 1.4) * (1 + 0.08 * kinds)));
}

type Fail = { ok: false; why: string };

/** Put things from the barn on a shelf (an empty one, or more of what it already holds). */
export function stock(farm: Farm, i: number, item: string, stars: Stars, n: number): { ok: true; n: number } | Fail {
  const slot = shelves(farm)[i];
  if (!slot) return { ok: false, why: 'No such shelf.' };
  if (!standOpen(farm)) return { ok: false, why: 'The stand opens in chapter 2.' };
  if (!itemDef(item).sellable) return { ok: false, why: 'That is for using on the farm.' };
  const same = slot.item === item && slot.stars === stars;
  if (slot.item && !same && slot.n > 0) return { ok: false, why: 'That shelf holds something else. Take it back first.' };
  const k = Math.min(n, SHELF_MAX - (same ? slot.n : 0), count(farm, item, stars));
  if (k <= 0) return { ok: false, why: count(farm, item, stars) ? 'That shelf is full.' : 'None in the barn.' };
  take(farm, item, k, stars);
  if (!same) { slot.item = item; slot.stars = stars; slot.n = 0; }
  slot.n += k;
  return { ok: true, n: k };
}

/** Take a shelf's things back to the barn (as many as there is room for); an empty shelf forgets its item. */
export function unstock(farm: Farm, i: number): { ok: true; n: number } | Fail {
  const slot = shelves(farm)[i];
  if (!slot?.item) return { ok: false, why: 'That shelf is empty.' };
  if (slot.n === 0) { slot.item = null; return { ok: true, n: 0 }; }
  const k = Math.min(slot.n, roomLeft(farm));
  if (k <= 0 && slot.n > 0) return { ok: false, why: 'The barn is full.' };
  add(farm, slot.item, slot.stars, k);
  slot.n -= k;
  if (slot.n === 0) slot.item = null;
  return { ok: true, n: k };
}

export function setPrice(farm: Farm, i: number, price: number): boolean {
  const slot = shelves(farm)[i];
  if (!slot) return false;
  slot.price = Math.round(Math.min(PRICE_MAX, Math.max(PRICE_MIN, price)) * 10) / 10;
  return true;
}

export function setKeep(farm: Farm, i: number, keep: number): boolean {
  const slot = shelves(farm)[i];
  if (!slot) return false;
  slot.keep = Math.round(Math.min(SHELF_MAX, Math.max(0, keep)));
  return true;
}

export interface StandSale { item: string; n: number; coins: number }

/** Today's page of the stand's sales (made on first use). */
function today(farm: Farm): StandDay {
  const d = dayIndex(farm.t);
  let page = farm.stand.days.at(-1);
  if (!page || page.day !== d) {
    page = { day: d, sold: {} };
    farm.stand.days.push(page);
    if (farm.stand.days.length > DAYS_KEPT) farm.stand.days.splice(0, farm.stand.days.length - DAYS_KEPT);
  }
  return page;
}

/** Shoppers come by while you play. Returns what they bought. */
export function standTick(farm: Farm): StandSale[] {
  if (!standOpen(farm)) return [];
  const st = farm.stand;
  if (st.nextShopperAt === 0) st.nextShopperAt = farm.t + SHOPPER_EVERY;
  const out: StandSale[] = [];
  for (let guard = 0; guard < 8 && farm.t >= st.nextShopperAt; guard++) {
    st.nextShopperAt += SHOPPER_EVERY * (0.7 + roll(farm) * 0.6);
    const full = shelves(farm).filter(s => s.item && s.n > 0);
    if (!full.length) continue;
    const kinds = new Set(full.map(s => s.item)).size;
    const season = seasonOf(farm.t);
    for (const slot of full) {
      if (roll(farm) >= buyChance(slot.item!, season, slot.price, kinds)) continue;
      const n = Math.min(slot.n, roll(farm) < 0.35 ? 2 : 1);
      const each = shelfPrice(farm, slot);
      const coins = each * n;
      const item = slot.item!;
      slot.n -= n;
      earn(farm, coins, ITEMS[item]?.kind === 'crop' ? ITEMS[item]!.base ?? item : undefined);
      bump(farm, 'stand-sold', n);
      bump(farm, 'sold', n);
      const page = today(farm);
      const rec = (page.sold[item] ??= { n: 0, coins: 0, price: slot.price, left: 0 });
      rec.n += n; rec.coins += coins; rec.price = slot.price; rec.left = slot.n;
      // a sold-out shelf remembers what it held, so it can be topped up again
      out.push({ item, n, coins });
    }
    // a gentle catch-up after a long pause: never more than a few shoppers at once
    if (st.nextShopperAt < farm.t - SHOPPER_EVERY * 3) st.nextShopperAt = farm.t + SHOPPER_EVERY;
  }
  return out;
}

/** One plain tip about how the stand did on a day (or null if there's nothing to say). */
export function standTip(day: StandDay | undefined, kinds: number): string | null {
  if (!day) return null;
  const entries = Object.entries(day.sold);
  const fast = entries.find(([, r]) => r.left === 0 && r.n >= 4 && r.price <= 1.15);
  if (fast) return `${itemDef(fast[0]).name} sold out fast at “${priceWord(fast[1].price)}”. You could try a little higher.`;
  const slowPricey = entries.find(([, r]) => r.n <= 1 && r.price > 1.35);
  if (slowPricey) return `Only a few ${itemDef(slowPricey[0]).name} sold at “Pricey”. A lower price may help.`;
  if (kinds < 3) return 'A stand with more kinds of things gets more shoppers.';
  return null;
}

/** Helpers on Deliveries keep shelves topped up from the barn, to each shelf's "keep" level. */
export function restockTask(farm: Farm): number | null {
  if (!standOpen(farm)) return null;
  const s = shelves(farm);
  const i = s.findIndex(x => x.item && x.n < x.keep && count(farm, x.item, x.stars) > 0);
  return i >= 0 ? i : null;
}

export function restock(farm: Farm, i: number): { ok: true; n: number } | Fail {
  const slot = shelves(farm)[i];
  if (!slot?.item) return { ok: false, why: 'That shelf is empty.' };
  return stock(farm, i, slot.item, slot.stars, Math.max(0, slot.keep - slot.n));
}
