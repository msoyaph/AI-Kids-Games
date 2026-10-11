// Better decorating: outdoor move / turn / nudge / undo, wall pieces, tabletop pieces, home undo,
// starter recipes, the Home décor rating bonus, and saving it all.
import { describe, expect, it } from 'vitest';
import { faceTile, makeGame } from './helpers';
import { countItem, give } from '../src/sim/inventory';
import {
  canPlace,
  canPlaceOnSurface,
  canPlaceWall,
  homeSnapshot,
  moveFurniture,
  moveSmall,
  moveWall,
  pitchTent,
  placeFromPockets,
  placeOnSurface,
  placeWall,
  restoreHomeSnapshot,
  slotTile,
  storeFurniture,
  storeWall,
  surfaceAt,
} from '../src/sim/housing';
import { decorAnchor, decorSnap, decorTilesOf, moveDecor, NUDGE_MAX, nudgeDecor, pickUpOutdoor, placeOutdoor, restoreDecor, rotateDecor } from '../src/sim/decor';
import { HOME_DECOR_MAX, homeDecorPoints, ratingBreakdown } from '../src/sim/rating';
import { STARTER_RECIPES } from '../src/data/recipes';
import { FURNITURE } from '../src/data/furniture';
import { decodeSave, encodeSave } from '../src/sim/save';
import type { Game } from '../src/sim/game';

const slotOf = (g: Game, id: string) => g.state.player.inv.findIndex((s) => s?.id === id);

/** Place a decoration somewhere open in the west lowlands; returns its anchor. */
function placeSomewhere(g: Game, id: string): number {
  give(g, id);
  const N = g.world.size;
  for (let i = 0; i < N * N; i++) {
    const x = i % N, z = (i / N) | 0;
    // wide-open grass so moves and turns have room
    let open = true;
    for (let dz = -2; dz <= 2 && open; dz++)
      for (let dx = -2; dx <= 3 && open; dx++) {
        if (!g.world.inb(x + dx, z + dz)) open = false;
        else {
          const k = g.world.idx(x + dx, z + dz);
          open = g.world.ground(k) === 2 && !g.world.obj(k) && !g.world.structure(k) && g.world.region(k) === 1 && g.world.height(k) === 0;
        }
      }
    if (!open || !faceTile(g, i)) continue;
    if (placeOutdoor(g, slotOf(g, id))) return decorAnchor(g, Number(Object.entries(g.state.world.objects).find(([, o]) => o.k === 'deco')![0]));
  }
  throw new Error('no space');
}

describe('outdoor decorations: edit in place', () => {
  it('moves a tile at a time, turns 4 ways, nudges finely, and undoes', () => {
    const g = makeGame(901);
    let a = placeSomewhere(g, 'furn_mossback_bench'); // 2x1
    const before = decorSnap(g, a)!;
    expect(before.tiles).toHaveLength(2);
    // move right and back down
    const moved = moveDecor(g, a, 1, 0);
    expect(moved).toBe(a + 1);
    a = moved;
    // turn through all four directions: footprint swaps on odd turns
    const shapes: number[] = [];
    const r0 = g.world.obj(a)!.r ?? 0;
    for (let k = 0; k < 4; k++) {
      a = rotateDecor(g, a);
      expect(a).toBeGreaterThanOrEqual(0);
      const t = decorTilesOf(g, a);
      shapes.push(new Set(t.map((i) => i % g.world.size)).size);
      expect(g.world.obj(a)!.r).toBe((r0 + k + 1) % 4);
    }
    // a 2x1 bench alternates between 1 and 2 columns wide
    expect(shapes).toEqual(r0 % 2 ? [2, 1, 2, 1] : [1, 2, 1, 2]);
    // fine nudges are visual and clamp
    for (let k = 0; k < 10; k++) nudgeDecor(g, a, 1, 0);
    expect(g.world.obj(a)!.nx).toBe(NUDGE_MAX);
    expect(nudgeDecor(g, a, 1, 0)).toBe(false);
    nudgeDecor(g, a, 0, -1);
    expect(g.world.obj(a)!.nz).toBe(-0.125);
    // moving keeps the nudge
    a = moveDecor(g, a, 0, 1);
    expect(g.world.obj(a)!.nx).toBe(NUDGE_MAX);
    // undo back to the very first state
    a = restoreDecor(g, a, before);
    expect(decorSnap(g, a)).toEqual(before);
    expect(Object.values(g.state.world.objects).filter((o) => o.k === 'deco')).toHaveLength(2);
  });

  it('refuses to move into blocked tiles, and put-away can be undone', () => {
    const g = makeGame(902);
    const a = placeSomewhere(g, 'furn_pocket_fern');
    const N = g.world.size;
    // put a rock to the right: the move is refused and nothing changes
    g.world.setObj(a + 1, { k: 'rock', v: 0 });
    expect(moveDecor(g, a, 1, 0)).toBe(-1);
    expect(g.world.obj(a)?.item).toBe('furn_pocket_fern');
    // off the map edge is refused too
    expect(moveDecor(g, a, -N, 0)).toBe(-1);
    const snap = decorSnap(g, a)!;
    expect(pickUpOutdoor(g, a)).toBe(true);
    expect(countItem(g, 'furn_pocket_fern')).toBe(1);
    expect(restoreDecor(g, -1, snap)).toBe(a);
    expect(countItem(g, 'furn_pocket_fern')).toBe(0);
    expect(g.world.obj(a)?.item).toBe('furn_pocket_fern');
  });

  it('wall pieces stay indoors', () => {
    const g = makeGame(903);
    give(g, 'furn_sunset_painting');
    const N = g.world.size;
    let tried = false;
    for (let i = 0; i < N * N && !tried; i++) {
      if (g.world.ground(i) !== 2 || g.world.obj(i) || g.world.structure(i) || !faceTile(g, i)) continue;
      expect(placeOutdoor(g, slotOf(g, 'furn_sunset_painting'))).toBe(false);
      tried = true;
    }
    expect(countItem(g, 'furn_sunset_painting')).toBe(1);
  });
});

