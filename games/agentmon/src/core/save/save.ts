/**
 * Save format, versions and migrations.
 *
 * A save is JSON with packed creatures (see codec.ts). `v` is the format version. Old versions are
 * upgraded step by step by MIGRATIONS; a save from a newer game version is never overwritten.
 * Every field is checked on load and repaired to a safe default, so a damaged save still loads.
 *
 * Until the first release, version 1 may still change shape (no saves exist outside development);
 * from release on, any change bumps SAVE_VERSION and adds a migration with a test.
 */
import { BASE_MAX, TEAM_MAX, type GameState, type Look } from '../state';
import { DIFFICULTIES, type Difficulty } from '../types';
import { packCreature, unpackCreature, type CodecTables } from './codec';

export const SAVE_VERSION = 1;
/** Our own budget per slot (the brief allows 300 KB; we aim far lower). */
export const SLOT_BUDGET = 64 * 1024;

export interface SaveData {
  v: number;
  slot: number;
  createdAt: number;
  playMs: number;
  name: number;
  look: Look;
  map: string;
  x: number;
  y: number;
  dir: number;
  rest: { map: string; x: number; y: number };
  difficulty: Difficulty;
  coins: number;
  team: string[];
  base: string[];
  nextUid: number;
  bag: Record<string, number>;
  flags: string[];
  vars: Record<string, number>;
  guide: { seen: number[]; friends: number[]; stars: Record<string, number>; shimmer: number[] };
  quests: Record<string, number>;
  tutorials: string[];
  tower: { best: number; bestTurns: number };
  stats: { battles: number; wins: number; befriends: number; steps: number; puzzles: number };
  rng: number;
  starter: string;
}

/** Summary shown on the save-slot screen without loading the whole save. */
export interface SlotSummary {
  name: number;
  playMs: number;
  beacons: number;
  friends: number;
  map: string;
  team: string[];
}

export function toSave(t: CodecTables, s: GameState): SaveData {
  return {
    v: SAVE_VERSION,
    slot: s.slot,
    createdAt: s.createdAt,
    playMs: Math.round(s.playMs),
    name: s.name,
    look: { ...s.look },
    map: s.map,
    x: s.x,
    y: s.y,
    dir: s.dir,
    rest: { ...s.rest },
    difficulty: s.difficulty,
    coins: s.coins,
    team: s.team.map(c => packCreature(t, c)),
    base: s.base.map(c => packCreature(t, c)),
    nextUid: s.nextUid,
    bag: { ...s.bag },
    flags: [...s.flags].sort(),
    vars: { ...s.vars },
    guide: {
      seen: [...s.guide.seen].sort((a, b) => a - b),
      friends: [...s.guide.friends].sort((a, b) => a - b),
      stars: Object.fromEntries(Object.entries(s.guide.stars).filter(([, v]) => v > 0)),
      shimmer: [...s.guide.shimmer].sort((a, b) => a - b),
    },
    quests: { ...s.quests },
    tutorials: [...s.tutorials].sort(),
    tower: { ...s.tower },
    stats: { ...s.stats },
    rng: s.rng >>> 0,
    starter: s.starter,
  };
}

const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const numList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isInteger(x)) : []);
const numRecord = (v: unknown) => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  return out;
};

export interface LoadResult {
  state: GameState;
  /** Creatures that could not be read (kept out; reported, never silently dropped in tests). */
  lost: number;
  migratedFrom?: number;
}

/**
 * Upgrades from older versions, one step at a time: MIGRATIONS[n] turns a version-n save into a
 * version-(n+1) save. Version 0 is a save without a `v` (none exist in the wild; it proves the chain).
 */
export const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: raw => ({ ...raw, v: 1 }),
};

export type MigrateResult = { ok: true; raw: Record<string, unknown>; from: number } | { ok: false; reason: 'newer' | 'unreadable' };

export function migrate(input: unknown, migrations = MIGRATIONS, current = SAVE_VERSION): MigrateResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'unreadable' };
  let raw = input as Record<string, unknown>;
  const from = typeof raw.v === 'number' ? raw.v : 0;
  if (!Number.isInteger(from) || from < 0) return { ok: false, reason: 'unreadable' };
  if (from > current) return { ok: false, reason: 'newer' };
  for (let v = from; v < current; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, reason: 'unreadable' };
    raw = step(raw);
  }
  return { ok: true, raw, from };
}

