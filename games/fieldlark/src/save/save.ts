/**
 * Saving the farm: one key (`<prefix>save`), versioned. `decodeFarm` never throws: it migrates
 * older versions step by step, then checks every field and falls back to a fresh value for anything
 * missing or broken, so a damaged save still loads. A save from a newer version of the game is
 * never overwritten (the game says so and plays from memory instead).
 */
import { CROP } from '../data/crops';
import { VARIETY } from '../data/varieties';
import { SOIL_MAX, SOIL_START } from '../sim/soil';
import type { Ribbon } from '../sim/state';
import { JOBS, MAX_HELPERS, type Helper } from '../sim/helpers';
import { HELPER_NAMES } from '../data/cast';
import { RECIPE } from '../data/production';
import { BUSINESS, type BusinessId } from '../data/businesses';
import type { Contract } from '../sim/contracts';
import { newStand, PRICE_MAX, PRICE_MIN, SHELF_MAX, type StandState } from '../sim/stand';
import { ITEMS } from '../data/items';
import { AREA_IDS, type AreaId } from '../sim/map';
import type { FieldObj, Obj, ObjKind } from '../sim/objects';
import { newFarm, type Farm, type LedgerSeason } from '../sim/state';
import type { Stack } from '../sim/inventory';
import type { Order } from '../sim/orders';
import type { Coop, NeighborState } from '../sim/neighbors';
import { NEIGHBOR } from '../data/cast';
import { read, write, writeJson } from './storage';

export const SAVE_KEY = 'save';
/** The ribbon wall keeps the newest ribbons (the counts keep them all). */
export const RIBBONS_KEPT = 48;
export const SAVE_VERSION = 1;

type Raw = Record<string, unknown>;

/** MIGRATIONS[v] turns a version-v save into a version v+1 save. */
export const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) => (isNum(v) ? Math.min(max, Math.max(min, v)) : d);
const int = (v: unknown, d: number, min = -Infinity, max = Infinity) => Math.round(num(v, d, min, max));
const KINDS: ObjKind[] = ['field', 'building', 'tree', 'decor', 'debris'];
const FAMILIES = new Set(Object.values(CROP).map(c => c.family));

function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') for (const [k, n] of Object.entries(v as Raw)) if (isNum(n) && n >= 0) out[k] = n;
  return out;
}

function decodeObj(v: unknown): Obj | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Raw;
  if (!isNum(r.id) || !KINDS.includes(r.kind as ObjKind) || typeof r.def !== 'string') return null;
  const base = { id: Math.round(r.id), kind: r.kind as ObjKind, def: r.def, x: int(r.x, 0, 0, 55), z: int(r.z, 0, 0, 55), rot: int(r.rot, 0, 0, 3) as 0 | 1 | 2 | 3 };
  if (base.kind === 'field') {
    const crop = typeof r.crop === 'string' && CROP[r.crop] ? r.crop : null;
    const f: FieldObj = {
      ...base, kind: 'field', crop,
      plantedAt: crop ? num(r.plantedAt, 0, 0) : 0, readyAt: crop ? num(r.readyAt, 0, 0) : 0,
      watered: r.watered === true, fertilized: r.fertilized === true, rotation: r.rotation === true, boost: r.boost === true, humus: r.humus === true,
      last: FAMILIES.has(r.last as never) ? (r.last as FieldObj['last']) : null,
      // before soil health, a legume's nitrogen was a yes/no
      nit: int(r.nit, r.legumeLeft === true ? 2 : SOIL_START.nit, 0, SOIL_MAX), hum: int(r.hum, SOIL_START.hum, 0, SOIL_MAX),
      restSince: crop ? null : num(r.restSince, 0, 0),
      variety: crop && typeof r.variety === 'string' && VARIETY[r.variety]?.crop === crop ? r.variety : null,
    };
    return f;
  }
  const o: Obj = { ...base, kind: base.kind as Exclude<ObjKind, 'field'> };
  if (r.data && typeof r.data === 'object') o.data = r.data as Record<string, unknown>;
  return o;
}

const isItemList = (v: unknown): v is { id: string; n: number }[] => Array.isArray(v) && v.length > 0 && v.every(x => !!x && typeof x === 'object' && !!ITEMS[(x as Raw).id as string] && isNum((x as Raw).n));

