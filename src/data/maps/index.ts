/** Map registry: every location id → builder. Builders run once and are cached. */
import { buildFarm, buildFarmhouse } from './farm';
import { ROOMS, buildHall } from './interiors';
import { buildTown } from './town';
import type { MapDef } from './types';
import { buildRoom } from './interiors';

export interface MapContext {
  houseLevel: number;
}

type Builder = (ctx: MapContext) => MapDef;

const BUILDERS: Record<string, Builder> = {
  farm: () => buildFarm(),
  farmhouse: (ctx) => buildFarmhouse(ctx.houseLevel),
  town: () => buildTown(),
  hall: () => buildHall(),
};
for (const r of ROOMS) BUILDERS[r.id] = () => roomDef(r.id);

function roomDef(id: string): MapDef {
  return buildRoom(ROOMS.find((r) => r.id === id)!);
}

const cache = new Map<string, MapDef>();

export function hasMap(id: string): boolean {
  return id in BUILDERS;
}

export function mapKey(id: string, ctx: MapContext): string {
  return id === 'farmhouse' ? `${id}:${ctx.houseLevel}` : id;
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
