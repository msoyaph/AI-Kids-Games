/**
 * Every tile is reachable by tap at every supported screen size (Fieldlark's test, on Breezeport's
 * 80 × 80 map). For each supported viewport, both the default and the closest zoom, and each of the
 * 8 camera turns, every tile is brought to the middle of the open area (between the HUD bars) and a
 * tap there must pick exactly that tile. Finger-sized taps (22 px from the middle in 8 directions at
 * the closest zoom, 9 px at the default) must still pick it at 3 or more turns.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { clampTarget, placeCamera, project, screenRay, YAW_STEP, ZOOM } from '../../src/render/camera';
import { pickNear, pickTile } from '../../src/input/pick';
import { H, topY, W } from '../../src/sim/map';
import { openArea, SUPPORTED_VIEWPORTS } from '../../src/ui/layout';

const cam = new THREE.PerspectiveCamera();
const DIRS = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)] as const);

function frame(x: number, z: number, yawStep: number, zoom: number, vw: number, vh: number, center: { x: number; y: number }) {
  placeCamera(cam, { x: x + 0.5, z: z + 0.5, y: topY(x, z), yaw: yawStep * YAW_STEP, zoom }, vw, vh, center);
}
const picks = (vw: number, vh: number, sx: number, sy: number, x: number, z: number) => {
  const hit = pickTile(screenRay(cam, vw, vh, sx, sy));
  return !!hit && hit.x === x && hit.z === z;
};

describe('tap picking', () => {
  it('lets the camera centre on every tile', () => {
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) expect(clampTarget(x + 0.5, z + 0.5)).toEqual([x + 0.5, z + 0.5]);
  });

  for (const vp of SUPPORTED_VIEWPORTS) {
    it(`reaches every tile on a ${vp.name} (${vp.w}×${vp.h}) at every turn and zoom`, () => {
      const open = openArea(vp.w, vp.h, vp.insets);
      const center = { x: open.x + open.w / 2, y: open.y + open.h / 2 };
      expect(open.w).toBeGreaterThanOrEqual(120);
      expect(open.h).toBeGreaterThanOrEqual(120);
      const problems: string[] = [];
      let framed = 0;
      for (const [zoom, reach] of [[ZOOM.default, 9], [ZOOM.max, 22]] as const) {
        for (let z = 0; z < H && problems.length < 6; z++) for (let x = 0; x < W && problems.length < 6; x++) {
          let roomy = 0;
          for (let yawStep = 0; yawStep < 8; yawStep++) {
            frame(x, z, yawStep, zoom, vp.w, vp.h, center);
            framed++;
            const p = project(cam, vp.w, vp.h, x + 0.5, topY(x, z), z + 0.5);
            if (Math.abs(p.x - center.x) > 0.5 || Math.abs(p.y - center.y) > 0.5) problems.push(`${x},${z} turn ${yawStep}: framed at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
            if (!picks(vp.w, vp.h, p.x, p.y, x, z)) problems.push(`${x},${z} turn ${yawStep} zoom ${zoom}: a tap on its middle misses it`);
            if (DIRS.every(([dx, dy]) => picks(vp.w, vp.h, p.x + dx * reach, p.y + dy * reach, x, z))) roomy++;
          }
          if (roomy < 3) problems.push(`${x},${z} zoom ${zoom}: a ${reach * 2} px finger fits at only ${roomy} of 8 turns`);
        }
      }
      expect(problems).toEqual([]);
      expect(framed).toBe(2 * 8 * W * H);
    });
  }

  it('is generous: a tap just beside a wanted tile still finds it', () => {
    const vw = 390, vh = 844;
    const open = openArea(vw, vh);
    const center = { x: open.x + open.w / 2, y: open.y + open.h / 2 };
    frame(40, 30, 1, 38, vw, vh, center);
    const screenOf = (x: number, z: number) => project(cam, vw, vh, x + 0.5, topY(x, z), z + 0.5);
    const target = screenOf(41, 30);
    const sx = center.x + (target.x - center.x) * 0.3, sy = center.y + (target.y - center.y) * 0.3;
    const hit = pickTile(screenRay(cam, vw, vh, sx, sy));
    expect(hit && { x: hit.x, z: hit.z }).toEqual({ x: 40, z: 30 });
    const wanted = (x: number, z: number) => x === 41 && z === 30;
    expect(pickNear(hit, sx, sy, 40, wanted, screenOf)).toEqual({ x: 41, z: 30 });
    const far = pickTile(screenRay(cam, vw, vh, sx - 150, sy));
    expect(pickNear(far, sx - 150, sy, 40, wanted, screenOf)).toBeNull();
  });

  it('picks nothing when the tap is on the sky', () => {
    placeCamera(cam, { x: 40, z: 4, y: 0, yaw: 0, zoom: ZOOM.min }, 1920, 1080);
    expect(pickTile(screenRay(cam, 1920, 1080, 960, 2))).toBeNull();
  });
});
