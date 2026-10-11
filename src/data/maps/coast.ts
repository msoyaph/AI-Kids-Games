/** The beach (fish shop, pier) and Whisperwood forest. */
import { Ter } from '../../sim/terrain';
import { MapBuilder, interior } from './builder';
import type { MapContext } from './index';
import type { MapDef } from './types';

export function buildBeach(ctx: MapContext): MapDef {
  const pier = ctx.done.includes('fish');
  const b = new MapBuilder(56, 36, Ter.SAND);
  b.rect(0, 0, 56, 6, Ter.GRASS);
  b.rect(0, 26, 56, 10, Ter.WATER);
  b.rect(0, 31, 56, 5, Ter.DEEPWATER);
  b.waterZones.push({ x: 0, y: 24, w: 56, h: 12, zone: 'ocean' });
  // tide pools & rocks
  b.ellipse(10, 21, 2.5, 1.5, Ter.WATER);
  b.ellipse(47, 22, 2, 1.2, Ter.WATER);
  b.waterZones.push({ x: 6, y: 18, w: 8, h: 6, zone: 'ocean' }, { x: 44, y: 20, w: 6, h: 4, zone: 'ocean' });
  // pier
  const pierEnd = pier ? 34 : 28;
  b.rect(38, 24, 3, pierEnd - 24 + 1, Ter.DOCK);
  if (!pier) b.rect(38, 29, 3, 2, Ter.BROKENBRIDGE);
  b.waterZones.push({ x: 35, y: 30, w: 10, h: 6, zone: pier ? 'pier' : 'ocean' });
  // paths
  b.path(30, 0, 30, 10, Ter.PATH, 2);
  b.path(30, 10, 39, 23, Ter.PATH, 1);
  b.path(0, 12, 30, 10, Ter.DIRT, 1);
  // fish shop
  b.structure('fishshop', 18, 9, 6, 3, 'fishshop', { to: 'fishshop', tx: 5, ty: 8 });
  b.reserve(18, 7, 6, 2);
  b.prop('boat', 24, 23);
  b.prop('barrel', 25, 11);
  b.prop('crate', 26, 11);
  b.prop('sign', 31, 8);
  b.trigger(31, 8, 'sign', pier ? 'pierOpen' : 'pier');
  b.prop('lamp', 37, 23);
  b.scatter('tree', 0.08, 41, { x: 0, y: 0, w: 56, h: 5 });
  b.scatter('bush', 0.05, 42, { x: 0, y: 0, w: 56, h: 6 });
  for (let x = 27; x <= 33; x++) b.warp(x, 0, 'town', 35, 53, { dir: 3 });
  for (let y = 10; y <= 14; y++) b.warp(0, y, 'forest', 54, 30, { dir: 1 });
  b.point('fromTown', 30, 1, 0);
  b.point('fromForest', 1, 12, 2);
  b.point('shopFront', 20, 13);
  b.point('pierEnd', 39, pierEnd - 1);
  b.point('dock', 39, 24);
  b.point('shore', 14, 24);
  b.point('tidepool', 12, 20);
  return b.build({ id: 'beach', name: 'Sandpiper Beach', outdoor: true, farmable: false, music: 'beach', water: 'ocean', forage: true });
}

export function buildFishShop(): MapDef {
  const b = interior('fishshop', "Cap'n Wren's Bait & Tackle", [
    '############',
    '#WWwWWnWWwW#',
    '#b.x....kB.#',
    '#..CCCC....#',
    '#..........#',
    '#x........P#',
    '#..........#',
    '#.....R....#',
    '#..........#',
    '#####D######',
  ], { C: { prop: 'counter' }, b: { prop: 'barrel' }, x: { prop: 'crate' }, k: { prop: 'workbench' }, B: { prop: 'bed' }, P: { prop: 'plant' }, R: { prop: 'rug' } }, 'shop');
  b.trigger(3, 3, 'shop', 'fishshop', 4, 1);
  b.warp(5, 9, 'beach', 20, 12, { dir: 0 });
  b.point('door', 5, 8, 3);
  b.point('keeper', 4, 2);
  b.point('bed', 8, 4);
  return b.build({ id: 'fishshop', name: "Cap'n Wren's Bait & Tackle", outdoor: false, farmable: false, music: 'shop', water: 'none' });
}

export function buildForest(): MapDef {
  const b = new MapBuilder(56, 44, Ter.GRASS);
  // a winding river
  for (let y = 0; y < 44; y++) {
    const cx = 40 + Math.round(Math.sin(y / 5) * 3);
    b.rect(cx - 1, y, 3, 1, Ter.WATER);
  }
  b.rect(38, 28, 6, 3, Ter.BRIDGE);
  b.waterZones.push({ x: 34, y: 0, w: 12, h: 44, zone: 'river' });
  // pond with lily pads
  b.ellipse(14, 30, 5, 3.5, Ter.WATER);
  b.waterZones.push({ x: 8, y: 26, w: 13, h: 9, zone: 'pond' });
  // paths
  b.path(30, 0, 30, 18, Ter.DIRT, 2);
  b.path(30, 18, 20, 22, Ter.DIRT, 1);
  b.path(30, 18, 37, 29, Ter.DIRT, 1);
  b.path(44, 29, 55, 30, Ter.DIRT, 1);
  // the big old tree clearing
  b.ellipse(22, 12, 5, 4, Ter.FLOWERS);
  b.prop('bigtree', 21, 9);
  b.prop('sign', 26, 15);
  b.trigger(26, 15, 'sign', 'forest');
  b.clear(17, 8, 11, 9);
  b.clear(27, 0, 7, 20);
  // dense woods
  b.forestBorder('tree', 2, 91, [
    { x: 26, y: 0, w: 8, h: 3 },
    { x: 52, y: 27, w: 4, h: 6 },
    { x: 36, y: 0, w: 10, h: 44 },
  ]);
  b.scatter('tree', 0.12, 92, { x: 2, y: 2, w: 32, h: 40 });
  b.scatter('pine', 0.08, 93, { x: 2, y: 2, w: 32, h: 40 });
  b.scatter('tree', 0.1, 94, { x: 45, y: 2, w: 9, h: 40 });
  b.scatter('flowers', 0.04, 95, { x: 2, y: 2, w: 50, h: 40 });
  for (let x = 27; x <= 33; x++) b.warp(x, 0, 'farm', 10, 46, { dir: 3 });
  for (let y = 27; y <= 32; y++) b.warp(55, y, 'beach', 1, 12, { dir: 2 });
  b.point('fromFarm', 30, 1, 0);
  b.point('fromBeach', 54, 30, 1);
  b.point('clearing', 22, 15);
  b.point('pond', 14, 26);
  b.point('bridge', 40, 27);
  b.point('grove', 10, 18);
  return b.build({ id: 'forest', name: 'Whisperwood', outdoor: true, farmable: false, music: 'forest', water: 'river', forage: true });
}