function decodeStand(v: unknown): StandState {
  const st = newStand();
  if (!v || typeof v !== 'object') return st;
  const r = v as Raw;
  if (Array.isArray(r.slots)) st.slots = r.slots.slice(0, 10).map(x => {
    const o = (x ?? {}) as Raw;
    const item = typeof o.item === 'string' && ITEMS[o.item]?.sellable ? o.item : null;
    return { item, stars: int(o.stars, 1, 1, 3) as 1 | 2 | 3, n: item ? int(o.n, 0, 0, SHELF_MAX) : 0, price: Math.round(num(o.price, 1, PRICE_MIN, PRICE_MAX) * 10) / 10, keep: int(o.keep, 6, 0, SHELF_MAX) };
  });
  st.nextShopperAt = num(r.nextShopperAt, 0, 0);
  if (Array.isArray(r.days)) st.days = r.days.filter((d): d is Raw => !!d && typeof d === 'object').slice(-4).map(d => ({
    day: int(d.day, 0, 0),
    sold: Object.fromEntries(Object.entries((d.sold ?? {}) as Raw).filter(([id, x]) => !!ITEMS[id] && !!x && typeof x === 'object').map(([id, x]) => {
      const o = x as Raw;
      return [id, { n: int(o.n, 0, 0), coins: int(o.coins, 0, 0), price: num(o.price, 1, PRICE_MIN, PRICE_MAX), left: int(o.left, 0, 0) }];
    })),
  }));
  return st;
}

function decodeContract(v: unknown): Contract | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Raw;
  if (typeof r.business !== 'string' || !(r.business in BUSINESS) || !isItemList(r.basket)) return null;
  const drops = int(r.drops, 3, 1, 9);
  return {
    business: r.business as BusinessId, basket: r.basket.map(x => ({ id: x.id, n: Math.max(1, Math.round(x.n)) })), drops,
    done: int(r.done, 0, 0, drops), sent: int(r.sent, 0, 0, drops), wantedAt: num(r.wantedAt, 0, 0),
    coinsPerDrop: int(r.coinsPerDrop, 0, 0), bonus: int(r.bonus, 0, 0), round: int(r.round, 0, 0),
  };
}

/** A farmhand: name by their place in the list, a known job, and fresh task timing (they look around again on load). */
function decodeHelper(r: Raw, i: number, t: number): Helper {
  const job = (JOBS as readonly string[]).includes(r.job as string) || r.job === 'rest' ? (r.job as Helper['job']) : 'rest';
  const done = (r.done ?? {}) as Raw;
  return {
    name: HELPER_NAMES[i]!, job,
    zone: r.zone === 'all' || AREA_IDS.includes(r.zone as AreaId) ? (r.zone as Helper['zone']) : 'all',
    homes: Array.isArray(r.homes) ? r.homes.filter(isNum).map(Math.round) : [],
    machine: isNum(r.machine) ? Math.round(r.machine) : null,
    recipe: typeof r.recipe === 'string' && RECIPE[r.recipe] ? r.recipe : null,
    done: Object.fromEntries(JOBS.map(j => [j, int(done[j], 0, 0)])) as Helper['done'],
    task: null, nextAt: t, x: num(r.x, 37, 0, 55), z: num(r.z, 40, 0, 55),
  };
}

/** `savedAt` is the real time of the save (ms), kept beside the farm for the "while you were away" bonus. */
function decodeOrder(v: unknown): Order | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Raw;
  if (!isNum(r.id) || typeof r.who !== 'string' || !Array.isArray(r.items)) return null;
  const items = r.items.filter((x): x is { id: string; n: number } => !!x && typeof x === 'object' && typeof (x as Raw).id === 'string' && !!ITEMS[(x as Raw).id as string] && isNum((x as Raw).n));
  if (!items.length) return null;
  return { id: r.id, who: r.who, items: items.map(x => ({ id: x.id, n: Math.max(1, Math.round(x.n)) })), coins: int(r.coins, 0, 0), xp: int(r.xp, 0, 0), ...(typeof r.story === 'string' ? { story: r.story } : {}), ...(typeof r.note === 'string' ? { note: r.note } : {}), ...(typeof r.contract === 'string' && r.contract in BUSINESS ? { contract: r.contract } : {}) };
}
const orderList = (v: unknown): Order[] => (Array.isArray(v) ? v.map(decodeOrder).filter((o): o is Order => !!o) : []);

export type DecodeResult = { farm: Farm; status: 'ok' | 'new' | 'repaired' | 'future'; savedAt: number | null };

