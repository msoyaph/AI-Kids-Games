/** Map registry: every location id → builder. Builders run once and are cached. */
import { buildFarm, buildFarmhouse } from './farm';
import { ROOMS, buildHall } from './interiors';
import { buildBarn, buildCoop, buildGreenhouse, buildShed } from './farmbuildings';
import { buildMineLobby, buildMountain, buildQuarry } from './mountain';
import { buildBeach, buildFishShop, buildForest } from './coast';
import { buildTown } from './town';
import type { MapDef } from './types';
import { buildRoom } from './interiors';

export interface MapContext {
  houseLevel: number;
  /** story repairs done (board ids) */
  done: string[];
}

type Builder = (ctx: MapContext) => MapDef;

const BUILDERS: Record<string, Builder> = {
  farm: () => buildFarm(),
  farmhouse: (ctx) => buildFarmhouse(ctx.houseLevel),
  town: () => buildTown(),
  hall: () => buildHall(),
  coop: () => buildCoop(),
  barn: () => buildBarn(),
  shed: () => buildShed(),
  greenhouse: () => buildGreenhouse(),
  mountain: (ctx) => buildMountain(ctx),
  quarry: () => buildQuarry(),
  minelobby: () => buildMineLobby(),
  beach: (ctx) => buildBeach(ctx),
  fishshop: () => buildFishShop(),
  forest: () => buildForest(),
};
for (const r of ROOMS) BUILDERS[r.id] = () => roomDef(r.id);

function roomDef(id: string): MapDef {
  return buildRoom(ROOMS.find((r) => r.id === id)!);
}

const cache = new Map<string, MapDef>();

export function hasMap(id: string): boolean {
  return id in BUILDERS;
}

/** Maps whose layout depends on story repairs. */
const STORY_MAPS: Record<string, string[]> = { mountain: ['forage'], beach: ['fish'], town: ['animal'], hall: ['crafted'] };

export function mapKey(id: string, ctx: MapContext): string {
  if (id === 'farmhouse') return `${id}:${ctx.houseLevel}`;
  const deps = STORY_MAPS[id];
  if (deps) return `${id}:${deps.map((d) => (ctx.done.includes(d) ? 1 : 0)).join('')}`;
  return id;
}

/** Drop cached defs for a map id (procedural maps like the mine). */
export function forgetMap(id: string): void {
  for (const k of [...cache.keys()]) if (k === id || k.startsWith(id + ':')) cache.delete(k);
}

export function getMapDef(id: string, ctx: MapContext): MapDef {
  const key = mapKey(id, ctx);
  let d = cache.get(key);
  if (!d) {
    const b = BUILDERS[id];
    if (!b) throw new Error(`unknown map ${id}`);
    d = b(ctx);
    cache.set(key, d);
  }
  return d;
}

export function registerMap(id: string, b: Builder): void {
  BUILDERS[id] = b;
}

export const ALL_MAP_IDS = (): string[] => Object.keys(BUILDERS);
