// The Adventure: 50 levels in 5 worlds, as data. Each level row says what it introduces (a critter,
// a twist) and what it unlocks (a plant); `makeLevel` turns a row into waves from a seeded budget,
// so balancing means editing these rows or tuning.ts. Reports: reports/balance.md, reports/pacing.md.
import { CRITTERS, BOSSES } from './tuning';
import type { WorldId } from './roster';
import { hashSeed, rng } from '../sim/rng';
import type { LevelSpec, Special, WaveSpec } from '../sim/types';

export interface LevelRow {
  /** A new plant, first available in this level (with a tip), and kept after. */
  unlock?: string;
  /** A critter met here for the first time (it shows in the preview with a tip). */
  meet?: string;
  /** The boss at the end of the world. */
  boss?: string;
  /** Lanes critters use (the first levels start narrow). */
  lanes?: number[];
}

export interface WorldDef {
  id: WorldId;
  /** Difficulty: points in the first wave of level 1, and growth per level. */
  base: number;
  grow: number;
  slots: number;
  startCompost: number;
  dusk?: boolean;
  rows: LevelRow[];
}

export const STARTING_PLANTS = ['rowan', 'comfrey'];

export const WORLD_DEFS: WorldDef[] = [
  { id: 'meadow', base: 2, grow: 0.8, slots: 5, startCompost: 150, rows: [
    { meet: 'snail', lanes: [2] },
    { unlock: 'boxwood', meet: 'mouse', lanes: [1, 2, 3] },
    { unlock: 'lambs-ear', meet: 'ants' },
    { unlock: 'maple' },
    { meet: 'roly-poly' },
    { unlock: 'basil' },
    { meet: 'magpie' },
    { unlock: 'lavender' },
    {},
    { boss: 'grand-snail' },
  ] },
  { id: 'greenhouse', base: 4, grow: 0.8, slots: 6, startCompost: 150, rows: [
    { unlock: 'arrowhead', meet: 'beetle' },
    {},
    { unlock: 'yarrow', meet: 'grasshopper' },
    {},
    { unlock: 'pickerelweed', meet: 'frog' },
    {},
    { unlock: 'wisteria', meet: 'vole' },
    {},
    { unlock: 'touch-me-not' },
    { boss: 'big-beetle' },
  ] },
  { id: 'dusk', base: 5, grow: 0.85, slots: 6, startCompost: 150, dusk: true, rows: [
    { unlock: 'primrose', meet: 'hedgehog' },
    {},
    { unlock: 'hop-vine', meet: 'moths' },
    {},
    { unlock: 'four-oclock', meet: 'badger' },
    {},
    { unlock: 'allium', meet: 'owlet' },
    {},
    { unlock: 'nasturtium' },
    { boss: 'badger-baron' },
  ] },
  { id: 'desert', base: 6, grow: 0.9, slots: 7, startCompost: 175, rows: [
    { unlock: 'agave', meet: 'gecko' },
    {},
    { unlock: 'hollyhock', meet: 'goat' },
    {},
    { unlock: 'milkweed', meet: 'jackrabbit' },
    {},
    { unlock: 'chamomile', meet: 'packrat' },
    {},
    {},
    { boss: 'billy-goat' },
  ] },
  { id: 'cloud', base: 6, grow: 0.8, slots: 8, startCompost: 200, rows: [
    { unlock: 'bluebell' },
    { meet: 'seagull' },
    { unlock: 'borage' },
    { meet: 'kite-crow' },
    { unlock: 'pampas' },
    { meet: 'sheep' },
    {},
    {},
    {},
    { boss: 'parade-float' },
  ] },
];

/** The level before the final one also has a mini-boss: Captain Gull guards the Cloud Garden. */
const EXTRA_BOSS: Record<string, string> = { 'cloud-9': 'captain-gull' };

/** Every critter met by a level (in order of meeting); moths and owlets only come out at dusk. */
export function critterPool(world: number, index: number): string[] {
  const out: string[] = [];
  const dusk = !!WORLD_DEFS[world]?.dusk;
  WORLD_DEFS.forEach((w, wi) => w.rows.forEach((row, ri) => { if ((wi < world || (wi === world && ri <= index)) && row.meet && (dusk || !CRITTERS[row.meet]?.dusk)) out.push(row.meet); }));
  return out;
}

/** Plants the player has in a level (its own new plant included). */
export function plantsAt(world: number, index: number): string[] {
  const out = [...STARTING_PLANTS];
  WORLD_DEFS.forEach((w, wi) => w.rows.forEach((row, ri) => { if ((wi < world || (wi === world && ri <= index)) && row.unlock) out.push(row.unlock); }));
  return out;
}

