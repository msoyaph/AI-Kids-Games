/** Maps world objects to sprite names + footprint, for the renderer. */
import { cropStage } from '../sim/farming';
import type { WorldObject } from '../sim/types';
import type { Loc } from '../sim/world';

export interface ObjSprite {
  name: string;
  /** footprint in tiles (sprite is bottom-centred on the footprint) */
  fw: number;
  fh: number;
  /** extra vertical offset in px (negative = up) */
  oy?: number;
  /** draw flat on ground (no y-sort) */
  flat?: boolean;
  /** optional sprite drawn on top (tapper bucket, machine "ready" bubble…) */
  overlay?: string;
  overlayOy?: number;
}

const one = (name: string, oy = 0): ObjSprite => ({ name, fw: 1, fh: 1, oy });

/** Extra resolvers registered by later systems (machines, mine, forage…). */
export const spriteHooks: ((o: WorldObject, season: number, loc: Loc, x: number, y: number) => ObjSprite | null | undefined)[] = [];

export function objSprite(o: WorldObject, season: number, loc: Loc, x: number, y: number): ObjSprite | null {
  for (const h of spriteHooks) {
    const r = h(o, season, loc, x, y);
    if (r !== undefined) return r;
  }
  switch (o.k) {
    case 'weed':
      return one(`obj.weed.${(o.n ?? 0) % 3}.s${season}`);
    case 'stone':
      return one(`obj.stone.${(o.n ?? 0) % 3}`);
    case 'twig':
      return one(`obj.twig.${(o.n ?? 0) % 2}`);
    case 'stump':
      return one(o.id === 'treestump' ? 'obj.treestump' : 'obj.stump');
    case 'log':
      return { name: 'obj.log', fw: 2, fh: 2 };
    case 'boulder':
      return { name: 'obj.boulder', fw: 2, fh: 2 };
    case 'tree': {
      const st = Math.min(4, o.g ?? 0);
      const s: ObjSprite = one(`tree.${o.id}.${st}.s${season}`);
      if (o.tap) s.overlay = o.tap.out ? 'obj.tapper.ready' : 'obj.tapper';
      return s;
    }
    case 'fruitTree': {
      const g = o.g ?? 0;
      const st = g >= 10 ? 3 : g >= 6 ? 2 : g >= 3 ? 1 : 0;
      if (st === 3 && (o.n ?? 0) > 0) return one(`ftree.${o.id}.fruit.s${season}`);
      return one(`ftree.${o.id}.${st}.s${season}`);
    }
    case 'crop':
      if (o.dead) return one(`crop.${o.id}.dead`);
      return one(`crop.${o.id}.${cropStage(o, loc, x, y)}`);
    case 'giant':
      return { name: `giant.${o.id}`, fw: 3, fh: 3 };
    case 'chest':
      return one(`obj.chest.${o.col ?? 0}`);
    case 'scarecrow':
      return one('obj.scarecrow');
    case 'sprinkler':
      return one(`obj.${o.id}`);
    case 'torch':
      return one('obj.torch');
    case 'gate':
      return one(`obj.gate.${o.open ? 1 : 0}`);
    case 'fence': {
      const e = loc.obj(x + 1, y), s = loc.obj(x, y + 1);
      const m = (e && (e.k === 'fence' || e.k === 'gate') ? 1 : 0) | (s && (s.k === 'fence' || s.k === 'gate') ? 2 : 0);
      return one(`obj.${o.id}.${m}`);
    }
    case 'path':
      return { name: `floor.${o.id}`, fw: 1, fh: 1, flat: true };
    case 'rock':
      if (o.id.startsWith('geode')) return one(`obj.${o.id}`);
      return one(`obj.${o.id}.${(o.n ?? 0) % 3}`);
    case 'ore':
      return one(`obj.ore.${o.id}.${loc.def.tileset ?? 0}`);
    case 'gem':
      return one(`obj.gem.${o.id}.${loc.def.tileset ?? 0}`);
    case 'ice':
      return one('obj.ice');
    case 'box':
      return one('obj.box');
    case 'ladder':
      return { name: o.id === 'blocked' ? 'obj.ladder.blocked' : 'obj.ladder', fw: 1, fh: 1, flat: false };
    case 'mineChest':
      return one('obj.mineChest');
    case 'heartstone':
      return one('obj.heartstone.1');
    case 'grass':
      return one(`obj.grass.${(o.n ?? 0) % 2}.s${season}`);
    case 'part':
      return null;
    default:
      return one(`item.${o.id}`);
  }
}
