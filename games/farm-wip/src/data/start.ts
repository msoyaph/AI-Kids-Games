/**
 * How a new farm looks: the keeper's cottage, the boat dock by the river, a compost bin, six old
 * fields, and the clutter of a farm that has been asleep for years (weeds, stones and logs, on the
 * home plot and on all the land still to open). The same for every player.
 */
import { noise } from '../core/rng';
import { AREAS, tileAt } from '../sim/map';
import type { FieldObj, Obj, OtherObj } from '../sim/objects';

export const START_FIELDS: [number, number][] = [[41, 47], [42, 47], [43, 47], [41, 48], [42, 48], [43, 48]];

/** Tiles kept clear of clutter on the home plot (the paths to the dock and around the cottage). */
const clearZone = (x: number, z: number) =>
  (x >= 34 && x <= 39 && z >= 36 && z <= 41) || // cottage and its yard
  (x >= 45 && z >= 42 && z <= 46) || // the dock's yard
  (x >= 40 && x <= 44 && z >= 46 && z <= 49) || // the old fields
  (x >= 38 && x <= 40 && z >= 43 && z <= 45); // the compost bin

export function startObjects(): Obj[] {
  const objs: Obj[] = [];
  let id = 1;
  const add = (o: Omit<FieldObj, 'id'> | Omit<OtherObj, 'id'>) => { objs.push({ ...o, id: id++ } as Obj); };
  add({ kind: 'building', def: 'cottage', x: 35, z: 37, rot: 0 });
  add({ kind: 'building', def: 'dock', x: 48, z: 43, rot: 0 });
  add({ kind: 'building', def: 'compost', x: 39, z: 44, rot: 0 });
  for (const [x, z] of START_FIELDS) {
    add({ kind: 'field', def: 'field', x, z, rot: 0, crop: null, plantedAt: 0, readyAt: 0, watered: false, fertilized: false, rotation: false, boost: false, last: null, legumeLeft: false });
  }
  // clutter: about one tile in nine, a little more on land that has been asleep longer
  for (const a of AREAS) {
    for (let z = a.z0; z <= a.z1; z++) {
      for (let x = a.x0; x <= a.x1; x++) {
        if (tileAt(x, z).water || (a.id === 'home' && clearZone(x, z))) continue;
        const n = noise(x, z, 77);
        if (n > (a.id === 'home' ? 0.1 : 0.13)) continue;
        const kind = noise(x, z, 78);
        const def = kind < 0.55 ? 'weeds' : kind < 0.8 ? 'stone' : 'log';
        add({ kind: 'debris', def, x, z, rot: (Math.floor(noise(x, z, 79) * 4) % 4) as 0 | 1 | 2 | 3 });
      }
    }
  }
  return objs;
}
