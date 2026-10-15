/**
 * The save format: a town written small, so three towns, a backup and a kept broken copy fit well
 * under the site's storage budget (a maximum town is about 22 KB; the cap is CAP).
 *
 * - The map: one character a tile (a road and its bike or tram lane, or a lot's zone and finish),
 *   run-length coded ("A6400" is 6,400 empty tiles).
 * - Buildings: 6 characters each (def, x, z, turn, look, level, and the coins waiting as 0–63
 *   sixty-fourths of a full bubble). Decorations: 4 characters each. Defs are named once, in word
 *   lists in the save (one for buildings, one for decorations), so new things can be added to the
 *   game without breaking old saves.
 * - Bus routes point at stops by their place in the list.
 * - Everything else is plain JSON.
 *
 * `decodeTown` never throws: a damaged field falls back to a fresh value, unknown things are left
 * out, and a save from a newer version of the game is reported as such (and never overwritten).
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { isBuildingDef, THING } from '../data/things';
import { TUNING } from '../data/tuning';
import { AREAS, H, W, type AreaId } from '../sim/map';
import { emptyTown, SAVE_VERSION, type DayRecord, type Route, type Thing, type Town } from '../sim/state';
import { bubbleSize } from '../sim/payouts';

/** A save above this many characters is refused (the last good save stays). */
export const CAP = 28 * 1024;
/** The sim never lets a town grow past these (sim/world.ts atCap). */
export const MAX_BUILDINGS = TUNING.caps.buildings;
export const MAX_DECOR = TUNING.caps.decor;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const enc = (n: number, chars: number) => { let s = ''; for (let i = chars - 1; i >= 0; i--) s += B64[(n >> (6 * i)) & 63]; return s; };
const dec = (s: string, at: number, chars: number) => { let n = 0; for (let i = 0; i < chars; i++) { const v = B64.indexOf(s[at + i] ?? 'A'); n = n * 64 + (v < 0 ? 0 : v); } return n; };