describe('indoor decorating', () => {
  function home(): Game {
    const g = makeGame(910);
    pitchTent(g);
    g.state.home.level = 2; // 10 x 8 room
    return g;
  }

  it('hangs wall pieces without overlaps, moves and stores them', () => {
    const g = home();
    give(g, 'furn_sunset_painting'); // 2 wide
    give(g, 'furn_sunny_wallclock');
    expect(canPlace(g, 'furn_sunset_painting', 3, 3, 0)).toBe(false); // never on the floor
    expect(placeWall(g, { kind: 'pocket', index: slotOf(g, 'furn_sunset_painting') }, 0, 2)).toBe(true);
    expect(canPlaceWall(g, 'furn_sunny_wallclock', 0, 3)).toBe(false); // overlaps the painting
    expect(canPlaceWall(g, 'furn_sunny_wallclock', 0, 9)).toBe(true);
    expect(canPlaceWall(g, 'furn_sunny_wallclock', 0, 10)).toBe(false); // off the end
    expect(placeWall(g, { kind: 'pocket', index: slotOf(g, 'furn_sunny_wallclock') }, 1, 3)).toBe(true);
    const clock = g.state.home.walls.find((w) => w.id === 'furn_sunny_wallclock')!;
    expect(moveWall(g, clock.uid, 2, 7)).toBe(true);
    expect(moveWall(g, clock.uid, 2, 8)).toBe(false); // right wall is 8 deep
    expect(storeWall(g, clock.uid)).toBe(true);
    expect(g.state.home.storage.some((s) => s.id === 'furn_sunny_wallclock')).toBe(true);
  });

  it('small pieces sit on tables and ride along when the table moves', () => {
    const g = home();
    give(g, 'furn_plank_table'); // 2x1 surface
    give(g, 'furn_wick_lantern'); // small
    give(g, 'furn_bellbloom_vase'); // small
    give(g, 'furn_twiggy_chair'); // not small
    expect(placeFromPockets(g, slotOf(g, 'furn_plank_table'), 3, 3, 0)).toBe(true);
    const table = g.state.home.furniture.find((f) => f.id === 'furn_plank_table')!;
    expect(surfaceAt(g, 4, 3)).toEqual({ parent: table, slot: 1 });
    expect(canPlaceOnSurface(g, 'furn_twiggy_chair', table.uid, 0)).toBe(false);
    expect(placeOnSurface(g, { kind: 'pocket', index: slotOf(g, 'furn_wick_lantern') }, table.uid, 1)).toBe(true);
    expect(canPlaceOnSurface(g, 'furn_bellbloom_vase', table.uid, 1)).toBe(false); // slot taken
    expect(placeOnSurface(g, { kind: 'pocket', index: slotOf(g, 'furn_bellbloom_vase') }, table.uid, 0)).toBe(true);
    // pieces on top don't block the floor
    expect(canPlace(g, 'furn_twiggy_chair', 3, 4, 0)).toBe(true);
    // the table moves and turns; its lantern comes along
    expect(moveFurniture(g, table.uid, 5, 2, 1)).toBe(true);
    const lantern = g.state.home.furniture.find((f) => f.id === 'furn_wick_lantern')!;
    expect(lantern.on).toBe(table.uid);
    expect({ x: lantern.x, z: lantern.z }).toEqual(slotTile(table, 1));
    // the lantern can come down to the floor
    expect(moveSmall(g, lantern.uid, -1, 0, 1, 5, 0)).toBe(true);
    expect(lantern.on).toBeUndefined();
    // storing the table also stores what's on it
    expect(storeFurniture(g, table.uid)).toBe(true);
    expect(g.state.home.furniture.map((f) => f.id)).toEqual(['furn_wick_lantern']);
    expect(g.state.home.storage.map((s) => s.id).sort()).toEqual(['furn_bellbloom_vase', 'furn_plank_table']);
  });

  it('undo restores furniture, walls, storage and pockets exactly', () => {
    const g = home();
    give(g, 'furn_plank_table');
    give(g, 'furn_leafy_wreath');
    const snap = homeSnapshot(g);
    const inv = JSON.stringify(g.state.player.inv);
    placeFromPockets(g, slotOf(g, 'furn_plank_table'), 2, 2, 0);
    placeWall(g, { kind: 'pocket', index: slotOf(g, 'furn_leafy_wreath') }, 0, 0);
    expect(g.state.home.furniture).toHaveLength(1);
    restoreHomeSnapshot(g, snap);
    expect(g.state.home.furniture).toHaveLength(0);
    expect(g.state.home.walls).toHaveLength(0);
    expect(JSON.stringify(g.state.player.inv)).toBe(inv);
  });

  it('home décor adds a capped bonus to the Island Glow', () => {
    const g = home();
    const base = ratingBreakdown(g);
    expect(base.homeDecor).toBe(0);
    for (const id of ['furn_plank_table', 'furn_wick_lantern', 'furn_sunset_painting', 'furn_lantern_sconce']) give(g, id);
    placeFromPockets(g, slotOf(g, 'furn_plank_table'), 2, 2, 0);
    const table = g.state.home.furniture[0]!;
    placeOnSurface(g, { kind: 'pocket', index: slotOf(g, 'furn_wick_lantern') }, table.uid, 0);
    placeWall(g, { kind: 'pocket', index: slotOf(g, 'furn_sunset_painting') }, 0, 0);
    placeWall(g, { kind: 'pocket', index: slotOf(g, 'furn_lantern_sconce') }, 1, 0);
    expect(homeDecorPoints(g)).toBe(2 + 2 + 3 + 2);
    const b = ratingBreakdown(g);
    expect(b.homeDecor).toBe(2);
    expect(b.total).toBe(base.total + 2);
    // lots of furniture: never more than the cap
    for (let k = 0; k < 40; k++) g.state.home.walls.push({ uid: 1000 + k, id: 'furn_sunset_painting', wall: 0, pos: 0 });
    expect(ratingBreakdown(g).homeDecor).toBe(HOME_DECOR_MAX);
  });

  it('walls, tabletop pieces and nudges survive a save', () => {
    const g = home();
    give(g, 'furn_plank_table');
    give(g, 'furn_wick_lantern');
    give(g, 'furn_berry_wreath');
    placeFromPockets(g, slotOf(g, 'furn_plank_table'), 2, 2, 0);
    placeOnSurface(g, { kind: 'pocket', index: slotOf(g, 'furn_wick_lantern') }, g.state.home.furniture[0]!.uid, 1);
    placeWall(g, { kind: 'pocket', index: slotOf(g, 'furn_berry_wreath') }, 2, 4);
    g.state.world.objects[5000] = { k: 'deco', item: 'furn_pocket_fern', r: 3, q: 1, nx: 0.25, nz: -0.375 };
    const back = decodeSave(encodeSave(g.state));
    expect(back.home.furniture).toEqual(g.state.home.furniture);
    expect(back.home.walls).toEqual(g.state.home.walls);
    expect(back.world.objects[5000]).toEqual(g.state.world.objects[5000]);
  });
});

describe('starter furniture recipes', () => {
  it('are learned when the tent goes up', () => {
    const g = makeGame(920);
    expect(STARTER_RECIPES.some((r) => g.state.recipes.includes(r))).toBe(false);
    pitchTent(g);
    for (const r of STARTER_RECIPES) expect(g.state.recipes).toContain(r);
  });

  it('there are 12 wall pieces, half craftable, half sold in the shop', () => {
    const walls = FURNITURE.filter((f) => f.furn.layer === 'wall');
    expect(walls).toHaveLength(12);
    expect(walls.filter((f) => f.buy > 0)).toHaveLength(6);
  });
});
