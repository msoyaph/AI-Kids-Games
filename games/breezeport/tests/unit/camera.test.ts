/**
 * The starting camera (Fieldlark's minimums): a new town opens framed on City Hall and Main Street,
 * with a tile at least 64 px wide on phones (both ways up) and 80 px on tablets and computers; zoomed
 * all the way out a tile is still 32 px. The sideways-phone rail keeps nearly the whole height open.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { START_POINTS, startFrame } from '../../src/game/framing';
import { isPhoneScreen, placeCamera, project, START_TILE_PX, tileWidthOnScreen, YAW_STEP, ZOOM } from '../../src/render/camera';
import { isSideways, openArea, setRailSide, SUPPORTED_VIEWPORTS, type RailSide, type Viewport } from '../../src/ui/layout';

const cam = new THREE.PerspectiveCamera();
const KINDS: Viewport[] = [
  { name: 'phone portrait', w: 390, h: 844, insets: { top: 47, right: 0, bottom: 34, left: 0 } },
  { name: 'phone landscape', w: 844, h: 390, insets: { top: 0, right: 47, bottom: 21, left: 47 } },
  { name: 'tablet', w: 810, h: 1080 },
  { name: 'desktop', w: 1440, h: 900 },
];

function frameFor(vp: Viewport, side: RailSide = 'right') {
  setRailSide(side);
  const f = startFrame(vp.w, vp.h, vp.insets);
  const open = openArea(vp.w, vp.h, vp.insets);
  setRailSide('right');
  placeCamera(cam, { x: f.x, z: f.z, y: 0, yaw: f.yawStep * YAW_STEP, zoom: f.zoom }, vp.w, vp.h, { x: open.x + open.w / 2, y: open.y + open.h / 2 });
  return { f, open };
}

describe('starting camera', () => {
  for (const vp of [...KINDS, ...SUPPORTED_VIEWPORTS]) {
    it(`starts with big tiles on a ${vp.name} (${vp.w}×${vp.h})`, () => {
      const { f } = frameFor(vp);
      const min = isPhoneScreen(vp.w, vp.h) ? START_TILE_PX.phone : START_TILE_PX.other;
      expect(tileWidthOnScreen(cam, vp.w, vp.h, f.x, 0, f.z)).toBeGreaterThanOrEqual(min - 0.5);
    });
  }

  it('frames City Hall and Main Street on a desktop', () => {
    const vp = KINDS[3]!;
    const { open } = frameFor(vp);
    for (const p of START_POINTS) {
      const s = project(cam, vp.w, vp.h, p.x, p.y, p.z);
      expect(s.x).toBeGreaterThanOrEqual(open.x - 0.5);
      expect(s.x).toBeLessThanOrEqual(open.x + open.w + 0.5);
    }
  });

  it('keeps a tile at least 32 px wide zoomed all the way out', () => {
    placeCamera(cam, { x: 40, z: 40, y: 0, yaw: 0, zoom: ZOOM.min }, 390, 844);
    expect(tileWidthOnScreen(cam, 390, 844, 40, 0, 40)).toBeGreaterThanOrEqual(31.5);
  });

  it('gives the town nearly the whole height on a phone held sideways, with the rail on either side', () => {
    for (const vp of SUPPORTED_VIEWPORTS.filter(v => isSideways(v.w, v.h))) for (const side of ['right', 'left'] as const) {
      expect(openArea(vp.w, vp.h, vp.insets, side).h).toBeGreaterThanOrEqual(vp.h * 0.78);
    }
  });
});
