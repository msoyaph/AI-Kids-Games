import { STARTER_LOADOUT, STARTER_PARTS } from '../../data/parts';
import { createSave, defaultProfile, emptyStats, SAVE_VERSION, type SaveData } from './schema';

/**
 * Save migrations. Each step upgrades a save by exactly one version, so old saves from any
 * earlier version keep working. After migrating, `normalize` repairs anything missing or
 * broken (bad types, unknown values) so a damaged save can never crash the game.
 *
 * History:
 *   v1  first format: `look`, `parts`, `rocket`, no daily challenges or races.
 *   v2  `look` -> `profile`, `parts` -> `owned`, `rocket` -> `loadout`; added daily, races, decorPlaced.
 *   v3  added cargo, collected pickups, visited lists, tipsSeen, creditsSeen, rocket stickers,
 *       and difficulty moved into each save slot.
 */
type Raw = Record<string, unknown>;

const STEPS: Record<number, (s: Raw) => Raw> = {
  1: (s) => {
    const look = (s.look as Raw) ?? {};
    const out: Raw = { ...s, version: 2 };
    out.profile = { ...defaultProfile(), ...look, name: typeof s.name === 'string' ? s.name : look.name ?? 'Cadet' };
    out.owned = Array.isArray(s.parts) ? s.parts : [...STARTER_PARTS];
    out.loadout = { ...STARTER_LOADOUT, ...((s.rocket as Raw) ?? {}) };
    out.daily = { day: '', list: [] };
    out.races = {};
    out.decorPlaced = [];
    delete out.look;
    delete out.parts;
    delete out.rocket;
    delete out.name;
    return out;
  },
  2: (s) => {
    const out: Raw = { ...s, version: 3 };
    out.cargo = {};
    out.collected = [];
    out.visitedBodies = ['earth'];
    out.visitedSystems = ['earth'];
    out.tipsSeen = [];
    out.creditsSeen = false;
    out.difficulty = s.difficulty === 'normal' ? 'normal' : 'easy';
    const lo = (out.loadout as Raw) ?? {};
    out.loadout = { ...lo, stickers: Array.isArray(lo.stickers) ? lo.stickers : [] };
    return out;
  },
};

export function migrate(input: unknown): SaveData | null {
  if (!input || typeof input !== 'object') return null;
  let s = { ...(input as Raw) };
  let v = typeof s.version === 'number' ? s.version : 1;
  if (v > SAVE_VERSION) return normalize(s); // from a newer game version: keep what we understand
  while (v < SAVE_VERSION) {
    const step = STEPS[v];
    if (!step) return null;
    s = step(s);
    v = s.version as number;
  }
  return normalize(s);
}

const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((i) => typeof i === 'string');
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** Fill in anything missing with defaults and fix wrong types. */
export function normalize(raw: Raw): SaveData {
  const base = createSave(num(raw.slot, 0));
  const out = base as unknown as Raw;
  for (const key of Object.keys(base)) {
    const v = raw[key];
    const d = (base as unknown as Raw)[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(d)) out[key] = isStrArr(v) ? v : d;
    else if (typeof d === 'object' && d !== null) out[key] = typeof v === 'object' && !Array.isArray(v) ? { ...(d as Raw), ...(v as Raw) } : d;
    else if (typeof d === typeof v) out[key] = v;
  }
  const s = out as unknown as SaveData;
  s.version = SAVE_VERSION;
  s.coins = Math.max(0, Math.floor(num(s.coins, 0)));
  s.chapter = Math.max(1, Math.min(5, Math.floor(num(s.chapter, 1))));
  s.difficulty = s.difficulty === 'normal' ? 'normal' : 'easy';
  s.stats = { ...emptyStats(), ...s.stats };
  if (!isStrArr(s.stats.partsEquipped)) s.stats.partsEquipped = [];
  if (!isStrArr(s.stats.talkedTo)) s.stats.talkedTo = [];
  s.loadout = { ...STARTER_LOADOUT, ...s.loadout, stickers: isStrArr(s.loadout?.stickers) ? s.loadout.stickers.slice(0, 2) : [] };
  for (const id of STARTER_PARTS) if (!s.owned.includes(id)) s.owned.push(id);
  // Missions: keep only well-formed entries.
  const missions: SaveData['missions'] = {};
  for (const [id, m] of Object.entries(s.missions ?? {})) {
    if (!m || typeof m !== 'object') continue;
    const mm = m as unknown as Raw;
    missions[id] = {
      status: mm.status === 'done' ? 'done' : 'active',
      step: Math.max(0, Math.floor(num(mm.step, 0))),
      count: Math.max(0, num(mm.count, 0)),
      seen: isStrArr(mm.seen) ? mm.seen : [],
    };
  }
  s.missions = missions;
  if (typeof s.activeMission !== 'string' || !missions[s.activeMission]) s.activeMission = null;
  return s;
}
