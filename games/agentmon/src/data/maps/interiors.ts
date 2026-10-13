/**
 * Builders for the rooms every town repeats: Rest Stops, shops, homes, and each Trial's entrance
 * hall (the helper and the stairs to the puzzles) and top floor (the Keeper and the Beacon).
 */
import { CAST } from '../cast';
import type { MapDef, NpcDef } from '../../core/world/map';

export interface Exit { map: string; x: number; y: number }

const ROOM = ['WWWWWWWWW', 'WWWWWWWWW', 'fffffffff', 'fffffffff', 'ffffrffff', 'fffffffff', 'fffffffff', 'ffffrffff'];

/** A Rest Stop: the helper behind the counter, the cozy nest, and the door at the bottom. */
export function restStopMap(id: string, name: string, exit: Exit): MapDef {
  return {
    id, name, music: 'rest', outdoor: false, battleBg: 'indoor', theme: 3, rows: ROOM,
    objects: [{ kind: 'nest', x: 1, y: 3, w: 2 }, { kind: 'counter', x: 3, y: 3, w: 3 }, { kind: 'plant', x: 8, y: 2 }, { kind: 'plant', x: 0, y: 6 }],
    warps: [{ x: 4, y: 7, to: exit.map, tx: exit.x, ty: exit.y, dir: 0 }],
    npcs: [{ id: 'helper', name: CAST.helper!.name, x: 4, y: 2, dir: 0, look: CAST.helper!.look, talk: 'rest-stop' }],
    triggers: [],
    rest: { x: 4, y: 4 },
  };
}

/** A shop: the shopkeeper behind the counter and shelves of snacks. */
export function shopMap(id: string, name: string, talk: string, exit: Exit): MapDef {
  return {
    id, name, music: 'shop', outdoor: false, battleBg: 'indoor', theme: 3, rows: ROOM,
    objects: [{ kind: 'counter', x: 3, y: 3, w: 3 }, { kind: 'shelf', x: 0, y: 2 }, { kind: 'shelf', x: 1, y: 2 }, { kind: 'shelf', x: 7, y: 2 }, { kind: 'shelf', x: 8, y: 2 }, { kind: 'plant', x: 8, y: 6 }],
    warps: [{ x: 4, y: 7, to: exit.map, tx: exit.x, ty: exit.y, dir: 0 }],
    npcs: [{ id: 'clerk', name: CAST.clerk!.name, x: 4, y: 2, dir: 0, look: CAST.clerk!.look, talk }],
    triggers: [],
  };
}

/** A home with a rug, a bed, a table, and whoever lives there. */
export function homeMap(id: string, name: string, exit: Exit, npcs: NpcDef[]): MapDef {
  return {
    id, name, music: 'home', outdoor: false, battleBg: 'indoor', theme: 3,
    rows: ['WWWWWWWWW', 'WWWWWWWWW', 'fffffffff', 'fffffffff', 'fffrrffff', 'fffrrffff', 'fffffffff', 'ffffrffff'],
    objects: [{ kind: 'bed', x: 7, y: 3 }, { kind: 'table', x: 2, y: 4 }, { kind: 'shelf', x: 0, y: 2 }, { kind: 'plant', x: 8, y: 6 }],
    warps: [{ x: 4, y: 7, to: exit.map, tx: exit.x, ty: exit.y, dir: 0 }],
    npcs,
    triggers: [],
  };
}

/**
 * A Trial's entrance hall: stairs up to the puzzles (`trial:<id>`), the helper you can spar with,
 * and two door tiles back outside. `music` is the Trial's theme.
 */
export function trialHall(o: { id: string; name: string; trial: string; music: string; out: [Exit, Exit]; helper: NpcDef; intro: string }): MapDef {
  return {
    id: o.id, name: o.name, music: o.music, outdoor: false, battleBg: 'trial', theme: 3,
    rows: ['WWWWWWWWWW', 'WWWWWWWWWW', 'ffff^^ffff', 'ffffffffff', 'ffffffffff', 'ffffffffff', 'ffffffffff', 'ffffffffff', 'ffffrrffff'],
    objects: [{ kind: 'shelf', x: 0, y: 2 }, { kind: 'shelf', x: 9, y: 2 }, { kind: 'plant', x: 1, y: 7 }, { kind: 'plant', x: 8, y: 7 }, { kind: 'crate', x: 8, y: 3 }],
    warps: [
      { x: 4, y: 2, to: `trial:${o.trial}`, tx: 0, ty: 0 },
      { x: 5, y: 2, to: `trial:${o.trial}`, tx: 0, ty: 0 },
      { x: 4, y: 8, to: o.out[0].map, tx: o.out[0].x, ty: o.out[0].y, dir: 0 },
      { x: 5, y: 8, to: o.out[1].map, tx: o.out[1].x, ty: o.out[1].y, dir: 0 },
    ],
    npcs: [{ ...o.helper, x: 7, y: 4, dir: 1 }],
    triggers: [{ x: 3, y: 6, w: 4, h: 1, script: o.intro, when: `!${o.intro}` }],
  };
}

/**
 * A Trial's top floor: the Keeper in front of the Beacon. You arrive at (5, 7) from the last puzzle
 * room, facing the Keeper; the stairs at (9, 7) go back outside. The Keeper greets you when you step
 * forward.
 */
export function trialTop(o: { id: string; name: string; music?: string; beacon: string; keeper: NpcDef; out: Exit }): MapDef {
  return {
    id: o.id, name: o.name, music: o.music ?? 'beacon', outdoor: false, battleBg: 'trial', theme: 3,
    rows: ['WWWWWWWWWWW', 'WWWWWWWWWWW', 'fffffffffff', 'fffffffffff', 'fffffffffff', 'fffffffffff', 'fffffffffff', 'fffffffff^f', 'fffffffffff'],
    objects: [{ kind: 'beacon', x: 5, y: 3, id: 'beacon', litBy: o.beacon }, { kind: 'plant', x: 0, y: 7 }, { kind: 'plant', x: 10, y: 2 }],
    warps: [{ x: 9, y: 7, to: o.out.map, tx: o.out.x, ty: o.out.y, dir: 0 }],
    npcs: [{ ...o.keeper, x: 5, y: 5, dir: 0 }],
    triggers: [{ x: 4, y: 6, w: 3, h: 1, script: o.keeper.talk, when: `!beat:${o.keeper.trainer ?? o.keeper.id} & !hello:${o.keeper.id}` }],
  };
}
