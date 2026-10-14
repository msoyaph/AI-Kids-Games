// The diorama camera: fixed, tilted down at the garden from the front, framing the board (with the
// umbrella strip on the left and a little of the critters' path on the right) inside the layout's
// open area. Pure math over a three.js PerspectiveCamera (no WebGL), so the pick test can use it.
// project/screenRay/rayToPlane follow farm-wip's render/camera.ts.
import * as THREE from 'three';
import { BOARD_D, BOARD_W } from '../sim/board';
import { openArea, type Insets } from '../ui/layout';

/** Tilt below the horizon. */
export const PITCH = (55 * Math.PI) / 180;
/** Vertical field of view, degrees: narrow, so the garden reads like a diorama and far tiles stay big. */
export const FOV = 22;
/** What must fit on screen: the tiles, the umbrellas (x < 0), the path in (x > board) and plant tops. */
export const FIT_BOX = { x0: -0.9, x1: BOARD_W + 0.5, z0: -0.15, z1: BOARD_D + 0.2, y0: 0, y1: 0.6 } as const;
/** Space kept between the framed box and the open area's edges (CSS px). */
const MARGIN = 4;

export interface Fit {
  /** Camera distance from the target. */
  distance: number;
  /** The view offset that centres the box in the open area (CSS px). */
  ox: number;
  oy: number;
}

const corners = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
  i & 1 ? FIT_BOX.x1 : FIT_BOX.x0, i & 2 ? FIT_BOX.y1 : FIT_BOX.y0, i & 4 ? FIT_BOX.z1 : FIT_BOX.z0));
const target = new THREE.Vector3((FIT_BOX.x0 + FIT_BOX.x1) / 2, 0, (FIT_BOX.z0 + FIT_BOX.z1) / 2);
const v = new THREE.Vector3();

/** Places the camera at `distance` with view offset (ox, oy) on a w × h CSS px screen. */
export function place(cam: THREE.PerspectiveCamera, w: number, h: number, fit: Fit) {
  cam.fov = FOV;
  cam.aspect = w / Math.max(1, h);
  cam.near = Math.max(0.1, fit.distance * 0.3);
  cam.far = fit.distance * 3 + 40;
  cam.position.set(target.x, target.y + Math.sin(PITCH) * fit.distance, target.z + Math.cos(PITCH) * fit.distance);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  cam.setViewOffset(w, h, fit.ox, fit.oy, w, h);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}

/** The box's bounds on screen for the camera as placed. */
function bounds(cam: THREE.PerspectiveCamera, w: number, h: number) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of corners) {
    v.copy(c).project(cam);
    const x = (v.x + 1) * 0.5 * w, y = (1 - v.y) * 0.5 * h;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/**
 * Frames the garden as large as the open area allows and centres it there. A few rounds converge:
 * the picture's size goes as 1 / distance, and the view offset slides it into place.
 */
export function fitCamera(cam: THREE.PerspectiveCamera, w: number, h: number, insets?: Insets): Fit {
  const open = openArea(w, h, insets);
  const ow = Math.max(1, open.w - 2 * MARGIN), oh = Math.max(1, open.h - 2 * MARGIN);
  const cx = open.x + open.w / 2, cy = open.y + open.h / 2;
  const fit: Fit = { distance: 20, ox: w / 2 - cx, oy: h / 2 - cy };
  for (let round = 0; round < 12; round++) {
    place(cam, w, h, fit);
    const b = bounds(cam, w, h);
    const scale = Math.max((b.x1 - b.x0) / ow, (b.y1 - b.y0) / oh);
    fit.distance *= scale;
    // slide the picture so the box's middle lands on the open area's middle
    fit.ox += (b.x0 + b.x1) / 2 - cx;
    fit.oy += (b.y0 + b.y1) / 2 - cy;
    if (Math.abs(scale - 1) < 1e-4 && Math.abs((b.x0 + b.x1) / 2 - cx) < 0.05 && Math.abs((b.y0 + b.y1) / 2 - cy) < 0.05) break;
  }
  place(cam, w, h, fit);
  return fit;
}

const ndc = new THREE.Vector3();

/** World point → CSS px on screen. */
export function project(cam: THREE.PerspectiveCamera, w: number, h: number, x: number, y: number, z: number) {
  ndc.set(x, y, z).project(cam);
  return { x: (ndc.x + 1) * 0.5 * w, y: (1 - ndc.y) * 0.5 * h };
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/** The ray under a screen point (CSS px). */
export function screenRay(cam: THREE.PerspectiveCamera, w: number, h: number, sx: number, sy: number): THREE.Ray {
  pointer.set((sx / w) * 2 - 1, -(sy / h) * 2 + 1);
  raycaster.setFromCamera(pointer, cam);
  return raycaster.ray;
}

/** Where a ray meets the flat plane y = planeY. */
export function rayToPlane(ray: THREE.Ray, planeY = 0): { x: number; z: number } | null {
  if (Math.abs(ray.direction.y) < 1e-6) return null;
  const t = (planeY - ray.origin.y) / ray.direction.y;
  if (t < 0) return null;
  return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
}
