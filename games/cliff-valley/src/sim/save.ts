/**
 * Save system: versioned JSON with migrations, 3 slots, compact location encoding
 * (RLE soil + tokenised simple objects). Writes are atomic per key; on quota errors
 * the old save is untouched and the caller shows a friendly message.
 */
import { read, remove, write, type WriteResult } from '../core/storage';
import { TUNING } from '../tuning';
import { createState } from './newgame';
import { Sim, serializeLoc, type SavedLoc } from './sim';
import type { GameState } from './state';
import type { WorldObject } from './types';

export const SAVE_VERSION = 2;
export const SLOTS = 3;

export interface SaveMeta {
  v: number;
  name: string;
  farm: string;
  day: number;
  coins: number;
  playSec: number;
  savedAt: number;
  suspended: boolean;
  /** finale seen (shows a star in the slot list) */
  done: boolean;
}

export interface SaveFile {
  v: number;
  meta: SaveMeta;
  state: GameState;
  locs: Record<string, CompactLoc>;
}

interface CompactLoc {
  soil?: string;
  /** simple objects as tokens: base36 index (lowercase) + uppercase kind marker + data */
  s?: string;
  /** complex objects */
  o?: [number, WorldObject][];
}

// ── Compact object tokens ───────────────────────────────────
const TREE_IDS: Record<string, string> = { oak: 'o', maple: 'm', pine: 'p' };
const TREE_BACK: Record<string, string> = { o: 'oak', m: 'maple', p: 'pine' };

function simpleToken(i: number, o: WorldObject): string | null {
  const keys = Object.keys(o).length;
  const idx = i.toString(36);
  switch (o.k) {
    case 'weed':
      if (o.id === 'weed' && (o.hp ?? 1) === 1 && keys <= 4) return `${idx}W${o.n ?? 0}`;
      return null;
    case 'stone':
      if (o.id === 'stone' && (o.hp ?? 1) === 1 && keys <= 4) return `${idx}S${o.n ?? 0}`;
      return null;
    case 'twig':
      if (o.id === 'twig' && (o.hp ?? 1) === 1 && keys <= 4) return `${idx}X${o.n ?? 0}`;
      return null;
    case 'stump':
      if (o.id === 'stump' && (o.hp ?? 4) === 4 && keys <= 3) return `${idx}U`;
      return null;
    case 'tree':
      if (TREE_IDS[o.id] && (o.hp ?? 10) === 10 && keys <= 4 && !o.tap) return `${idx}T${TREE_IDS[o.id]}${o.g ?? 0}`;
      return null;
    case 'part':
      if (o.ref !== undefined && keys <= 3) return `${idx}P${o.ref.toString(36)}.${o.id}`;
      return null;
    case 'grass':
      if (o.id === 'grass' && keys <= 3) return `${idx}G${o.n ?? 0}`;
      return null;
  }
  return null;
}

function parseToken(tok: string): [number, WorldObject] | null {
  const m = /^([0-9a-z]+)([WSXUTPG])(.*)$/.exec(tok);
  if (!m) return null;
  const i = parseInt(m[1], 36);
  const rest = m[3];
  switch (m[2]) {
    case 'W': return [i, { k: 'weed', id: 'weed', hp: 1, n: Number(rest) || 0 }];
    case 'S': return [i, { k: 'stone', id: 'stone', hp: 1, n: Number(rest) || 0 }];
    case 'X': return [i, { k: 'twig', id: 'twig', hp: 1, n: Number(rest) || 0 }];
    case 'U': return [i, { k: 'stump', id: 'stump', hp: 4 }];
    case 'G': return [i, { k: 'grass', id: 'grass', n: Number(rest) || 0 }];
    case 'T': return [i, { k: 'tree', id: TREE_BACK[rest[0]] ?? 'oak', g: Number(rest.slice(1)) || 0, hp: 10 }];
    case 'P': {
      const dot = rest.indexOf('.');
      return [i, { k: 'part', id: rest.slice(dot + 1), ref: parseInt(rest.slice(0, dot), 36) }];
    }
  }
  return null;
}

export function compactLoc(s: SavedLoc): CompactLoc {
  const out: CompactLoc = {};
  if (s.soil) out.soil = s.soil;
  if (s.objs) {
    const toks: string[] = [];
    const complex: [number, WorldObject][] = [];
    for (const [i, o] of s.objs) {
      const t = simpleToken(i, o);
      if (t) toks.push(t);
      else complex.push([i, o]);
    }
    if (toks.length) out.s = toks.join(' ');
    if (complex.length) out.o = complex;
  }
  return out;
}

