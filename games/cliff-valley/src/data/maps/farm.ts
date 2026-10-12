/** Cliffside Farm and the farmhouse interiors. */
import { Ter } from '../../sim/terrain';
import { MapBuilder, interior } from './builder';
import type { MapDef } from './types';

export const FARM_W = 64;
export const FARM_H = 48;
/** Farmhouse footprint anchor (all upgrade levels share x/y so the door never moves). */
export const HOUSE = { x: 27, y: 7, doorX: 29, doorY: 9 };

export function buildFarm(): MapDef {
  const b = new MapBuilder(FARM_W, FARM_H, Ter.GRASS);

  // Paths: house → east exit (town), north exit (mountain), south trail (forest)
  b.path(29, 10, 29, 14, Ter.PATH, 1);
  b.path(29, 14, 46, 14, Ter.PATH, 1);
  b.path(46, 14, 46, 20, Ter.PATH, 1);
  b.path(46, 20, 63, 20, Ter.PATH, 1);
  b.path(57, 0, 57, 14, Ter.PATH, 1);
  b.path(46, 14, 57, 14, Ter.PATH, 1);
  b.path(10, 47, 10, 38, Ter.DIRT, 2);
  b.path(10, 38, 18, 32, Ter.DIRT, 2);

  // Pond and some bare dirt patches
  b.ellipse(50, 35, 6.5, 4.5, Ter.WATER);
  b.ellipse(49, 35, 3.5, 2.2, Ter.DEEPWATER);
  b.ellipse(20, 24, 4, 3, Ter.DIRT);
  b.ellipse(36, 30, 5, 3, Ter.DIRT);
  b.ellipse(14, 40, 3, 2, Ter.DIRT);
  b.waterZones.push({ x: 40, y: 28, w: 20, h: 14, zone: 'pond' });

  // Buildings
  b.structure('farmhouse', HOUSE.x, HOUSE.y, 8, 3, 'house', { to: 'farmhouse', tx: 5, ty: 7 });
  b.reserve(HOUSE.x - 1, HOUSE.y - 3, 10, 3);
  b.structure('greenhouse', 14, 5, 7, 4, 'greenhouse', { to: 'greenhouse', tx: 7, ty: 10 });
  b.reserve(14, 2, 7, 3);
  b.prop('bin', 35, 9);
  b.reserve(35, 9, 2, 1);
  b.prop('mailbox', 25, 9);
  b.trigger(35, 9, 'ship', undefined, 2, 1);
  b.trigger(25, 9, 'mail');

  // Building plots (the carpenter builds here)
  b.plot('coop', 38, 5, 5, 3);
  b.plot('silo', 44, 5, 3, 3);
  b.plot('barn', 4, 12, 7, 4);
  b.plot('shed', 5, 5, 4, 3);
  b.plot('well', 24, 12, 2, 2);
  b.structure('plot', 38, 5, 5, 3, 'coop', { to: 'coop', tx: 2, ty: 7 });
  b.structure('plot', 44, 5, 3, 3, 'silo');
  b.structure('plot', 4, 12, 7, 4, 'barn', { to: 'barn', tx: 4, ty: 9 });
  b.structure('plot', 5, 5, 4, 3, 'shed', { to: 'shed', tx: 3, ty: 8 });
  b.structure('plot', 24, 12, 2, 2, 'well');
  b.reserve(38, 2, 9, 6).reserve(4, 9, 7, 7).reserve(5, 3, 4, 5).reserve(24, 11, 2, 3);

  // keep building doorsteps clear
  b.clear(38, 8, 5, 2);
  b.clear(4, 16, 7, 2);
  b.clear(5, 8, 4, 2);
  b.clear(14, 9, 7, 2);

  // Keep the yard near the house tidy at the start
  b.clear(23, 9, 16, 7);
  b.clear(44, 12, 18, 10);

  // Forest border with exits
  b.forestBorder('tree', 2, 1234, [
    { x: 55, y: 0, w: 5, h: 4 },
    { x: 59, y: 18, w: 5, h: 5 },
    { x: 8, y: 43, w: 5, h: 5 },
  ]);
  b.scatter('bush', 0.02, 77, { x: 2, y: 2, w: 60, h: 3 });

  // Exits
  for (let x = 55; x <= 59; x++) b.warp(x, 0, 'mountain', 20, 28, { dir: 3 });
  for (let y = 18; y <= 22; y++) b.warp(63, y, 'town', 1, 26, { dir: 2 });
  for (let x = 8; x <= 12; x++) b.warp(x, 47, 'forest', 30, 1, { dir: 0 });

  b.point('start', HOUSE.doorX, HOUSE.doorY + 1, 0);
  b.point('door', HOUSE.doorX, HOUSE.doorY + 1, 0);
  b.point('fromTown', 62, 20, 1);
  b.point('fromMountain', 57, 1, 0);
  b.point('fromForest', 10, 46, 3);
  b.point('fromGreenhouse', 17, 9, 0);
  b.point('petBowl', 33, 10);
  b.trigger(33, 10, 'petBowl');

  return b.build({ id: 'farm', name: 'Cliffside Farm', outdoor: true, farmable: true, music: 'farm', water: 'pond', forage: true });
}

/** Farmhouse interiors: each upgrade extends right/down so placed items stay valid. */
const HOUSE_ROWS = [
  [
    '############',
    '#WWWWWWWWWW#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#####D######',
  ],
  [
    '##################',
    '#WWWWWWWWWWWWWWWW#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#####D############',
  ],
  [
    '########################',
    '#WWWWWWWWWWWWWWWWWWWWWW#',
    '#..........#WWWWWWWWWWW#',
    '#..........#...........#',
    '#..........#...........#',
    '#......................#',
    '#..........#...........#',
    '#..........#...........#',
    '#####D######...........#',
    '############...........#',
    '############WWWWWWWWWWW#',
    '########################',
  ],
];

export function buildFarmhouse(level: number): MapDef {
  const rows = HOUSE_ROWS[Math.max(0, Math.min(2, level))];
  const b = interior('farmhouse', 'Farmhouse', rows);
  b.rect(1, 1, 1, 1, Ter.WALL);
  b.prop('bed', 2, 2);
  b.trigger(2, 2, 'bed', undefined, 1, 2);
  b.prop('crate', 4, 2);
  b.trigger(4, 2, 'lostfound');
  b.prop('radio', 9, 1);
  b.trigger(9, 1, 'radio');
  b.prop('window', 5, 1);
  b.prop('table', 7, 5);
  b.prop('chair', 6, 5);
  b.prop('rug', 4, 5);
  b.prop('plant', 10, 2);
  if (level >= 1) {
    b.prop('stove', 14, 1);
    b.trigger(14, 1, 'kitchen');
    b.prop('counter', 15, 1);
    b.prop('counter', 16, 1);
    b.prop('window', 12, 1);
    b.prop('fireplace', 11, 1);
  }
  if (level >= 2) {
    b.prop('bookshelf', 13, 2);
    b.prop('piano', 20, 2);
    b.prop('rug', 17, 6);
    b.prop('plant', 22, 3);
    b.prop('bed', 21, 4);
  }
  b.warp(5, 8, 'farm', 29, 10, { dir: 0 });
  b.point('bed', 3, 3, 1);
  b.point('door', 5, 7, 3);
  return b.build({ id: 'farmhouse', name: 'Farmhouse', outdoor: false, farmable: false, music: 'home', water: 'none' });
}
