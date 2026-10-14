/**
 * The starting camera: a new farm opens close enough to manage comfortably, framed on the farmhouse
 * and its fields, on every kind of screen.
 *
 * - A tile at the default (starting) zoom is at least 64 px wide on phones (portrait and landscape)
 *   and at least 80 px on tablets and computers, measured by projecting a real tile.
 * - Zoomed all the way out, a tile is still at least 32 px; all the way in, close enough to admire a
 *   crop (over 160 px).
 * - The farmhouse and every field are fully inside the open area between the HUD bars on every
 *   supported screen. Phones held sideways use the side layout (a compact top row and the tools in a
 *   rail down one side), checked with the rail on the right and on the left.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { startFrame, startPoints } from '../../src/game/framing';
import { placeCamera, project, START_TILE_PX, tileWidthOnScreen, YAW_STEP, ZOOM, isPhoneScreen } from '../../src/render/camera';
import { newFarm } from '../../src/sim/state';
import { isSideways, openArea, setRailSide, SUPPORTED_VIEWPORTS, type RailSide, type Viewport } from '../../src/ui/layout';

const cam = new THREE.PerspectiveCamera();
const farm = newFarm(7);

/** The four kinds of screen the brief names, plus every supported viewport. */
const KINDS: Viewport[] = [
  { name: 'phone portrait', w: 390, h: 844, insets: { top: 47, right: 0, bottom: 34, left: 0 } },
  { name: 'phone landscape', w: 844, h: 390, insets: { top: 0, right: 47, bottom: 21, left: 47 } },
  { name: 'tablet', w: 810, h: 1080 },
  { name: 'desktop', w: 1440, h: 900 },
];

function frameFor(vp: Viewport, side: RailSide = 'right') {
  setRailSide(side);
  const f = startFrame(farm, vp.w, vp.h, vp.insets);
  const open = openArea(vp.w, vp.h, vp.insets);
  setRailSide('right');
  placeCamera(cam, { x: f.x, z: f.z, y: 0, yaw: f.yawStep * YAW_STEP, zoom: f.zoom }, vp.w, vp.h, { x: open.x + open.w / 2, y: open.y + open.h / 2 });
  return { f, open };
}

describe('starting camera', () => {
  for (const vp of [...KINDS, ...SUPPORTED_VIEWPORTS]) {
    it(`starts with big tiles on a ${vp.name} (${vp.w}×${vp.h})`, () => {
      const { f } = frameFor(vp);
      const px = tileWidthOnScreen(cam, vp.w, vp.h, f.x, 0, f.z);
      const min = isPhoneScreen(vp.w, vp.h) ? START_TILE_PX.phone : START_TILE_PX.other;
      expect(px).toBeGreaterThanOrEqual(min - 0.5);
    });
  }

  it('calls phones phones and the rest tablets or computers', () => {
    expect(isPhoneScreen(390, 844)).toBe(true);
    expect(isPhoneScreen(844, 390)).toBe(true);
    expect(isPhoneScreen(810, 1080)).toBe(false);
    expect(isPhoneScreen(1440, 900)).toBe(false);
  });

  // every screen, and sideways phones with the tool rail on either side
  const CASES: [Viewport, RailSide][] = [...KINDS, ...SUPPORTED_VIEWPORTS].flatMap(vp => (isSideways(vp.w, vp.h) ? [[vp, 'right'], [vp, 'left']] : [[vp, 'right']]) as [Viewport, RailSide][]);
  for (const [vp, side] of CASES) {
    it(`shows the whole farmhouse and every field on a ${vp.name} (${vp.w}×${vp.h}${isSideways(vp.w, vp.h) ? `, tools on the ${side}` : ''})`, () => {
      const { f, open } = frameFor(vp, side);
      expect(f.fits).toBe(true);
      const min = isPhoneScreen(vp.w, vp.h) ? START_TILE_PX.phone : START_TILE_PX.other;
      expect(tileWidthOnScreen(cam, vp.w, vp.h, f.x, 0, f.z)).toBeGreaterThanOrEqual(min - 0.5);
      for (const p of startPoints(farm)) {
        const s = project(cam, vp.w, vp.h, p.x, p.y, p.z);
        expect(s.x).toBeGreaterThanOrEqual(open.x - 0.5);
        expect(s.x).toBeLessThanOrEqual(open.x + open.w + 0.5);
        expect(s.y).toBeGreaterThanOrEqual(open.y - 0.5);
        expect(s.y).toBeLessThanOrEqual(open.y + open.h + 0.5);
      }
    });
  }

  it('gives the farm nearly the whole height on a phone held sideways, with the rail on either side', () => {
    for (const vp of SUPPORTED_VIEWPORTS.filter(v => isSideways(v.w, v.h))) {
      for (const side of ['right', 'left'] as const) {
        const open = openArea(vp.w, vp.h, vp.insets, side);
        expect(open.h).toBeGreaterThanOrEqual(vp.h * 0.78);
        // the rail's column is outside the open area, on its own side
        if (side === 'right') expect(open.x + open.w).toBeLessThanOrEqual(vp.w - 64);
        else expect(open.x).toBeGreaterThanOrEqual(64);
      }
    }
  });

  it('keeps a tile at least 32 px when zoomed out, and lets you get close', () => {
    expect(ZOOM.min).toBeGreaterThanOrEqual(32);
    placeCamera(cam, { x: 28, z: 28, y: 0, yaw: 0, zoom: ZOOM.min }, 1920, 1080);
    expect(tileWidthOnScreen(cam, 1920, 1080, 28, 0, 28)).toBeGreaterThanOrEqual(31.5);
    expect(ZOOM.max).toBeGreaterThan(160);
  });
});