export function decodeFarm(input: unknown): DecodeResult {
  if (!input || typeof input !== 'object') return { farm: newFarm(1), status: 'new', savedAt: null };
  let raw = { ...(input as Raw) };
  const version = int(raw.v, 1, 1);
  if (version > SAVE_VERSION) return { farm: newFarm(int(raw.seed, 1)), status: 'future', savedAt: null };
  for (let v = version; v < SAVE_VERSION; v++) raw = MIGRATIONS[v]!(raw);
  const fresh = newFarm(int(raw.seed, 1, 0));
  let repaired = false;
  const take = <T>(value: T, ok: boolean, fallback: T): T => { if (!ok) repaired = true; return ok ? value : fallback; };
  const cam = (raw.cam ?? {}) as Raw;
  const unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.filter((a): a is AreaId => AREA_IDS.includes(a as AreaId)) : [];
  if (!unlocked.includes('home')) unlocked.unshift('home');
  const flags = numRecord(raw.flags);
  // objects: keep every valid one; a save without objects (very old or damaged) gets the starting farm
  let objects: Obj[] = fresh.objects;
  if (Array.isArray(raw.objects)) {
    const seen = new Set<number>();
    objects = [];
    for (const v of raw.objects) {
      const o = decodeObj(v);
      if (!o || seen.has(o.id)) { repaired = true; continue; }
      seen.add(o.id);
      objects.push(o);
    }
  } else repaired = true;
  const inv: Record<string, Stack> = {};
  if (raw.inv && typeof raw.inv === 'object') {
    for (const [id, s] of Object.entries(raw.inv as Raw)) {
      if (!ITEMS[id] || !Array.isArray(s) || s.length !== 3) { repaired = true; continue; }
      const stack = s.map(n => int(n, 0, 0)) as Stack;
      if (stack[0] + stack[1] + stack[2] > 0) inv[id] = stack;
    }
  }
  const ledger: LedgerSeason[] = Array.isArray(raw.ledger)
    ? raw.ledger.filter((p): p is Raw => !!p && typeof p === 'object').map(p => ({
      season: int(p.season, 0, 0), grown: numRecord(p.grown), made: numRecord(p.made), earned: num(p.earned, 0, 0), spent: num(p.spent, 0, 0),
      cropEarned: numRecord(p.cropEarned), cropSpent: numRecord(p.cropSpent),
    })).slice(-8)
    : [];
  const farm: Farm = {
    v: SAVE_VERSION,
    seed: fresh.seed,
    rng: take(int(raw.rng, fresh.rng, 0, 0xffffffff), isNum(raw.rng), fresh.rng),
    t: take(num(raw.t, fresh.t, 0), isNum(raw.t) && raw.t >= 0, fresh.t),
    coins: take(int(raw.coins, fresh.coins, 0), isNum(raw.coins) && raw.coins >= 0, fresh.coins),
    xp: take(int(raw.xp, 0, 0), isNum(raw.xp) && raw.xp >= 0, 0),
    unlocked: [...new Set(unlocked)],
    cam: {
      x: num(cam.x, fresh.cam.x, 0, 56),
      z: num(cam.z, fresh.cam.z, 0, 56),
      yawStep: int(cam.yawStep, 0, 0, 7),
      zoom: num(cam.zoom, fresh.cam.zoom, 0, 240), // 0: not set yet (the game frames the farm)
    },
    flags,
    objects,
    nextId: Math.max(int(raw.nextId, 1, 1), ...objects.map(o => o.id + 1)),
    inv,
    barnLevel: int(raw.barnLevel, 0, 0, 4),
    scraps: int(raw.scraps, 0, 0),
    compostUntil: isNum(raw.compostUntil) ? raw.compostUntil : null,
    freeSeeds: int(raw.freeSeeds, 0, 0, 99),
    ledger,
    paths: typeof raw.paths === 'string' && raw.paths.length === 56 * 56 && /^[0-3]*$/.test(raw.paths) ? raw.paths : take(fresh.paths, raw.paths === undefined, fresh.paths),
    storage: numRecord(raw.storage),
    orders: orderList(raw.orders).slice(0, 6),
    nextOrderAt: isNum(raw.nextOrderAt) ? raw.nextOrderAt : null,
    orderSeq: int(raw.orderSeq, 0, 0),
    boat: (() => {
      const b = (raw.boat ?? {}) as Raw;
      return { crates: orderList(b.crates), cargo: orderList(b.cargo), backAt: isNum(b.backAt) ? b.backAt : null, trips: int(b.trips, 0, 0) };
    })(),
    neighbors: (() => {
      const out: Record<string, NeighborState> = {};
      if (raw.neighbors && typeof raw.neighbors === 'object') for (const [k, v] of Object.entries(raw.neighbors as Raw)) {
        if (!NEIGHBOR[k] || !v || typeof v !== 'object') continue;
        const n = v as Raw;
        out[k] = { hearts: num(n.hearts, 0, 0, 5), tradedDay: int(n.tradedDay, -1), visits: int(n.visits, 0, 0) };
      }
      return out;
    })(),
    stats: numRecord(raw.stats),
    story: (() => {
      const st = (raw.story ?? {}) as Raw;
      const endless = Array.isArray(st.endless) ? st.endless.filter((g): g is Raw => !!g && typeof g === 'object' && typeof (g as Raw).key === 'string').map(g => ({
        id: String(g.id), text: String(g.text), key: String(g.key), n: int(g.n, 1, 1), base: num(g.base, 0, 0), coins: int(g.coins, 0, 0),
      })) : [];
      return { chapter: int(st.chapter, 0, 0, 8), base: numRecord(st.base), introSeen: st.introSeen === true, creditsSeen: st.creditsSeen === true, endless, endlessDone: int(st.endlessDone, 0, 0) };
    })(),
    discovered: Array.isArray(raw.discovered) ? [...new Set(raw.discovered.filter((id): id is string => typeof id === 'string' && !!VARIETY[id] && !VARIETY[id]!.heirloom))] : [],
    ideas: int(raw.ideas, 0, 0),
    ribbons: Array.isArray(raw.ribbons) ? raw.ribbons.filter((r): r is Raw => !!r && typeof r === 'object').map(r => ({
      season: int(r.season, 0, 0), cat: String(r.cat), place: int(r.place, 4, 1, 4) as Ribbon['place'], ...(r.grand === true ? { grand: true } : {}),
    })).slice(-RIBBONS_KEPT) : [],
    ribbonCount: Array.isArray(raw.ribbonCount) && raw.ribbonCount.length === 4 ? raw.ribbonCount.map(n => int(n, 0, 0)) as Farm['ribbonCount'] : [0, 0, 0, 0],
    stand: decodeStand(raw.stand),
    contracts: Array.isArray(raw.contracts) ? raw.contracts.map(decodeContract).filter((c): c is Contract => !!c).filter((c, i, all) => all.findIndex(x => x.business === c.business) === i) : [],
    helpers: Array.isArray(raw.helpers) ? raw.helpers.filter((x): x is Raw => !!x && typeof x === 'object').slice(0, MAX_HELPERS).map((x, i) => decodeHelper(x, i, num(raw.t, 0, 0))) : [],
    coop: (() => {
      const c = raw.coop as Raw | null | undefined;
      if (!c || typeof c !== 'object' || !NEIGHBOR[c.neighbor as string] || !ITEMS[c.item as string]) return null;
      return { neighbor: c.neighbor as string, item: c.item as string, need: int(c.need, 1, 1), mine: int(c.mine, 0, 0), theirs: int(c.theirs, 0, 0), coins: int(c.coins, 0, 0), startedAt: num(c.startedAt, 0, 0) } satisfies Coop;
    })(),
  };
  return { farm, status: repaired ? 'repaired' : 'ok', savedAt: isNum(raw.savedAt) ? raw.savedAt : null };
}

export const encodeFarm = (farm: Farm, savedAt?: number) => ({ ...farm, v: SAVE_VERSION, ...(savedAt !== undefined ? { savedAt } : {}) });

/** Loads the saved farm, or null when there is none. */
/**
 * Load the saved farm (null: no save yet). A save that can't be read at all is never overwritten:
 * it is first copied aside to `<prefix>save.broken`, and if even that fails the game plays from
 * memory without saving ('broken').
 */
export function loadFarm(): DecodeResult | { status: 'broken'; kept: boolean } | null {
  const text = read(SAVE_KEY);
  if (!text) return null;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch {
    const kept = read(BROKEN_KEY) === text || write(BROKEN_KEY, text);
    return { status: 'broken', kept };
  }
  return decodeFarm(raw);
}

/** Where an unreadable save is kept, untouched. */
export const BROKEN_KEY = 'save.broken';

/**
 * Write the save. Returns false when the browser refused (for example, its storage is full): the
 * previous save is then still there, whole (a storage write either happens completely or not at all).
 */
export const saveFarm = (farm: Farm, savedAt?: number) => writeJson(SAVE_KEY, encodeFarm(farm, savedAt));
