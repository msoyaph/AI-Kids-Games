import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyPose, focusPose } from '../../src/r3/framing';

/** Screen fractions (0..1, y down) where a world point lands. */
function onScreen(cam: PerspectiveCamera, p: Vector3): { x: number; y: number } {
  const v = p.clone().project(cam);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
}

describe('camera framing for panels beside 3D subjects', () => {
  for (const [w, h] of [[1280, 720], [960, 720], [1560, 720]]) {
    it(`puts the subject where the DOM window is (${w}x${h})`, () => {
      const target = new Vector3(12, 3, -4);
      for (const [cx, cy, frac] of [[0.2, 0.45, 0.5], [0.76, 0.3, 0.3], [0.5, 0.5, 0.7]]) {
        const f = focusPose(target, 2, frac, cx, cy, 34, 0.12);
        const cam = new PerspectiveCamera(50, 1, 0.1, 1000);
        applyPose(cam, f.pose.pos, f.pose.look, f.pose.fov, f.offX, f.offY, w, h);
        cam.updateMatrixWorld();
        const c = onScreen(cam, target);
        expect(c.x).toBeCloseTo(cx, 3);
        expect(c.y).toBeCloseTo(cy, 3);
        // The subject's height fills about `frac` of the screen.
        const up = onScreen(cam, target.clone().add(new Vector3(0, 1, 0)));
        const dn = onScreen(cam, target.clone().add(new Vector3(0, -1, 0)));
        expect(Math.abs(dn.y - up.y)).toBeGreaterThan(frac * 0.9);
        expect(Math.abs(dn.y - up.y)).toBeLessThan(frac * 1.1);
      }
    });
  }
});
