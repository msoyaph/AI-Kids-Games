/**
 * Saving the farm: one key (`<prefix>save`), versioned. `decodeFarm` never throws: it migrates
 * older versions step by step, then checks every field and falls back to a fresh value for anything
 * missing or broken, so a damaged save still loads. A save from a newer version of the game is
 * never overwritten (the game says so and plays from memory instead).
 */
import { CROP } from '../data/crops';
import { ITEMS } from '../data/items';
import { AREA_IDS, type AreaId } from '../sim/map';
import type { FieldObj, Obj, ObjKind } from '../sim/objects';
import { newFarm, type Farm, type LedgerSeason } from '../sim/state';
import type { Stack } from '../sim/inventory';
import type { Order } from '../sim/orders';
import type { Coop, NeighborState } from '../sim/neighbors';
import { NEIGHBOR } from '../data/cast';
import { readJson, writeJson } from './storage';

export const SAVE_KEY = 'save';
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
      watered: r.watered === true, fertilized: r.fertilized === true, rotation: r.rotation === true, boost: r.boost === true,
      last: FAMILIES.has(r.last as never) ? (r.last as FieldObj['last']) : null, legumeLeft: r.legumeLeft === true,
    };
    return f;
  }
  const o: Obj = { ...base, kind: base.kind as Exclude<ObjKind, 'field'> };
  if (r.data && typeof r.data === 'object') o.data = r.data as Record<string, unknown>;
  return o;
}

/** `savedAt` is the real time of the save (ms), kept beside the farm for the "while you were away" bonus. */
function decodeOrder(v: unknown): Order | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Raw;
  if (!isNum(r.id) || typeof r.who !== 'string' || !Array.isArray(r.items)) return null;
  const items = r.items.filter((x): x is { id: string; n: number } => !!x && typeof x === 'object' && typeof (x as Raw).id === 'string' && !!ITEMS[(x as Raw).id as string] && isNum((x as Raw).n));
  if (!items.length) return null;
  return { id: r.id, who: r.who, items: items.map(x => ({ id: x.id, n: Math.max(1, Math.round(x.n)) })), coins: int(r.coins, 0, 0), xp: int(r.xp, 0, 0), ...(typeof r.story === 'string' ? { story: r.story } : {}), ...(typeof r.note === 'string' ? { note: r.note } : {}) };
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
      zoom: num(cam.zoom, fresh.cam.zoom, 8, 96),
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
export function loadFarm(): DecodeResult | null {
  const raw = readJson<unknown>(SAVE_KEY);
  return raw === null ? null : decodeFarm(raw);
}

export const saveFarm = (farm: Farm, savedAt?: number) => writeJson(SAVE_KEY, encodeFarm(farm, savedAt));
