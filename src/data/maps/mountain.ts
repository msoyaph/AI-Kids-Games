/** The mountain (mine entrance, lake, bridge to the quarry), the quarry and the mine lobby. */
import { Ter } from '../../sim/terrain';
import { MapBuilder, interior } from './builder';
import type { MapContext } from './index';
import type { MapDef } from './types';

export function buildMountain(ctx: MapContext): MapDef {
  const bridge = ctx.done.includes('forage');
  const b = new MapBuilder(48, 32, Ter.GRASS);
  // cliffs along the top with the mine
  b.rect(0, 0, 48, 4, Ter.CLIFF);
  b.rect(16, 4, 14, 2, Ter.CLIFF);
  b.structure('mineEntrance', 21, 4, 4, 2, 'mine', { to: 'minelobby', tx: 6, ty: 7 });
  b.rect(19, 6, 8, 3, Ter.DIRT);
  // chasm with the old bridge to the quarry
  b.rect(8, 0, 3, 32, Ter.WATER);
  b.rect(8, 15, 3, 3, bridge ? Ter.BRIDGE : Ter.BROKENBRIDGE);
  b.waterZones.push({ x: 7, y: 0, w: 5, h: 32, zone: 'river' });
  // lake
  b.ellipse(37, 14, 8, 5, Ter.WATER);
  b.ellipse(37, 14, 5, 3, Ter.DEEPWATER);
  b.waterZones.push({ x: 28, y: 8, w: 18, h: 12, zone: 'lake' });
  b.rect(30, 19, 2, 2, Ter.DOCK);
  // paths
  b.path(20, 31, 20, 22, Ter.PATH, 2);
  b.path(20, 22, 23, 9, Ter.PATH, 2);
  b.path(44, 31, 44, 24, Ter.PATH, 2);
  b.path(44, 24, 22, 22, Ter.PATH, 1);
  b.path(11, 16, 20, 18, Ter.PATH, 1);
  b.path(0, 16, 8, 16, Ter.DIRT, 2);
  // decoration
  b.forestBorder('pine', 1, 77, [
    { x: 16, y: 27, w: 8, h: 5 },
    { x: 40, y: 27, w: 8, h: 5 },
    { x: 0, y: 12, w: 8, h: 8 },
    { x: 0, y: 0, w: 48, h: 4 },
  ]);
  b.scatter('pine', 0.05, 78, { x: 11, y: 4, w: 37, h: 25 });
  b.scatter('bush', 0.04, 79, { x: 11, y: 4, w: 37, h: 25 });
  b.scatter('pine', 0.12, 80, { x: 0, y: 4, w: 8, h: 8 });
  b.scatter('pine', 0.12, 81, { x: 0, y: 20, w: 8, h: 12 });
  b.prop('sign', 18, 9);
  b.trigger(18, 9, 'sign', 'mine');
  b.prop('sign', 12, 14);
  b.trigger(12, 14, 'sign', bridge ? 'quarryOpen' : 'bridge');
  b.prop('rubble', 12, 18);
  // exits
  for (let x = 16; x <= 23; x++) b.warp(x, 31, 'farm', 57, 1, { dir: 0 });
  for (let x = 41; x <= 47; x++) b.warp(x, 31, 'town', 45, 1, { dir: 0 });
  for (let y = 13; y <= 19; y++) b.warp(0, y, 'quarry', 37, 14, { dir: 1 });
  b.point('fromFarm', 20, 30, 3);
  b.point('fromTown', 44, 30, 3);
  b.point('fromQuarry', 1, 16, 2);
  b.point('mineDoor', 22, 7);
  b.point('lakeDock', 31, 20);
  b.point('bridgeEnd', 12, 16);
  b.point('lookout', 30, 24);
  return b.build({ id: 'mountain', name: 'Cliffside Mountain', outdoor: true, farmable: false, music: 'mountain', water: 'lake', forage: true });
}

export function buildQuarry(): MapDef {
  const b = new MapBuilder(40, 28, Ter.DIRT);
  b.rect(0, 0, 40, 3, Ter.CLIFF);
  b.rect(0, 25, 40, 3, Ter.CLIFF);
  b.rect(0, 0, 2, 28, Ter.CLIFF);
  b.rect(4, 6, 30, 18, Ter.STONEFLOOR);
  b.ellipse(10, 18, 3, 2, Ter.WATER);
  b.waterZones.push({ x: 6, y: 15, w: 9, h: 7, zone: 'lake' });
  b.path(39, 14, 30, 14, Ter.PATH, 2);
  for (const [x, y] of [[6, 7], [20, 5], [33, 22], [28, 8], [14, 23]]) b.prop('rubble', x, y);
  b.prop('crate', 35, 10);
  b.prop('barrel', 36, 10);
  b.prop('sign', 36, 16);
  b.trigger(36, 16, 'sign', 'quarry');
  for (let y = 12; y <= 16; y++) b.warp(39, y, 'mountain', 1, 16, { dir: 2 });
  b.point('fromMountain', 38, 14, 1);
  return b.build({ id: 'quarry', name: 'Old Quarry', outdoor: true, farmable: false, music: 'mountain', water: 'lake', forage: true });
}

export function buildMineLobby(): MapDef {
  const b = interior('minelobby', 'Mine Entrance', [
    '##############',
    '#WWWWWWWWWWWW#',
    '#ssssssssssss#',
    '#ssssssssssss#',
    '#ssssssssssss#',
    '#ssssssssssss#',
    '#ssssssssssss#',
    '#ssssssssssss#',
    '######D#######',
  ], {}, 'mine0');
  b.prop('lift', 11, 2);
  b.trigger(11, 2, 'elevator');
  b.prop('ladderUp', 3, 1);
  b.prop('workbench', 8, 2);
  b.trigger(8, 2, 'lumiTable');
  b.prop('lantern', 1, 2);
  b.prop('crate', 12, 7);
  b.prop('barrel', 1, 7);
  b.trigger(3, 2, 'mineDown');
  b.prop('sign', 5, 2);
  b.trigger(5, 2, 'sign', 'mineLobby');
  b.warp(6, 8, 'mountain', 22, 7, { dir: 0 });
  b.point('door', 6, 7, 3);
  b.point('fromMine', 3, 3, 0);
  b.point('lumi', 9, 4);
  return b.build({ id: 'minelobby', name: 'Mine Entrance', outdoor: false, farmable: false, music: 'mine0', water: 'none' });
}
