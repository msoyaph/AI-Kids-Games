/** Maps world objects to sprite names + footprint, for the renderer. */
import type { WorldObject } from '../sim/types';

export interface ObjSprite {
  name: string;
  /** footprint in tiles (sprite is bottom-centred on the footprint) */
  fw: number;
  fh: number;
  /** extra vertical offset in px (negative = up) */
  oy?: number;
  /** draw flat on ground (no y-sort) */
  flat?: boolean;
}

const one = (name: string, oy = 0): ObjSprite => ({ name, fw: 1, fh: 1, oy });

export function objSprite(o: WorldObject, season: number): ObjSprite | null {
  switch (o.k) {
    case 'weed':
      return one(`obj.weed.${(o.n ?? 0) % 3}.s${season}`);
    case 'stone':
      return one(`obj.stone.${(o.n ?? 0) % 3}`);
    case 'twig':
      return one(`obj.twig.${(o.n ?? 0) % 2}`);
    case 'stump':
      return one('obj.stump');
    case 'log':
      return { name: 'obj.log', fw: 2, fh: 2 };
    case 'boulder':
      return { name: 'obj.boulder', fw: 2, fh: 2 };
    case 'tree': {
      const st = Math.min(4, o.g ?? 0);
      if (o.hp !== undefined && o.hp <= 0) return one('obj.treestump');
      return one(`tree.${o.id}.${st}.s${season}`);
    }
    case 'part':
      return null;
    default:
      return one(`item.${o.id}`);
  }
}
