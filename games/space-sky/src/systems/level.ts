import type { Cond, EntDef, LevelDef } from '../data/levelTypes';

/** Tile codes. */
export const T_EMPTY = 0;
export const T_GROUND = 1;
export const T_ROCK = 2;
export const T_PLATFORM = 3;
export const T_ICE = 4;
export const T_GOO = 5;
export const T_PAD = 6;
export const T_GEYSER = 7;

export const TILE = 48;

const TILE_CHARS: Record<string, number> = {
  '.': T_EMPTY,
  '#': T_GROUND,
  '%': T_ROCK,
  '=': T_PLATFORM,
  I: T_ICE,
  '~': T_GOO,
  '^': T_PAD,
  '!': T_GEYSER,
};

export type FixedKind = 'coin' | 'sticker' | 'block' | 'orb' | 'bumbler' | 'plant' | 'boulder' | 'lamp' | 'flag';

const FIXED_CHARS: Record<string, FixedKind> = {
  $: 'coin',
  '*': 'sticker',
  B: 'block',
  O: 'orb',
  X: 'bumbler',
  T: 'plant',
  R: 'boulder',
  L: 'lamp',
  F: 'flag',
};

/** One thing placed in the level (not a tile). tx/ty is the tile it sits in; tall doors use h. */
export interface LevelEnt {
  /** Stable key for one-time pickups: "level:tx,ty". */
  key: string;
  kind: FixedKind | EntDef['kind'];
  tx: number;
  ty: number;
  h: number;
  def: EntDef | null;
}

export interface LevelModel {
  def: LevelDef;
  w: number;
  h: number;
  tiles: Uint8Array;
  startX: number;
  startY: number;
  ents: LevelEnt[];
}

export function tileAt(m: LevelModel, tx: number, ty: number): number {
  if (tx < 0 || tx >= m.w) return T_ROCK; // walls at the sides
  if (ty < 0) return T_EMPTY; // open sky above
  if (ty >= m.h) return T_ROCK; // solid floor below
  return m.tiles[ty * m.w + tx];
}

export function isSolidTile(t: number): boolean {
  return t === T_GROUND || t === T_ROCK || t === T_ICE || t === T_PAD || t === T_GEYSER;
}

export class LevelError extends Error {}

/** Parse an ASCII level. Throws LevelError with a helpful message if the map is broken. */
export function parseLevel(def: LevelDef): LevelModel {
  const rows = def.map;
  if (!rows.length) throw new LevelError(`${def.id}: empty map`);
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const tiles = new Uint8Array(w * h);
  const ents: LevelEnt[] = [];
  let startX = -1;
  let startY = -1;
  const doorCells = new Map<string, Array<[number, number]>>();
  for (let y = 0; y < h; y++) {
    const row = rows[y].padEnd(w, '.');
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const key = `${def.id}:${x},${y}`;
      if (ch in TILE_CHARS) {
        tiles[y * w + x] = TILE_CHARS[ch];
      } else if (ch === 'P') {
        if (startX >= 0) throw new LevelError(`${def.id}: more than one P`);
        startX = x;
        startY = y;
      } else if (ch in FIXED_CHARS) {
        ents.push({ key, kind: FIXED_CHARS[ch], tx: x, ty: y, h: 1, def: null });
      } else if (ch >= 'a' && ch <= 'z') {
        const ed = def.ents?.[ch];
        if (!ed) throw new LevelError(`${def.id}: letter '${ch}' at ${x},${y} has no entry in ents`);
        if (ed.kind === 'door') {
          const list = doorCells.get(ch) ?? [];
          list.push([x, y]);
          doorCells.set(ch, list);
        } else {
          ents.push({ key, kind: ed.kind, tx: x, ty: y, h: 1, def: ed });
        }
      } else {
        throw new LevelError(`${def.id}: unknown symbol '${ch}' at ${x},${y}`);
      }
    }
  }
  if (startX < 0) throw new LevelError(`${def.id}: no P (rocket) in map`);
  for (let x = 0; x < w; x++) {
    if (!isSolidTile(tiles[(h - 1) * w + x])) throw new LevelError(`${def.id}: bottom row must be solid (column ${x})`);
  }
  // Doors: vertical runs of the same letter.
  for (const [ch, cells] of doorCells) {
    cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let i = 0;
    while (i < cells.length) {
      const [x, y0] = cells[i];
      let y1 = y0;
      let j = i + 1;
      while (j < cells.length && cells[j][0] === x && cells[j][1] === y1 + 1) {
        y1++;
        j++;
      }
      ents.push({ key: `${def.id}:${x},${y0}`, kind: 'door', tx: x, ty: y0, h: y1 - y0 + 1, def: def.ents![ch] });
      i = j;
    }
  }
  return { def, w, h, tiles, startX, startY, ents };
}

/** Evaluate an entity condition against mission/flag state. */
export interface CondState {
  missionStep(id: string): number | null;
  missionDone(id: string): boolean;
  flag(name: string): boolean;
}

export function condOk(c: Cond | undefined, s: CondState): boolean {
  if (!c) return true;
  if (c.mission !== undefined) {
    const step = s.missionStep(c.mission);
    if (step === null) return false;
    if (c.step !== undefined && step !== c.step) return false;
    if (c.minStep !== undefined && step < c.minStep) return false;
  }
  if (c.done !== undefined && !s.missionDone(c.done)) return false;
  if (c.notDone !== undefined && s.missionDone(c.notDone)) return false;
  if (c.flag !== undefined && !s.flag(c.flag)) return false;
  if (c.notFlag !== undefined && s.flag(c.notFlag)) return false;
  return true;
}

export function entCond(e: LevelEnt): Cond | undefined {
  const d = e.def as (EntDef & { when?: Cond }) | null;
  return d && 'when' in d ? d.when : undefined;
}
