/** A small test street in Old Harbor: Main Street carried on south to a new cross street at z = 22. */
import { act } from '../../src/sim/actions';
import { newTown } from '../../src/sim/newtown';
import { ZONE, type Town } from '../../src/sim/state';

export const CROSS = 22;

export function street(seed = 1): Town {
  const t = newTown(seed);
  const tiles: [number, number][] = [];
  for (let z = 17; z <= CROSS; z++) tiles.push([40, z]);
  for (let x = 30; x <= 50; x++) if (x !== 40) tiles.push([x, CROSS]);
  const r = act(t, { type: 'road', tiles });
  if (!r.ok) throw new Error(r.why);
  return t;
}

/** Zone homes on the north side of the cross street (west of Main Street) and shops to the east. */
export function zoned(seed = 1): Town {
  const t = street(seed);
  act(t, { type: 'zone', x0: 30, z0: CROSS - 2, x1: 39, z1: CROSS - 1, zone: ZONE.home });
  act(t, { type: 'zone', x0: 41, z0: CROSS - 2, x1: 46, z1: CROSS - 1, zone: ZONE.shop });
  return t;
}
