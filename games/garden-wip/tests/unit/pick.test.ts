// Every tile is reachable by tap at every supported screen size (the brief's tap test).
//
// For each supported viewport, including notches and the Dynamic Island, the camera frames the
// garden in the open area, and for all 45 tiles:
// - the tile's middle is inside the open area, clear of the top bar and the cards;
// - a tap on its middle picks exactly that tile;
// - a 44 px finger aimed at its middle picks it or snaps to it at all 9 points (middle and 8 around
//   at 22 px), even when every neighbour is planted (so a sloppy tap never plants next door);
// - the tile is at least 40 px wide and deep on screen (SAFETY.minTilePx).
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SAFETY } from '../../src/data/tuning';
import { pickNear, pickTile } from '../../src/input/pick';
import { fitCamera, project, screenRay } from '../../src/render/camera';
import { ALL_TILES, colX, laneZ, sameTile, TILE_D, TILE_W, type Tile } from '../../src/sim/board';
import { layout, SMALLEST_PHONE, SMALLEST_PHONE_TILE_PX, SUPPORTED_VIEWPORTS, type Rect, type Viewport } from '../../src/ui/layout';

const cam = new THREE.PerspectiveCamera();
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const FINGER = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4) * 22, Math.sin((i * Math.PI) / 4) * 22])] as const;

describe('tap picking', () => {
  for (const [vp, minTile] of [...SUPPORTED_VIEWPORTS.map(vp => [vp, SAFETY.minTilePx] as [Viewport, number]), [SMALLEST_PHONE, SMALLEST_PHONE_TILE_PX] as [Viewport, number]]) {
    it(`reaches every tile on a ${vp.name} (${vp.w}×${vp.h}), tiles at least ${minTile} px`, () => {
      const lay = layout(vp.w, vp.h, vp.insets);
      fitCamera(cam, vp.w, vp.h, vp.insets);
      const screenOf = (t: Tile) => project(cam, vp.w, vp.h, colX(t.col), 0, laneZ(t.lane));
      const problems: string[] = [];
      let smallest = Infinity;
      for (const tile of ALL_TILES) {
        const name = `lane ${tile.lane} col ${tile.col}`;
        const p = screenOf(tile);
        if (!inside(lay.open, p.x, p.y)) problems.push(`${name}: its middle is outside the open area`);
        if (inside(lay.topBar, p.x, p.y) || inside(lay.cardArea, p.x, p.y)) problems.push(`${name}: its middle is under the HUD`);
        if (!sameTile(pickTile(screenRay(cam, vp.w, vp.h, p.x, p.y)), tile)) problems.push(`${name}: a tap on its middle misses it`);
        for (const [dx, dy] of FINGER) {
          const sx = p.x + dx, sy = p.y + dy;
          const got = pickNear(pickTile(screenRay(cam, vp.w, vp.h, sx, sy)), sx, sy, t => sameTile(t, tile), screenOf);
          if (!sameTile(got, tile)) problems.push(`${name}: a finger ${dx.toFixed(0)},${dy.toFixed(0)} px off doesn't reach it`);
        }
        const x = colX(tile.col), z = laneZ(tile.lane);
        const left = project(cam, vp.w, vp.h, x - TILE_W / 2, 0, z), right = project(cam, vp.w, vp.h, x + TILE_W / 2, 0, z);
        const back = project(cam, vp.w, vp.h, x, 0, z - TILE_D / 2), front = project(cam, vp.w, vp.h, x, 0, z + TILE_D / 2);
        smallest = Math.min(smallest, Math.hypot(right.x - left.x, right.y - left.y), Math.hypot(front.x - back.x, front.y - back.y));
      }
      expect(problems.slice(0, 8)).toEqual([]);
      expect(smallest, 'smallest tile side on screen (px)').toBeGreaterThanOrEqual(minTile);
    });
  }

  it('is generous at the edges, and picks nothing well off the board', () => {
    const { w, h } = SMALLEST_PHONE;
    fitCamera(cam, w, h);
    const corner = project(cam, w, h, 0, 0, 0);
    expect(pickTile(screenRay(cam, w, h, corner.x - 6, corner.y - 6))).toEqual({ lane: 0, col: 0 });
    expect(pickTile(screenRay(cam, w, h, 2, 2))).toBeNull();
  });

  it('snaps only to tiles the action can use, and only within reach', () => {
    const { w, h } = SUPPORTED_VIEWPORTS[1]!;
    fitCamera(cam, w, h);
    const screenOf = (t: Tile) => project(cam, w, h, colX(t.col), 0, laneZ(t.lane));
    const planted = { lane: 2, col: 4 }, free = { lane: 2, col: 5 };
    const a = screenOf(planted), b = screenOf(free);
    const sx = a.x + (b.x - a.x) * 0.3, sy = a.y + (b.y - a.y) * 0.3;
    const hit = pickTile(screenRay(cam, w, h, sx, sy));
    expect(hit).toEqual(planted);
    expect(pickNear(hit, sx, sy, t => sameTile(t, free), screenOf)).toEqual(free);
    expect(pickNear(hit, sx, sy, () => false, screenOf)).toBeNull();
  });
});