// --- the map: one value a tile ---
/** 0 empty; 1–4 a road (+ its lanes: bike 1, tram 2); 5–29 a lot: 5 + zone × 5 + finish. */
function tileValue(t: Town, i: number): number {
  if (t.roads[i]) return 1 + (t.rflags[i]! & 3);
  const zone = t.zones[i]!, finish = t.finish[i]!;
  return zone || finish ? 5 + zone * 5 + finish : 0;
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';

export function encodeMap(t: Town): string {
  let out = '';
  const n = W * H;
  for (let i = 0; i < n;) {
    const v = tileValue(t, i);
    let run = 1;
    while (i + run < n && tileValue(t, i + run) === v) run++;
    out += LETTERS[v]! + (run > 1 ? String(run) : '');
    i += run;
  }
  return out;
}

export function decodeMap(t: Town, s: string) {
  let i = 0;
  const n = W * H;
  for (let k = 0; k < s.length && i < n;) {
    const v = LETTERS.indexOf(s[k]!);
    k++;
    let digits = '';
    while (k < s.length && s[k]! >= '0' && s[k]! <= '9') digits += s[k++];
    const run = Math.min(n - i, digits ? Math.max(1, parseInt(digits, 10)) : 1);
    for (let j = 0; j < run; j++, i++) {
      if (v >= 1 && v <= 4) { t.roads[i] = 1; t.rflags[i] = v - 1; }
      else if (v >= 5 && v <= 29) { const z = Math.floor((v - 5) / 5), f = (v - 5) % 5; t.zones[i] = z <= 4 ? z : 0; t.finish[i] = f; }
    }
  }
}

// --- things ---
const isBuilding = isBuildingDef;

interface Packed {
  v: number; seed: number; rng: number; t: number; mode: 's' | 'c'; name: string; coins: number;
  map: string; wb: string[]; wd: string[]; b: string; d: string; routes: [number[], number][];
  unlocked: string[]; story: Town['story']; stats: Record<string, number>; history: number[][]; flags: Record<string, number>;
  cam: [number, number, number, number];
  /** A short summary for the title screen's slot cards (read without decoding the town). */
  sum: { name: string; mode: 's' | 'c'; chapter: number; pop: number; t: number };
}

export function encodeTown(t: Town, pop = 0): string {
  const wb: string[] = [], wd: string[] = [];
  const word = (list: string[], def: string) => { let i = list.indexOf(def); if (i < 0) { i = list.length; list.push(def); } return i; };
  const order = new Map<number, number>();
  let b = '', d = '';
  const things = t.things.filter(x => THING[x.def]);
  // buildings first (their place in the list is what bus routes point at), then decorations
  const buildings = things.filter(x => isBuilding(x.def)).slice(0, MAX_BUILDINGS);
  const decor = things.filter(x => !isBuilding(x.def)).slice(0, MAX_DECOR);
  buildings.forEach((x, i) => {
    order.set(x.id, i);
    const full = bubbleSize(x);
    const pay = full > 0 ? Math.min(63, Math.round((x.pay / full) * 63)) : 0;
    // def 6 bits, x 7, z 7, rot 2, look 3, level 2 (27 bits → 5 characters), then the bubble
    const bits = (word(wb, x.def) & 63) * 2 ** 21 + (x.x & 127) * 2 ** 14 + (x.z & 127) * 2 ** 7 + (x.rot & 3) * 32 + (x.look & 7) * 4 + ((x.level - 1) & 3);
    b += enc(Math.floor(bits / 2 ** 15), 2) + enc(bits % 2 ** 15 >> 3, 2) + enc((bits & 7) | (x.solar ? 8 : 0), 1) + B64[pay];
  });
  decor.forEach(x => {
    // def 5 bits (+32 for the second word page), x 7, z 7, rot 2, look 3 → 24 bits, 4 characters
    const w = word(wd, x.def);
    const bits = ((w & 31) << 19) | ((x.x & 127) << 12) | ((x.z & 127) << 5) | ((x.rot & 3) << 3) | (x.look & 7);
    d += (w >= 32 ? '~' : '') + enc(bits, 4);
  });
  const p: Packed = {
    v: SAVE_VERSION, seed: t.seed, rng: t.rng >>> 0, t: Math.round(t.t * 10) / 10, mode: t.mode === 'creative' ? 'c' : 's', name: t.name, coins: Math.round(t.coins),
    map: encodeMap(t), wb, wd, b, d,
    routes: t.routes.map(r => [r.stops.map(id => order.get(id) ?? -1).filter(i => i >= 0), r.color]),
    unlocked: [...t.unlocked], story: t.story, stats: t.stats,
    history: t.history.slice(-12).map(h => [h.day, h.income, h.upkeep, h.coins, h.pop, h.happy]),
    flags: t.flags, cam: [Math.round(t.cam.x * 10) / 10, Math.round(t.cam.z * 10) / 10, t.cam.yawStep, Math.round(t.cam.zoom)],
    sum: { name: t.name, mode: t.mode === 'creative' ? 'c' : 's', chapter: t.story.chapter, pop, t: Math.round(t.t) },
  };
  return JSON.stringify(p);
}

export type DecodeResult = { town: Town; status: 'ok' | 'repaired' | 'future' | 'broken' };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) => (isNum(v) ? Math.min(max, Math.max(min, v)) : d);
const int = (v: unknown, d: number, min = -Infinity, max = Infinity) => Math.round(num(v, d, min, max));
const numRecord = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') for (const [k, n] of Object.entries(v as Record<string, unknown>)) if (isNum(n)) out[k] = n;
  return out;
};

