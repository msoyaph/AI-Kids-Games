import { PerspectiveCamera, Vector3 } from 'three';

export interface CameraPose {
  pos: Vector3;
  look: Vector3;
  fov: number;
}

/**
 * A pose that shows `target` at a spot on screen (cx, cy as fractions of the screen, y down) with
 * `height` world units filling `frac` of the screen height. The camera looks at the target from the
 * front (+z), a little from above; `offX/offY` are the view offset that moves the target off-center.
 */
export function focusPose(target: Vector3, height: number, frac: number, cx: number, cy: number, fov = 34, lift = 0.18): { pose: CameraPose; offX: number; offY: number } {
  const dist = height / frac / 2 / Math.tan((fov * Math.PI) / 360);
  const pos = new Vector3(target.x, target.y + dist * lift, target.z + dist);
  return { pose: { pos, look: target.clone(), fov }, offX: cx - 0.5, offY: cy - 0.5 };
}

/** Point a camera along a pose, shifting the picture by (offX, offY) screen fractions. */
export function applyPose(cam: PerspectiveCamera, pos: Vector3, look: Vector3, fov: number, offX: number, offY: number, w: number, h: number): void {
  cam.position.copy(pos);
  cam.lookAt(look);
  cam.fov = fov;
  cam.aspect = w / Math.max(1, h);
  if (Math.abs(offX) > 1e-4 || Math.abs(offY) > 1e-4) cam.setViewOffset(w, h, -offX * w, -offY * h, w, h);
  else if (cam.view) cam.clearViewOffset();
  cam.updateProjectionMatrix();
}