export function expandLoc(c: CompactLoc): SavedLoc {
  const objs: [number, WorldObject][] = [];
  if (c.s) for (const t of c.s.split(' ')) {
    const p = parseToken(t);
    if (p) objs.push(p);
  }
  if (c.o) objs.push(...c.o);
  return { soil: c.soil, objs };
}

// ── Migrations ──────────────────────────────────────────────
/** MIGRATIONS[n] upgrades a save of version n to version n+1. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySave = any;
export const MIGRATIONS: Record<number, (d: AnySave) => AnySave> = {
  // v1 (early prototype): energy fields were `energyMax`, locations stored as plain {soil, objs}
  1: (d) => {
    const p = d.state?.player;
    if (p && p.energyMax !== undefined) {
      p.maxEnergy = p.energyMax;
      delete p.energyMax;
    }
    if (d.locs) for (const k of Object.keys(d.locs)) {
      const l = d.locs[k];
      if (l && Array.isArray(l.objs)) d.locs[k] = compactLoc({ soil: l.soil, objs: l.objs });
    }
    d.v = 2;
    return d;
  },
};

export function migrate(d: AnySave): AnySave {
  let v = typeof d?.v === 'number' ? d.v : 1;
  if (v > SAVE_VERSION) throw new Error('save is from a newer version');
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`no migration from v${v}`);
    d = m(d);
    v = d.v ?? v + 1;
  }
  return d;
}

/** Fill any fields missing in an older save with defaults from a fresh state. */
export function fillDefaults<T>(target: T, defaults: T): T {
  const t = target as Record<string, unknown>, d = defaults as Record<string, unknown>;
  for (const k of Object.keys(d)) {
    if (t[k] === undefined) t[k] = d[k];
    else if (isPlain(t[k]) && isPlain(d[k])) fillDefaults(t[k], d[k]);
  }
  return target;
}
const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// ── Serialize ───────────────────────────────────────────────
export function buildSave(sim: Sim, suspended: boolean): SaveFile {
  const st = sim.state;
  st.v = SAVE_VERSION;
  st.suspended = suspended;
  const locs: Record<string, CompactLoc> = {};
  for (const [id, raw] of Object.entries(sim.pendingLocs())) locs[id] = compactLoc(raw);
  for (const [id, l] of sim.world) {
    if (l.def.id.startsWith('mine')) continue; // mine floors regenerate
    const s = serializeLoc(l);
    if (s) locs[id] = compactLoc(s);
  }
  return {
    v: SAVE_VERSION,
    meta: {
      v: SAVE_VERSION,
      name: st.player.name,
      farm: st.player.farm,
      day: st.day,
      coins: st.player.coins,
      playSec: Math.round(st.playSec),
      savedAt: Date.now(),
      suspended,
      done: st.story.finale > 0,
    },
    state: st,
    locs,
  };
}

export function serialize(sim: Sim, suspended = false): string {
  return JSON.stringify(buildSave(sim, suspended));
}

export function deserialize(json: string): Sim {
  const raw = migrate(JSON.parse(json));
  const fresh = createState({ name: '', farm: '', pet: 'dog', petName: '' });
  const state = fillDefaults(raw.state as GameState, fresh);
  state.v = SAVE_VERSION;
  const locs: Record<string, SavedLoc> = {};
  for (const [id, c] of Object.entries(raw.locs ?? {})) locs[id] = expandLoc(c as CompactLoc);
  return new Sim(state, locs);
}

// ── Slots ───────────────────────────────────────────────────
const slotKey = (n: number) => `slot.${n}`;

export function saveToSlot(sim: Sim, slot: number, suspended = false): WriteResult & { bytes: number } {
  const json = serialize(sim, suspended);
  const bytes = json.length * 2;
  if (bytes > TUNING.saveBudgetBytes) console.warn(`save is ${bytes} bytes, over budget`);
  const r = write(slotKey(slot), json);
  return { ...r, bytes };
}

export function loadSlot(slot: number): Sim | null {
  const json = read(slotKey(slot));
  if (!json) return null;
  try {
    return deserialize(json);
  } catch (e) {
    console.warn('could not load save', e);
    return null;
  }
}

export function slotMeta(slot: number): SaveMeta | null {
  const json = read(slotKey(slot));
  if (!json) return null;
  try {
    // meta sits at the start of the JSON; parse fully (saves are small)
    return (JSON.parse(json) as SaveFile).meta ?? null;
  } catch {
    return null;
  }
}

export function deleteSlot(slot: number): void {
  remove(slotKey(slot));
}

export function slotBytes(slot: number): number {
  return (read(slotKey(slot))?.length ?? 0) * 2;
}
