/**
 * How a new farm looks: the keeper's cottage, the boat dock by the river, a compost bin, six old
 * fields, and the clutter of a farm that has been asleep for years (weeds, stones and logs, on the
 * home plot and on all the land still to open). The same for every player.
 */
import { noise } from '../core/rng';
import { AREAS, tileAt } from '../sim/map';
import { newField, type FieldObj, type Obj, type OtherObj } from '../sim/objects';

/** The six old fields, right beside the cottage, so the first view shows the farmhouse and its fields together. */
export const START_FIELDS: [number, number][] = [[38, 37], [39, 37], [38, 38], [39, 38], [38, 39], [39, 39]];

/** Tiles kept clear of clutter on the home plot (the paths to the dock and around the cottage). */
const clearZone = (x: number, z: number) =>
  (x >= 34 && x <= 40 && z >= 36 && z <= 41) || // cottage, its yard and the old fields
  (x >= 45 && z >= 42 && z <= 46) || // the dock's yard
  (x >= 38 && x <= 40 && z >= 43 && z <= 45); // the compost bin

export function startObjects(): Obj[] {
  const objs: Obj[] = [];
  let id = 1;
  const add = (o: Omit<FieldObj, 'id'> | Omit<OtherObj, 'id'>) => { objs.push({ ...o, id: id++ } as Obj); };
  add({ kind: 'building', def: 'cottage', x: 35, z: 37, rot: 0 });
  add({ kind: 'building', def: 'dock', x: 48, z: 43, rot: 0 });
  add({ kind: 'building', def: 'board', x: 46, z: 42, rot: 0 });
  add({ kind: 'building', def: 'compost', x: 39, z: 44, rot: 0 });
  // the old keeper's dog stayed with the farm
  add({ kind: 'building', def: 'kennel', x: 38, z: 40, rot: 0, data: { animals: [{ name: 'Rufus', readyAt: 1e12, fed: false, brushed: false }] } });
  for (const [x, z] of START_FIELDS) {
    add(newField(0, x, z, 0));
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
