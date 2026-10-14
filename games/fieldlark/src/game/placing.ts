/**
 * Everything that is placed with the ghost: buying from the shop, placing a decoration, putting
 * back something from storage, and moving something already on the farm. One shape for all of them,
 * so the ghost, the Place/Turn/Cancel bar and the checks work the same way.
 */
import type * as THREE from 'three';
import { BUILDING } from '../data/buildings';
import { DECOR_BY_ID } from '../data/decor';
import { MACHINE } from '../data/production';
import { TREE } from '../data/orchard';
import { beehive, coop, cowBarn, duckHouse, goatPen, kennel, sheepShed } from '../render/models/animals';
import { compostBin, placeholder } from '../render/models/buildings';
import { CORNER_DECOR, decorModel } from '../render/models/decor';
import { treeModel } from '../render/models/trees';
import { workshop } from '../render/models/workshops';
import { buyableInfo, buyAndPlace, placeCheck, type Buyable } from '../sim/build';
import { moveObject, pathUnder, placeDecor, placeStored } from '../sim/decorate';
import { canPlace, type Size } from '../sim/objects';
import type { Farm } from '../sim/state';
import { levelOf, occupancy, sizeOf } from '../sim/world';

export type PlaceItem =
  | { kind: 'buy'; b: Buyable }
  | { kind: 'decor'; def: string }
  | { kind: 'stored'; what: 'building' | 'tree'; def: string }
  | { kind: 'move'; id: number };

export interface Placing { item: PlaceItem; at: { x: number; z: number; rot: 0 | 1 | 2 | 3 }; moved: boolean }

type Rot = 0 | 1 | 2 | 3;
const BUILD_MODELS: Record<string, () => THREE.BufferGeometry> = { compost: compostBin, coop, cowbarn: cowBarn, sheepshed: sheepShed, goatpen: goatPen, duckhouse: duckHouse, beehive, kennel };

/** The kind and def of what's being placed (for a move: the thing itself). */
function what(farm: Farm, item: PlaceItem): { kind: string; def: string } | null {
  switch (item.kind) {
    case 'buy': return { kind: item.b.kind, def: item.b.def };
    case 'decor': return { kind: 'decor', def: item.def };
    case 'stored': return { kind: item.what, def: item.def };
    case 'move': { const o = farm.objects.find(x => x.id === item.id); return o ? { kind: o.kind, def: o.def } : null; }
  }
}

export function itemSize(farm: Farm, item: PlaceItem): Size {
  if (item.kind === 'move') { const o = farm.objects.find(x => x.id === item.id); return o ? sizeOf(o) : { w: 1, d: 1 }; }
  if (item.kind === 'decor') { const d = DECOR_BY_ID[item.def]!; return { w: d.w, d: d.d }; }
  const w = what(farm, item)!;
  if (w.kind === 'tree') return { w: 1, d: 1 };
  const b = BUILDING[w.def];
  return b ? { w: b.w, d: b.d } : { w: 1, d: 1 };
}

export function itemName(farm: Farm, item: PlaceItem): string {
  const w = what(farm, item);
  if (!w) return 'Something';
  if (w.kind === 'decor') return DECOR_BY_ID[w.def]?.name ?? 'Decoration';
  if (w.kind === 'tree') return TREE[w.def]?.name ?? 'Tree';
  return BUILDING[w.def]?.name ?? 'Building';
}

/** Coins it will cost (0 for moves, storage and earned set pieces). */
export function itemCost(farm: Farm, item: PlaceItem): number {
  if (item.kind === 'buy') return buyableInfo(item.b)?.cost ?? 0;
  if (item.kind === 'decor') return (farm.storage[`decor:${item.def}`] ?? 0) > 0 ? 0 : DECOR_BY_ID[item.def]?.cost ?? 0;
  return 0;
}

/** The ghost's model, built from the north-west corner. */
export function itemModel(farm: Farm, item: PlaceItem): { key: string; make: () => THREE.BufferGeometry } {
  const w = what(farm, item) ?? { kind: 'decor', def: '?' };
  const key = `${w.kind}:${w.def}`;
  if (w.kind === 'tree') { const def = TREE[w.def]!; return { key, make: () => treeModel(def, 'rest').translate(0.5, 0, 0.5) }; }
  if (w.kind === 'decor') return { key, make: () => (CORNER_DECOR.has(w.def) ? decorModel(w.def) : decorModel(w.def).translate(0.5, 0, 0.5)) };
  const machine = MACHINE[w.def];
  if (machine) return { key, make: () => workshop(machine) };
  const size = itemSize(farm, item);
  return { key, make: BUILD_MODELS[w.def] ?? (() => placeholder(size.w, size.d)) };
}

/** Does it fit where the ghost is? */
export function fits(farm: Farm, p: Placing): { ok: true } | { ok: false; why: string } {
  const item = p.item;
  if (item.kind === 'buy') return placeCheck(farm, item.b, p.at);
  const size = itemSize(farm, item);
  const ignore = item.kind === 'move' ? item.id : undefined;
  const r = canPlace(occupancy(farm), farm.unlocked, p.at, size, ignore);
  if (!r.ok) return { ok: false, why: r.reason === 'taken' ? 'Something is already there.' : r.reason === 'locked' ? 'That land isn’t open yet.' : r.reason === 'uneven' ? 'It needs flat ground.' : r.reason === 'water' ? 'It can’t go on water.' : 'That’s off the farm.' };
  if (pathUnder(farm, p.at, size)) return { ok: false, why: 'Take the path away first.' };
  if (item.kind === 'decor') {
    const d = DECOR_BY_ID[item.def]!;
    if ((farm.storage[`decor:${item.def}`] ?? 0) === 0 && !d.set && levelOf(farm) < d.level) return { ok: false, why: `${d.name} comes at farm level ${d.level}.` };
  }
  return { ok: true };
}

/** Do it. */
export function commit(farm: Farm, p: Placing): { ok: true } | { ok: false; why: string } {
  const item = p.item, at = { ...p.at, rot: p.at.rot as Rot };
  switch (item.kind) {
    case 'buy': return buyAndPlace(farm, item.b, at);
    case 'decor': return placeDecor(farm, item.def, at);
    case 'stored': return placeStored(farm, item.what, item.def, at);
    case 'move': return moveObject(farm, item.id, at);
  }
}
