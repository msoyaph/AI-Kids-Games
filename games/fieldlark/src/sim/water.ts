/**
 * Irrigation (from chapter 5): channels dug in build mode, and sprinklers.
 *
 * - A channel is painted tile by tile like a path (it is stored in the same per-tile string, as
 *   `CHANNEL`). A network of joined channel tiles is wet when any tile of it touches the river or a
 *   pond (side by side, not diagonally).
 * - Fields right beside a wet channel are watered at dawn and when they are planted.
 * - A sprinkler works only on or right beside a wet channel, so planning where the water goes is the
 *   puzzle. It waters fields within 1 tile (2 and 3 through the Farm Lab), at dawn and at planting.
 *
 * The Farm Lab can also let water run under paths, and let channels water fields 2 tiles away.
 */
import { DECOR_BY_ID } from '../data/decor';
import { pathAt, setPath } from './decorate';
import { areaAt, H, tileAt, W } from './map';
import { tileKey, type FieldObj } from './objects';
import type { Farm } from './state';
import { bump, occupancy, spend } from './world';
import { fieldState } from './fields';

/** The channel's code in the per-tile paths string. */
export const CHANNEL = 4;
export const CHANNEL_COST = 3;

export const waterOpen = (farm: Farm) => farm.story.chapter >= 4;
export const channelAt = (farm: Farm, x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H && pathAt(farm, x, z) === CHANNEL;

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const isWaterTile = (x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H && tileAt(x, z).water;

let cache: { key: string; wet: Uint8Array } | null = null;

/** Every wet channel tile (1), worked out from where the channels touch water. */
export function wetMap(farm: Farm): Uint8Array {
  const culverts = !!farm.flags['lab:culverts'];
  const key = `${culverts ? 1 : 0}${farm.paths}`;
  if (cache?.key === key) return cache.wet;
  const wet = new Uint8Array(W * H);
  const carries = (x: number, z: number) => channelAt(farm, x, z) || (culverts && x >= 0 && z >= 0 && x < W && z < H && pathAt(farm, x, z) > 0);
  const queue: number[] = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!channelAt(farm, x, z)) continue;
    if (SIDES.some(([dx, dz]) => isWaterTile(x + dx, z + dz))) { wet[z * W + x] = 1; queue.push(z * W + x); }
  }
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!, x = c % W, z = (c / W) | 0;
    for (const [dx, dz] of SIDES) {
      const nx = x + dx, nz = z + dz;
      if (!carries(nx, nz) || wet[nz * W + nx]) continue;
      wet[nz * W + nx] = 1;
      queue.push(nz * W + nx);
    }
  }
  // paths that carry water (culverts) aren't channels: only channel tiles count as wet
  for (let i = 0; i < wet.length; i++) if (wet[i] && pathAt(farm, i % W, (i / W) | 0) !== CHANNEL) wet[i] = 2;
  cache = { key, wet };
  return wet;
}

export const wetChannel = (farm: Farm, x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H && wetMap(farm)[z * W + x] === 1;

/** How far a sprinkler reaches. */
export const sprinklerRange = (farm: Farm) => (farm.flags['lab:sprinkler3'] ? 3 : farm.flags['lab:sprinkler2'] ? 2 : 1);

/** A sprinkler works on or right beside a wet channel. */
export function sprinklerWorks(farm: Farm, x: number, z: number): boolean {
  return wetChannel(farm, x, z) || SIDES.some(([dx, dz]) => wetChannel(farm, x + dx, z + dz));
}

/** Does water reach this field by itself (a wet channel beside it, or a working sprinkler near)? */
export function autoWatered(farm: Farm, x: number, z: number): boolean {
  const reach = farm.flags['lab:deep'] ? 2 : 1;
  for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
    if (reach === 1 && Math.abs(dx) + Math.abs(dz) !== 1) continue;
    if ((dx || dz) && wetChannel(farm, x + dx, z + dz)) return true;
  }
  const r = sprinklerRange(farm);
  return farm.objects.some(o => o.kind === 'decor' && o.def === 'sprinkler' && Math.abs(o.x - x) <= r && Math.abs(o.z - z) <= r && sprinklerWorks(farm, o.x, o.z));
}

/** At dawn: water reaches every growing crop it can. Returns how many fields it watered. */
export function waterAtDawn(farm: Farm): number {
  let n = 0;
  for (const o of farm.objects) {
    if (o.kind !== 'field' || o.watered || fieldState(farm, o) !== 'growing') continue;
    if (!autoWatered(farm, o.x, o.z)) continue;
    o.watered = true;
    n++;
  }
  if (n) bump(farm, 'auto-watered', n);
  return n;
}

/** At planting: a field the water reaches starts watered. */
export function waterAtPlanting(farm: Farm, f: FieldObj): boolean {
  if (f.watered || !waterOpen(farm) || !autoWatered(farm, f.x, f.z)) return false;
  f.watered = true;
  bump(farm, 'auto-watered');
  return true;
}

/** Dig a channel on a tile (build mode). */
export function digChannel(farm: Farm, x: number, z: number): { ok: true; wet: boolean } | { ok: false; why: string } {
  if (!waterOpen(farm)) return { ok: false, why: 'Channels come in chapter 5.' };
  const area = areaAt(x, z);
  if (!area || !farm.unlocked.includes(area) || tileAt(x, z).water) return { ok: false, why: 'Channels go on open farm land.' };
  if (occupancy(farm).has(tileKey(x, z))) return { ok: false, why: 'Something is in the way.' };
  if (channelAt(farm, x, z)) return { ok: false, why: 'Already a channel.' };
  if (!spend(farm, CHANNEL_COST)) return { ok: false, why: `A channel costs ${CHANNEL_COST} coins a tile.` };
  setPath(farm, x, z, CHANNEL);
  const wet = wetChannel(farm, x, z);
  if (wet) bump(farm, 'channel-wet');
  return { ok: true, wet };
}

/** Is a decoration a sprinkler (for build mode's hints)? */
export const isSprinkler = (def: string) => def === 'sprinkler' && !!DECOR_BY_ID[def];
