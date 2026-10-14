/**
 * Everything that can stand on the town's land (the style frame's subset): its footprint in tiles,
 * how tall it is (for tap picking), how much contact shade it casts, and the paints its instances
 * pick from. Models live in src/render/models; this file is data only.
 */
import { PAINT } from './paints';

export type ThingClass = 'home' | 'shop' | 'civic' | 'park' | 'street' | 'tree';

export interface ThingDef {
  id: string;
  name: string;
  class: ThingClass;
  /** Footprint in tiles, before turning. */
  w: number;
  d: number;
  height: number;
  /** Contact shade under it (0 none). */
  shade: number;
  /** Paints its instances choose from (the instance colour); none = drawn as modelled. */
  looks?: readonly number[];
}

const BRICKS = [0xc8735a, 0xd99a7a, 0xb8705e, 0xe0b090, 0xa98b7a, 0xcf8f6a] as const;

const defs: ThingDef[] = [
  { id: 'cottage', name: 'Cottage', class: 'home', w: 2, d: 2, height: 1.5, shade: 0.75, looks: PAINT.walls },
  { id: 'townhouse', name: 'Townhouse', class: 'home', w: 2, d: 2, height: 1.7, shade: 0.8, looks: BRICKS },
  { id: 'bungalow', name: 'Bungalow', class: 'home', w: 2, d: 2, height: 1.2, shade: 0.75, looks: PAINT.walls },
  { id: 'apartments', name: 'Apartments', class: 'home', w: 3, d: 3, height: 2.3, shade: 0.85, looks: BRICKS },
  { id: 'cafe', name: 'Café', class: 'shop', w: 2, d: 2, height: 1.6, shade: 0.75, looks: PAINT.awning },
  { id: 'store', name: 'Corner store', class: 'shop', w: 2, d: 2, height: 1.3, shade: 0.75, looks: PAINT.awning },
  { id: 'library', name: 'Library', class: 'civic', w: 4, d: 3, height: 2.4, shade: 0.8 },
  { id: 'fountain', name: 'Fountain', class: 'park', w: 2, d: 2, height: 0.9, shade: 0.3 },
  { id: 'playground', name: 'Playground', class: 'park', w: 2, d: 2, height: 0.8, shade: 0.2 },
  { id: 'bench', name: 'Bench', class: 'park', w: 1, d: 1, height: 0.3, shade: 0.15 },
  { id: 'picnic', name: 'Picnic table', class: 'park', w: 1, d: 1, height: 0.3, shade: 0.2 },
  { id: 'flowerbed', name: 'Flower bed', class: 'park', w: 1, d: 1, height: 0.3, shade: 0.2, looks: [0xff7a8a, 0xffd34d, 0xb59cff, 0xff9a4d, 0xffffff] },
  { id: 'arch', name: 'Rose arch', class: 'park', w: 1, d: 1, height: 1, shade: 0.1 },
  { id: 'lamp', name: 'Street lamp', class: 'street', w: 1, d: 1, height: 1.1, shade: 0 },
  { id: 'busstop', name: 'Bus stop', class: 'street', w: 1, d: 1, height: 0.8, shade: 0.2 },
  { id: 'hydrant', name: 'Hydrant', class: 'street', w: 1, d: 1, height: 0.2, shade: 0 },
  { id: 'postbox', name: 'Post box', class: 'street', w: 1, d: 1, height: 0.35, shade: 0 },
  { id: 'bin', name: 'Bin', class: 'street', w: 1, d: 1, height: 0.2, shade: 0 },
  { id: 'tree', name: 'Tree', class: 'tree', w: 1, d: 1, height: 1.4, shade: 0.45 },
  { id: 'blossom', name: 'Blossom tree', class: 'tree', w: 1, d: 1, height: 1.4, shade: 0.45 },
  { id: 'pine', name: 'Pine', class: 'tree', w: 1, d: 1, height: 1.5, shade: 0.4 },
  { id: 'bush', name: 'Bushes', class: 'tree', w: 1, d: 1, height: 0.3, shade: 0.25 },
];

export const THING: Record<string, ThingDef> = Object.fromEntries(defs.map(d => [d.id, d]));