/** Special tiles for a world's level: channels and sprinklers, lanterns, hot tiles, gaps and updrafts. */
function specials(world: WorldId, index: number, rnd: () => number): Record<string, Special> {
  const out: Record<string, Special> = {};
  const put = (lane: number, col: number, sp: Special) => { out[`${lane},${col}`] = sp; };
  if (world === 'greenhouse') {
    // irrigation channels: one or two lanes get a run of water tiles
    const lanes = index < 4 ? [2] : [1, 3];
    for (const lane of lanes) for (let col = 1; col <= 7; col += index < 4 ? 1 : 2) put(lane, col, 'water');
    for (let k = 0; k < 2 + Math.floor(index / 3); k++) { const lane = Math.floor(rnd() * 5), col = Math.floor(rnd() * 4); if (!out[`${lane},${col}`]) put(lane, col, 'sprinkler'); }
  } else if (world === 'dusk') {
    for (let k = 0; k < 3 + Math.floor(index / 3); k++) put(Math.floor(rnd() * 5), 3 + Math.floor(rnd() * 5), 'lantern');
  } else if (world === 'desert') {
    for (let k = 0; k < 5 + index; k++) { const lane = Math.floor(rnd() * 5), col = 1 + Math.floor(rnd() * 7); put(lane, col, 'hot'); }
    for (let k = 0; k < 2; k++) put(Math.floor(rnd() * 5), Math.floor(rnd() * 4), 'water');
  } else if (world === 'cloud') {
    for (let k = 0; k < 3 + Math.floor(index / 2); k++) { const lane = Math.floor(rnd() * 5), col = 2 + Math.floor(rnd() * 6); put(lane, col, 'gap'); }
    for (let k = 0; k < 2; k++) put(Math.floor(rnd() * 5), 4 + Math.floor(rnd() * 4), 'updraft');
  }
  return out;
}

/**
 * Waves from a budget: pick critters from the pool (the newest one more often), then spread them
 * evenly over the wave's length (48 s for the first wave, growing), so bigger budgets mean busier
 * waves rather than longer levels. Flag waves arrive in a rush (see WAVES.rush).
 */
export function makeWaves(pool: string[], budget: number, count: number, rnd: () => number, lanes?: number[], newest?: string): WaveSpec[] {
  const waves: WaveSpec[] = [];
  for (let w = 0; w < count; w++) {
    const flag = w === count - 1 || (count >= 4 && w === Math.floor(count / 2));
    const points = budget * (1 + w * 0.25) * (flag ? 1.4 : 1);
    const kinds: string[] = [];
    let spent = 0;
    while (spent < points) {
      const kind = newest && rnd() < 0.3 ? newest : pool[Math.floor(rnd() * pool.length)]!;
      kinds.push(kind);
      spent += CRITTERS[kind]!.points;
    }
    const length = WAVE_LENGTH + w * 6, gap = length / kinds.length;
    waves.push({ flag, spawns: kinds.map((critter, k) => ({ critter, lane: lanes ? lanes[Math.floor(rnd() * lanes.length)]! : -1, delay: k * gap * (0.75 + rnd() * 0.5) })) });
  }
  return waves;
}

/** Seconds an ordinary first wave lasts. */
export const WAVE_LENGTH = 48;

export interface Level extends LevelSpec { world: WorldId; worldIndex: number; index: number; row: LevelRow; plants: string[]; pool: string[] }

/** Builds Adventure level `index` (0–9) of world `world` (0–4). */
export function makeLevel(world: number, index: number): Level {
  const def = WORLD_DEFS[world]!, row = def.rows[index]!;
  const id = `${def.id}-${index + 1}`;
  const rnd = rng(hashSeed(id));
  const pool = critterPool(world, index);
  const plants = plantsAt(world, index);
  const count = Math.min(6, 3 + Math.floor(index / 4) + Math.floor(world / 2)) + (row.boss ? 1 : 0);
  const boss = row.boss ?? EXTRA_BOSS[id];
  // boss levels bring a lighter escort: the boss is the show
  const budget = (def.base + def.grow * index) * (boss ? 0.8 : 1);
  const waves = makeWaves(pool, budget, count, rnd, row.lanes, row.meet);
  if (boss) {
    // the boss strolls in a little way into the last wave, after its escorts have shown the way
    const last = waves[waves.length - 1]!;
    last.spawns.push({ critter: boss, lane: 2, delay: (WAVE_LENGTH + (waves.length - 1) * 6) * 0.35 });
    last.flag = true;
  }
  const tiles = specials(def.id, index, rnd);
  // the boss's lane stays open ground, so every plant can stand in its way
  if (boss) for (let col = 0; col < 9; col++) if (tiles[`2,${col}`] === 'gap' || tiles[`2,${col}`] === 'hot') delete tiles[`2,${col}`];
  return {
    id, name: `${index + 1}`, world: def.id, worldIndex: world, index, row, plants, pool,
    startCompost: def.startCompost + (boss ? 100 : 0), seedSlots: Math.min(def.slots, plants.length),
    waves, specials: tiles, dusk: def.dusk,
  };
}

export const LEVELS: Level[] = WORLD_DEFS.flatMap((w, wi) => w.rows.map((_, ri) => makeLevel(wi, ri)));
export const levelById = (id: string) => LEVELS.find(l => l.id === id);
export const BOSS_IDS = Object.keys(BOSSES);