/** Unpack a save (the text from storage). Never throws. */
export function decodeTown(text: string | null): DecodeResult {
  let raw: Partial<Packed>;
  try { raw = JSON.parse(text ?? '') as Partial<Packed>; } catch { return { town: emptyTown(1), status: 'broken' }; }
  if (!raw || typeof raw !== 'object' || typeof raw.map !== 'string') return { town: emptyTown(1), status: 'broken' };
  const version = int(raw.v, 1, 1);
  if (version > SAVE_VERSION) return { town: emptyTown(int(raw.seed, 1)), status: 'future' };
  let repaired = false;
  const t = emptyTown(int(raw.seed, 1, 0, 2 ** 31));
  t.rng = int(raw.rng, t.seed, 0, 2 ** 32 - 1);
  t.t = num(raw.t, 0, 0);
  t.mode = raw.mode === 'c' ? 'creative' : 'story';
  t.name = typeof raw.name === 'string' && raw.name.length <= 24 ? raw.name : 'Breezeport';
  t.coins = int(raw.coins, 0, 0, 1e9);
  try { decodeMap(t, raw.map); } catch { repaired = true; }
  const words = (list: unknown) => (Array.isArray(list) ? list.map(w => (typeof w === 'string' ? w : '')) : []);
  const wb = words(raw.wb), wd = words(raw.wd);
  const ids: number[] = [];
  const b = typeof raw.b === 'string' ? raw.b : '';
  for (let k = 0; k + 6 <= b.length; k += 6) {
    const low = dec(b, k + 4, 1);
    const bits = dec(b, k, 2) * 2 ** 15 + dec(b, k + 2, 2) * 8 + (low & 7);
    const def = wb[Math.floor(bits / 2 ** 21) & 63] ?? '';
    const x = Math.floor(bits / 2 ** 14) & 127, z = Math.floor(bits / 2 ** 7) & 127;
    const thing: Thing = { id: t.nextId++, def, x, z, rot: ((bits >> 5) & 3) as Thing['rot'], look: (bits >> 2) & 7, level: (bits & 3) + 1, pay: 0, born: 0, ...(low & 8 ? { solar: true } : {}) };
    ids.push(thing.id);
    if (!THING[def] || x >= W || z >= H) { repaired = true; continue; }
    thing.pay = (B64.indexOf(b[k + 5] ?? 'A') / 63) * bubbleSize(thing);
    t.things.push(thing);
  }
  const d = typeof raw.d === 'string' ? raw.d : '';
  for (let k = 0; k < d.length;) {
    const page = d[k] === '~' ? 32 : 0;
    if (page) k++;
    if (k + 4 > d.length) break;
    const bits = dec(d, k, 4);
    k += 4;
    const def = wd[((bits >> 19) & 31) + page] ?? '';
    const x = (bits >> 12) & 127, z = (bits >> 5) & 127;
    if (!THING[def] || x >= W || z >= H) { repaired = true; continue; }
    t.things.push({ id: t.nextId++, def, x, z, rot: ((bits >> 3) & 3) as Thing['rot'], look: bits & 7, level: 1, pay: 0, born: 0 });
  }
  if (Array.isArray(raw.routes)) t.routes = raw.routes.slice(0, 12).map((r, i): Route => {
    const stops = Array.isArray(r?.[0]) ? r[0].filter(isNum).map(n => ids[n]).filter((id): id is number => id !== undefined && t.things.some(x => x.id === id)) : [];
    return { id: i + 1, stops, color: int(r?.[1], 0x2fa3b0, 0, 0xffffff) };
  }).filter(r => r.stops.length >= 2);
  const known = new Set(AREAS.map(a => a.id));
  t.unlocked = Array.isArray(raw.unlocked) ? (raw.unlocked.filter(a => known.has(a as AreaId)) as AreaId[]) : ['harbor'];
  if (!t.unlocked.includes('harbor')) t.unlocked.unshift('harbor');
  const st = raw.story;
  t.story = {
    chapter: int(st?.chapter, 0, 0, 99),
    done: Array.isArray(st?.done) ? st!.done.filter((x): x is string => typeof x === 'string').slice(0, 400) : [],
    creditsSeen: st?.creditsSeen === true,
  };
  t.stats = numRecord(raw.stats);
  t.flags = numRecord(raw.flags);
  t.history = Array.isArray(raw.history) ? raw.history.filter(Array.isArray).slice(-12).map((h): DayRecord => ({ day: int(h[0], 0, 0), income: int(h[1], 0), upkeep: int(h[2], 0), coins: int(h[3], 0), pop: int(h[4], 0, 0), happy: int(h[5], 0, 0, 100) })) : [];
  const cam = Array.isArray(raw.cam) ? raw.cam : [];
  t.cam = { x: num(cam[0], 40, 0, W), z: num(cam[1], 14, 0, H), yawStep: int(cam[2], 0, 0, 7), zoom: num(cam[3], 0, 0, 240) };
  t.version = 1;
  return { town: t, status: repaired ? 'repaired' : 'ok' };
}

/** The slot card's summary, read without decoding the whole town. */
export function readSummary(text: string | null): Packed['sum'] | null {
  try { const p = JSON.parse(text ?? '') as Partial<Packed>; return p && p.sum && typeof p.sum.name === 'string' ? p.sum : null; } catch { return null; }
}
