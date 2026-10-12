/** Cliff Valley town: plaza, Valley Hall, shops and homes. */
import { Ter } from '../../sim/terrain';
import { MapBuilder } from './builder';
import type { MapContext } from './index';
import type { MapDef } from './types';

export const TOWN_W = 72;
export const TOWN_H = 56;

export function buildTown(ctx: MapContext = { houseLevel: 0, done: [] }): MapDef {
  const train = ctx.done.includes('animal');
  const b = new MapBuilder(TOWN_W, TOWN_H, Ter.GRASS);

  // river along the south, flowing out east
  b.rect(0, 48, TOWN_W, 4, Ter.WATER);
  b.rect(0, 49, TOWN_W, 2, Ter.DEEPWATER);
  b.waterZones.push({ x: 0, y: 46, w: TOWN_W, h: 8, zone: 'river' });

  // plaza
  b.rect(26, 17, 20, 17, Ter.COBBLE);
  b.prop('fountain', 35, 25);
  for (const [x, y] of [[26, 17], [45, 17], [26, 33], [45, 33]]) b.prop('lamp', x, y);
  b.prop('bench', 29, 28);
  b.prop('bench', 40, 28);
  b.prop('board', 39, 18); // help-wanted board
  b.trigger(39, 18, 'questboard', undefined, 2, 1);
  b.prop('sign', 30, 18);
  b.trigger(30, 18, 'calendar');

  // roads
  b.path(0, 26, 26, 26, Ter.PATH, 2);
  b.path(35, 33, 35, 47, Ter.PATH, 2);
  b.rect(34, 48, 3, 4, Ter.BRIDGE);
  b.path(35, 52, 35, 55, Ter.PATH, 2);
  b.path(45, 22, 50, 22, Ter.PATH, 1);
  b.path(45, 31, 50, 31, Ter.PATH, 1);
  b.path(21, 17, 26, 20, Ter.PATH, 1);
  b.path(11, 12, 11, 26, Ter.PATH, 1);
  b.path(45, 0, 45, 17, Ter.PATH, 2);
  b.path(45, 12, 58, 12, Ter.PATH, 1);
  b.path(58, 12, 64, 12, Ter.PATH, 1);
  b.path(11, 26, 11, 42, Ter.PATH, 1);
  b.path(11, 42, 35, 42, Ter.PATH, 1);
  b.path(35, 42, 60, 42, Ter.PATH, 1);
  b.path(60, 30, 60, 42, Ter.PATH, 1);
  b.path(60, 30, 46, 30, Ter.PATH, 1);

  // buildings (door targets are interior map ids)
  b.structure('hall', 31, 12, 10, 5, 'hall', { to: 'hall', tx: 9, ty: 12 });
  b.reserve(31, 9, 10, 3);
  b.structure('store', 47, 18, 8, 4, 'store', { to: 'store', tx: 6, ty: 9 });
  b.structure('cafe', 47, 27, 7, 4, 'cafe', { to: 'cafe', tx: 6, ty: 9 });
  b.structure('museum', 18, 13, 8, 4, 'museum', { to: 'museum', tx: 7, ty: 10 });
  b.structure('smithy', 56, 8, 7, 4, 'smithy', { to: 'smithy', tx: 4, ty: 8 });
  b.structure('carpentry', 8, 8, 7, 4, 'carpentry', { to: 'carpentry', tx: 5, ty: 8 });
  b.structure('ranch', 8, 37, 8, 4, 'ranch', { to: 'ranch', tx: 4, ty: 8 });
  b.structure('houseA', 24, 38, 5, 3, 'houseA', { to: 'houseLumi', tx: 4, ty: 7 });
  b.structure('houseB', 31, 43, 5, 3, 'houseB', { to: 'houseBasil', tx: 4, ty: 7 });
  b.structure('houseC', 40, 37, 6, 3, 'houseC', { to: 'houseOakes', tx: 5, ty: 8 });
  b.structure('houseD', 58, 26, 5, 3, 'houseD', { to: 'houseNana', tx: 4, ty: 7 });
  b.structure('cabin', 63, 15, 5, 3, 'cabin', { to: 'houseToby', tx: 4, ty: 7 });
  b.structure('station', 61, 2, 8, 3, 'station');
  for (const s of b.structures) b.reserve(s.x, s.y - 2, 10, 2);

  // train tracks (overgrown until the Valley Train is restored)
  b.rect(54, 6, 18, 1, Ter.RAIL);
  b.prop('railEnd', 54, 6);
  if (!train) {
    b.prop('rubble', 58, 6);
    b.prop('rubble', 66, 6);
    b.prop('sign', 60, 7);
    b.trigger(60, 7, 'sign', 'station');
  } else {
    b.prop('stall', 58, 8);
    b.trigger(58, 8, 'shop', 'cart', 2, 1);
    b.prop('banner', 57, 8);
    b.prop('banner', 61, 8);
  }

  // ranch pasture
  for (let x = 2; x <= 19; x++) {
    b.prop('fence', x, 43);
    b.prop('fence', x, 47);
  }
  for (let y = 44; y <= 46; y++) {
    b.prop('fence', 2, y);
    if (y !== 45) b.prop('fence', 19, y);
  }
  b.prop('hay', 6, 45);
  b.prop('trough', 12, 45);

  // decorations
  for (const [x, y] of [[20, 30], [22, 22], [52, 36], [64, 36], [6, 30], [16, 50 - 4], [28, 46]]) b.prop('flowers', x, y);
  b.prop('barrel', 55, 21);
  b.prop('crate', 55, 20);
  b.prop('barrel', 63, 11);
  b.prop('bench', 50, 34);
  b.prop('lamp', 20, 26);
  b.prop('lamp', 52, 26);
  b.prop('lamp', 34, 42);
  b.prop('lamp', 60, 40);
  b.prop('sign', 1, 24);
  b.prop('mailbox', 45, 40);

  // trees around the edges, leaving exits open
  b.forestBorder('tree', 2, 555, [
    { x: 0, y: 23, w: 3, h: 7 },
    { x: 43, y: 0, w: 5, h: 3 },
    { x: 32, y: 52, w: 7, h: 4 },
    { x: 54, y: 0, w: 18, h: 9 },
    { x: 0, y: 46, w: 72, h: 10 },
  ]);
  b.scatter('tree', 0.05, 9, { x: 2, y: 2, w: 20, h: 6 });
  b.scatter('pine', 0.06, 10, { x: 2, y: 28, w: 6, h: 9 });
  b.scatter('tree', 0.04, 11, { x: 62, y: 20, w: 8, h: 26 });
  b.scatter('bush', 0.05, 12, { x: 2, y: 2, w: 68, h: 44 });
  // south bank trees
  b.scatter('pine', 0.15, 13, { x: 0, y: 52, w: 32, h: 4 });
  b.scatter('pine', 0.15, 14, { x: 39, y: 52, w: 33, h: 4 });

  // exits
  for (let y = 23; y <= 29; y++) b.warp(0, y, 'farm', 62, 20, { dir: 1 });
  for (let x = 43; x <= 47; x++) b.warp(x, 0, 'mountain', 44, 28, { dir: 3 });
  for (let x = 32; x <= 38; x++) b.warp(x, 55, 'beach', 30, 1, { dir: 0 });

  b.point('fromFarm', 1, 26, 2);
  b.point('fromMountain', 45, 1, 0);
  b.point('fromBeach', 35, 54, 3);
  b.point('fountain', 35, 28);
  b.point('plazaW', 30, 24);
  b.point('plazaE', 41, 24);
  b.point('bench1', 29, 29);
  b.point('bench2', 41, 29);
  b.point('hallDoor', 35, 18);
  b.point('board', 39, 19);
  b.point('storeFront', 50, 23);
  b.point('cafeFront', 50, 32);
  b.point('bridge', 35, 47);
  b.point('riverbank', 24, 46);
  b.point('pasture', 10, 45);
  b.point('station', 64, 7);
  b.point('museumFront', 21, 18);
  b.point('smithyFront', 58, 13);
  b.point('carpFront', 11, 13);
  b.point('garden', 53, 38);

  return b.build({ id: 'town', name: 'Cliff Valley Town', outdoor: true, farmable: false, music: 'town', water: 'river', forage: true });
}
