/**
 * Shops: keeper, opening hours, stock and services. Stock functions read game state
 * (season, unlocks) so stock changes naturally. Prices come from tuning tables.
 */
import { CROPS } from './crops';
import { tryItem } from './items';
import { CROP_BALANCE, SAPLING_PRICES } from '../tuning';
import type { GameState } from '../sim/state';
import { seasonOf } from '../sim/state';

export interface ShopEntry {
  id: string;
  price: number;
  /** label override (services) */
  label?: string;
  desc?: string;
  /** service id handled by the shop system instead of adding an item */
  service?: string;
  /** daily stock limit */
  limit?: number;
  /** disabled reason (shown greyed) */
  locked?: string;
  /** extra materials needed */
  mats?: [string, number][];
}

export interface ShopDef {
  id: string;
  name: string;
  keeper: string;
  /** opening minute (from midnight) */
  open: number;
  close: number;
  /** weekday indices (0..4) when closed */
  closed: number[];
  room: string;
  greeting: string;
  /** what the shop will buy from you: item categories, or 'all' */
  buys: string[] | 'all';
  stock: (st: GameState) => ShopEntry[];
}

/** Later systems append stock (animals, upgrades, recipes…) here. */
export const EXTRA_STOCK: Record<string, ((st: GameState) => ShopEntry[])[]> = {};
export function addStock(shop: string, fn: (st: GameState) => ShopEntry[]): void {
  (EXTRA_STOCK[shop] ??= []).push(fn);
}

const has = (id: string) => !!tryItem(id);

export const SHOPS: Record<string, ShopDef> = {
  store: {
    id: 'store',
    name: "Thistle's General Store",
    keeper: 'pippa',
    open: 9 * 60,
    close: 18 * 60,
    closed: [4],
    room: 'store',
    greeting: "Welcome in! Seeds are fresh today!",
    buys: 'all',
    stock: (st) => {
      const season = seasonOf(st.day);
      const greenhouse = st.story.done.includes('crops');
      const out: ShopEntry[] = [];
      for (const c of CROPS) {
        if (!c.seasons.includes(season) && !greenhouse) continue;
        out.push({ id: `seed.${c.id}`, price: CROP_BALANCE[c.id].seed });
      }
      out.push({ id: 'flour', price: 50 }, { id: 'sugar', price: 50 }, { id: 'rice', price: 60 }, { id: 'oil', price: 120 });
      out.push({ id: 'basicFertilizer', price: 40 });
      out.push({ id: 'speedyGrow', price: 90 });
      for (const [id, p] of Object.entries(SAPLING_PRICES)) out.push({ id: `sapling.${id}`, price: p });
      const bag = st.player.inv.length;
      const items = out.filter((e) => has(e.id));
      if (bag < 30) items.push({ id: 'backpack', price: 2000, service: 'backpack', label: 'Bigger Bag (30 slots)', desc: 'Carry 6 more things!' });
      else if (bag < 36) items.push({ id: 'backpack', price: 8000, service: 'backpack', label: 'Huge Bag (36 slots)', desc: 'Carry 6 more things!' });
      return items;
    },
  },
  smithy: {
    id: 'smithy',
    name: 'Ironwood Smithy',
    keeper: 'grit',
    open: 9 * 60,
    close: 16 * 60 + 30,
    closed: [4],
    room: 'smithy',
    greeting: 'Need a tool sharpened? Or a geode cracked? I love cracking geodes.',
    buys: ['ore', 'bar', 'mineral', 'gem', 'resource', 'geode'],
    stock: () => [{ id: 'coal', price: 120 }].filter((e) => has(e.id)),
  },
  carpenter: {
    id: 'carpenter',
    name: "Pine's Carpentry",
    keeper: 'hollis',
    open: 9 * 60,
    close: 17 * 60,
    closed: [3],
    room: 'carpentry',
    greeting: "Howdy! Let's build something great.",
    buys: ['resource'],
    stock: () => [
      { id: 'wood', price: 10 },
      { id: 'stone', price: 20 },
      { id: 'hardwood', price: 60 },
      { id: 'clay', price: 30 },
    ],
  },
  ranch: {
    id: 'ranch',
    name: 'Brook Family Ranch',
    keeper: 'goldie',
    open: 9 * 60,
    close: 16 * 60,
    closed: [0],
    room: 'ranch',
    greeting: 'Hi there! Our animals say hello! Moo!',
    buys: ['animal', 'artisan'],
    stock: () => [],
  },
  fishshop: {
    id: 'fishshop',
    name: "Cap'n Wren's Bait & Tackle",
    keeper: 'wren',
    open: 9 * 60,
    close: 17 * 60,
    closed: [1],
    room: 'fishshop',
    greeting: 'Ahoy, sprout! The fish are bitin\' today. Probably.',
    buys: ['fish', 'crab', 'junk', 'bait'],
    stock: () => [],
  },
  cafe: {
    id: 'cafe',
    name: 'The Sunny Cup Café',
    keeper: 'sunny',
    open: 10 * 60,
    close: 22 * 60,
    closed: [],
    room: 'cafe',
    greeting: 'Hello, sunshine! Hungry? Everything is made fresh!',
    buys: ['food'],
    stock: () => [],
  },
};

SHOPS.cart = {
  id: 'cart',
  name: "Toby's Traveling Cart",
  keeper: 'toby',
  open: 10 * 60,
  close: 18 * 60,
  closed: [0, 1, 2],
  room: 'town',
  greeting: 'All aboard! Treasures from far-off towns, fresh off the Valley Train!',
  buys: [],
  stock: (st) => {
    const out: ShopEntry[] = [];
    const season = seasonOf(st.day);
    const other = CROPS.filter((c) => !c.seasons.includes(season));
    for (let k = 0; k < 3 && other.length; k++) {
      const c = other[(st.day * 7 + k * 13) % other.length];
      if (!out.some((e) => e.id === `seed.${c.id}`)) out.push({ id: `seed.${c.id}`, price: CROP_BALANCE[c.id].seed * 2, limit: 5 });
    }
    out.push({ id: 'battery', price: 800, limit: 1 });
    out.push({ id: 'cloth', price: 900, limit: 1 });
    out.push({ id: 'sapling.pear', price: 1500, limit: 1 });
    out.push({ id: 'goldBar', price: 1000, limit: 2 });
    return out.filter((e) => has(e.id));
  },
};

/** Which shop (if any) owns an interior room. */
export const SHOP_BY_ROOM: Record<string, string> = {};
for (const s of Object.values(SHOPS)) if (s.id !== 'cart') SHOP_BY_ROOM[s.room] = s.id;

/** Homes are open to visitors in the daytime. */
export const HOME_HOURS = { open: 8 * 60, close: 20 * 60 };
export const HOME_ROOMS = ['houseLumi', 'houseBasil', 'houseOakes', 'houseNana', 'houseToby'];
