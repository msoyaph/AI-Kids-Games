/**
 * Maps: ASCII rows (one character per 16×16 tile) plus lists of things standing on them.
 *
 * Row characters are terrain (data/terrain.ts) or a common object on its usual ground:
 *   T tree · P pine · N snowy pine · Y palm · K blossom · A autumn tree · Q crystal tree (on grass,
 *   or snow for N) · B bush · E berry bush · R rock · O boulder (Shove) · V vines (Snip) ·
 *   I ice wall (Melt) · M machine (Power Up) · F fence (h) · H fence (v) · L lamp · U bench · X crate.
 * Bigger or special things (houses, signs, Beacons, warps, people) are listed in MapDef.
 */
import type { CharLook } from '../../art/characters';
import { TER, TER_BY_CHAR, type Ter } from '../../data/terrain';
import type { Dir } from '../state';

export type ObjKind =
  | 'tree' | 'pine' | 'snowpine' | 'palm' | 'blossom' | 'autumn' | 'crystal' | 'bush' | 'berrybush' | 'rock' | 'boulder'
  | 'vines' | 'icewall' | 'machine' | 'fence-h' | 'fence-v' | 'lamp' | 'bench' | 'pot' | 'crate' | 'sign' | 'house'
  | 'beacon' | 'lighthouse' | 'lure' | 'cave' | 'stairs' | 'water-gap' | 'updraft' | 'gift'
  | 'bed' | 'table' | 'shelf' | 'counter' | 'nest' | 'plant';

export interface HouseStyleDef { roof: number; wall: number; door?: number }

export interface MapObject {
  kind: ObjKind;
  x: number;
  y: number;
  /** Footprint in tiles (houses, caves); default 1×1. The anchor (x, y) is the bottom-left tile. */
  w?: number;
  h?: number;
  id?: string;
  /** Sign text, or the script a gift/sign runs. */
  text?: string;
  script?: string;
  house?: { style: HouseStyleDef; door: number; kind: 'home' | 'rest' | 'shop' | 'academy' | 'club' };
  /** Only there while this flag is NOT set (a snipped vine sets its flag), or only while it IS set. */
  goneIf?: string;
  showIf?: string;
  /** Beacons: the flag that lights them. */
  litBy?: string;
  /** Gifts: what you find. */
  item?: string;
}

export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  dir?: Dir;
  /** Locked until this flag is set (the door says why). */
  needs?: string;
  lockedText?: string;
}

/** Walking off a map edge continues on the next map (routes join towns this way). */
export interface Edge {
  side: 'n' | 's' | 'e' | 'w';
  to: string;
  /** Added to the column (n/s) or row (e/w) when arriving. */
  offset: number;
}

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: Dir;
  look: CharLook;
  /** Script id run when you talk to them. */
  talk: string;
  /** Drawn as this Agentmon (story creatures, like the partners in the Academy garden). */
  creature?: string;
  /** A trainer you can spar with by talking (data/trainers.ts id). */
  trainer?: string;
  /** Wanders up to this many tiles from home. */
  wander?: number;
  showIf?: string;
  hideIf?: string;
}

export interface Trigger {
  x: number;
  y: number;
  w?: number;
  h?: number;
  script: string;
  /** Flag expression that must be true for it to run. */
  when?: string;
}

export interface MapDef {
  id: string;
  name: string;
  music: string;
  /**
   * Ground look: 0 normal, 1 forest, 2 sky (void shows sky), 3 indoor, 4 cave, 5 desert, 6 snow,
   * 7 mountain; Trial halls and tops: 8 lighthouse, 9 hollow tree, 10 mine, 11 red rock, 12 ice, 13 the Spire.
   */
  theme?: number;
  outdoor: boolean;
  rows: string[];
  objects: MapObject[];
  warps: Warp[];
  edges?: Edge[];
  npcs: NpcDef[];
  triggers: Trigger[];
  /** Wild areas (data/areas.ts) living here; their spawns walk on matching terrain. */
  wild?: string[];
  /** The tile in front of this map's Rest Stop helper (where you wake after a lost spar). */
  rest?: { x: number; y: number };
  battleBg: 'meadow' | 'beach' | 'forest' | 'cave' | 'mountain' | 'desert' | 'snow' | 'sky' | 'trial' | 'town' | 'indoor';
  /** Dark maps need the Lantern ability to see far (and to enter dark tiles). */
  dark?: boolean;
}

const OBJ_CHARS: Record<string, { kind: ObjKind; ground: Ter }> = {
  T: { kind: 'tree', ground: 'grass' }, P: { kind: 'pine', ground: 'grass' }, N: { kind: 'snowpine', ground: 'snow' },
  Y: { kind: 'palm', ground: 'sand' }, K: { kind: 'blossom', ground: 'grass' }, A: { kind: 'autumn', ground: 'grass' },
  Q: { kind: 'crystal', ground: 'cave' }, B: { kind: 'bush', ground: 'grass' }, E: { kind: 'berrybush', ground: 'grass' },
  R: { kind: 'rock', ground: 'grass' }, O: { kind: 'boulder', ground: 'path' }, V: { kind: 'vines', ground: 'grass' },
  I: { kind: 'icewall', ground: 'snow' }, M: { kind: 'machine', ground: 'cave' }, F: { kind: 'fence-h', ground: 'grass' },
  H: { kind: 'fence-v', ground: 'grass' }, L: { kind: 'lamp', ground: 'plaza' }, U: { kind: 'bench', ground: 'plaza' },
  X: { kind: 'crate', ground: 'plaza' },
};

export interface ParsedMap {
  w: number;
  h: number;
  ter: Ter[];
  /** Objects from the rows plus the listed ones. */
  objects: MapObject[];
}

export function parseMap(def: MapDef): ParsedMap {
  const h = def.rows.length;
  const w = Math.max(...def.rows.map(r => r.length));
  const ter: Ter[] = [];
  const objects: MapObject[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = def.rows[y]![x] ?? ' ';
    const o = OBJ_CHARS[ch];
    if (o) {
      ter.push(o.ground);
      objects.push({ kind: o.kind, x, y, id: `${o.kind}@${x},${y}` });
    } else {
      const t = TER_BY_CHAR[ch];
      if (!t) throw new Error(`map ${def.id}: unknown character "${ch}" at ${x},${y}`);
      ter.push(t);
    }
  }
  for (const o of def.objects) objects.push({ ...o, id: o.id ?? `${o.kind}@${o.x},${o.y}` });
  return { w, h, ter, objects };
}

/** Tiles an object blocks (its footprint), or none. */
export function footprint(o: MapObject): { x: number; y: number }[] {
  const solid: ObjKind[] = ['tree', 'pine', 'snowpine', 'palm', 'blossom', 'autumn', 'crystal', 'bush', 'berrybush', 'rock', 'boulder', 'vines', 'icewall', 'machine', 'fence-h', 'fence-v', 'lamp', 'bench', 'pot', 'crate', 'sign', 'house', 'beacon', 'lighthouse', 'lure', 'gift', 'bed', 'table', 'shelf', 'counter', 'nest', 'plant', 'water-gap', 'updraft'];
  if (!solid.includes(o.kind)) return [];
  const w = o.w ?? 1, h = o.h ?? 1;
  const out: { x: number; y: number }[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push({ x: o.x + i, y: o.y - j });
  return out;
}

export const terAt = (m: ParsedMap, x: number, y: number): Ter => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 'void' : m.ter[y * m.w + x]!);
export const walkableTer = (t: Ter) => TER[t].walk;