/** Builds a game state from a (migrated) save, repairing anything missing or out of range. */
export function fromSave(t: CodecTables, raw: Record<string, unknown>, slot: number): LoadResult {
  let lost = 0;
  const creatures = (list: unknown, max: number) => {
    const out = [];
    for (const text of strList(list).slice(0, max)) {
      const c = unpackCreature(t, text);
      if (c) out.push(c);
      else lost++;
    }
    return out;
  };
  const look = (raw.look ?? {}) as Record<string, unknown>;
  const rest = (raw.rest ?? {}) as Record<string, unknown>;
  const guide = (raw.guide ?? {}) as Record<string, unknown>;
  const tower = (raw.tower ?? {}) as Record<string, unknown>;
  const stats = (raw.stats ?? {}) as Record<string, unknown>;
  const map = str(raw.map, '');
  const state: GameState = {
    slot,
    createdAt: num(raw.createdAt, 0),
    playMs: num(raw.playMs, 0, 0),
    name: num(raw.name, 0, 0, 4095),
    look: { skin: num(look.skin, 0, 0, 15), hair: num(look.hair, 0, 0, 15), hairColor: num(look.hairColor, 0, 0, 15), outfit: num(look.outfit, 0, 0, 15) },
    map,
    x: num(raw.x, 0, 0, 1023),
    y: num(raw.y, 0, 0, 1023),
    dir: num(raw.dir, 0, 0, 3) as 0 | 1 | 2 | 3,
    rest: { map: str(rest.map, map), x: num(rest.x, 0, 0, 1023), y: num(rest.y, 0, 0, 1023) },
    difficulty: DIFFICULTIES.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : 'normal',
    coins: num(raw.coins, 0, 0, 999_999),
    team: creatures(raw.team, TEAM_MAX),
    base: creatures(raw.base, BASE_MAX),
    nextUid: num(raw.nextUid, 1, 1, 65_535),
    bag: Object.fromEntries(Object.entries(numRecord(raw.bag)).map(([k, v]) => [k, Math.max(0, Math.min(999, Math.floor(v)))]).filter(([, v]) => (v as number) > 0)),
    flags: new Set(strList(raw.flags)),
    vars: numRecord(raw.vars),
    guide: {
      seen: new Set(numList(guide.seen)),
      friends: new Set(numList(guide.friends)),
      stars: Object.fromEntries(Object.entries(numRecord(guide.stars)).map(([k, v]) => [Number(k), Math.max(0, Math.min(3, Math.floor(v)))])),
      shimmer: new Set(numList(guide.shimmer)),
    },
    quests: numRecord(raw.quests),
    tutorials: new Set(strList(raw.tutorials)),
    tower: { best: num(tower.best, 0, 0), bestTurns: num(tower.bestTurns, 0, 0) },
    stats: {
      battles: num(stats.battles, 0, 0), wins: num(stats.wins, 0, 0), befriends: num(stats.befriends, 0, 0),
      steps: num(stats.steps, 0, 0), puzzles: num(stats.puzzles, 0, 0),
    },
    rng: num(raw.rng, 1, 0, 0xffffffff) >>> 0,
    starter: str(raw.starter, ''),
  };
  // Unique ids must stay unique.
  const maxUid = Math.max(0, ...state.team.map(c => c.uid), ...state.base.map(c => c.uid));
  if (state.nextUid <= maxUid) state.nextUid = maxUid + 1;
  return { state, lost };
}

export const serialize = (t: CodecTables, s: GameState) => JSON.stringify(toSave(t, s));

export function deserialize(t: CodecTables, text: string, slot: number): (LoadResult & { ok: true }) | { ok: false; reason: 'newer' | 'unreadable' } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'unreadable' }; }
  const m = migrate(parsed);
  if (!m.ok) return m;
  const result = fromSave(t, m.raw, slot);
  return { ok: true, ...result, ...(m.from !== SAVE_VERSION ? { migratedFrom: m.from } : {}) };
}

export function summarize(s: GameState, beaconFlags: readonly string[]): SlotSummary {
  return {
    name: s.name,
    playMs: s.playMs,
    beacons: beaconFlags.filter(f => s.flags.has(f)).length,
    friends: s.guide.friends.size,
    map: s.map,
    team: s.team.map(c => c.species),
  };
}
