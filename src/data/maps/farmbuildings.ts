/** Farm building interiors: coop, barn, shed and the greenhouse. */
import { Ter } from '../../sim/terrain';
import { interior } from './builder';
import type { MapDef } from './types';

export function buildCoop(): MapDef {
  const b = interior('coop', 'Coop', [
    '############',
    '#WWwWWWWwWW#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '##D#########',
  ], {}, 'barn');
  for (let x = 4; x <= 9; x++) b.prop('trough', x, 2);
  b.prop('hay', 1, 2);
  b.trigger(1, 2, 'hopper');
  b.warp(2, 8, 'farm', 39, 8, { dir: 0 });
  b.point('door', 2, 7, 3);
  b.point('pen', 6, 5);
  return b.build({ id: 'coop', name: 'Coop', outdoor: false, farmable: false, music: 'barn', water: 'none' });
}

export function buildBarn(): MapDef {
  const b = interior('barn', 'Barn', [
    '##############',
    '#WWWWWwWWWWWW#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '####D#########',
  ], {}, 'barn');
  for (let x = 4; x <= 11; x++) b.prop('trough', x, 2);
  b.prop('hay', 1, 2);
  b.prop('hay', 2, 2);
  b.trigger(1, 2, 'hopper', undefined, 2, 1);
  b.warp(4, 10, 'farm', 7, 16, { dir: 0 });
  b.point('door', 4, 9, 3);
  b.point('pen', 8, 6);
  return b.build({ id: 'barn', name: 'Barn', outdoor: false, farmable: false, music: 'barn', water: 'none' });
}

export function buildShed(): MapDef {
  const b = interior('shed', 'Shed', [
    '############',
    '#WWwWWWWwWW#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '###D########',
  ]);
  b.warp(3, 9, 'farm', 6, 8, { dir: 0 });
  b.point('door', 3, 8, 3);
  return b.build({ id: 'shed', name: 'Shed', outdoor: false, farmable: false, music: 'home', water: 'none' });
}

export function buildGreenhouse(): MapDef {
  const b = interior('greenhouse', 'Greenhouse', [
    '################',
    '#WWWWWWWWWWWWWW#',
    '#,,,,,,,,,,,,,,#',
    '#,............,#',
    '#,............,#',
    '#,............,#',
    '#,............,#',
    '#,............,#',
    '#,............,#',
    '#,............,#',
    '#,,,,,,,,,,,,,,#',
    '#######D########',
  ]);
  b.rect(2, 3, 12, 7, Ter.DIRT);
  b.prop('plant', 1, 2);
  b.prop('plant', 14, 2);
  b.warp(7, 11, 'farm', 17, 9, { dir: 0 });
  b.point('door', 7, 10, 3);
  return b.build({ id: 'greenhouse', name: 'Greenhouse', outdoor: false, farmable: true, music: 'home', water: 'none' });
}
