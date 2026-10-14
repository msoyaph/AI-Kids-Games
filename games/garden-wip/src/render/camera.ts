// The diorama camera: fixed, looking at the garden from the front and above through a narrow lens
// (near-orthographic, so back lanes are as big as front ones), framing the board so it fills the
// layout's open area. Its tilt adapts to the screen's shape: wide phone screens get a lower tilt
// (the board's depth squeezes to fit), squarer screens a steeper, more top-down one, so the board
// fills the play area either way. Characters lean back toward the camera by `lean(pitch)`, so they
// always face the player at about the same gentle angle. Pure math over a three.js camera (no
// WebGL), so the pick and framing tests use exactly this. project/screenRay/rayToPlane follow
// farm-wip's render/camera.ts.
import * as THREE from 'three';
import { BOARD_D, BOARD_W, RUNWAY, TILE_D } from '../sim/board';
import { layout, type Insets } from '../ui/layout';

/** Vertical field of view, degrees: narrow, so the back lanes aren't smaller than the front ones. */
export const FOV = 12;
/** The tilt range (degrees below the horizon) the camera may use. */
export const PITCH_RANGE = [38, 82] as const;
/** Characters are seen from this many degrees above their front, whatever the tilt. */
export const VIEW_ANGLE = 27;
/** Tallest character (world units), for framing the back lane's heads. */
export const CHARACTER_H = 1.05;
/** What the board needs around it: the umbrellas on the left, the path in (and its bushes) on the right. */
export const MARGIN_X = [-0.62, RUNWAY + 0.3] as const;

/** How far characters lean back (radians) at a camera pitch (radians). */
export const lean = (pitch: number) => Math.max(0, pitch - (VIEW_ANGLE * Math.PI) / 180);

export interface Fit {
  pitch: number;
  /** Camera distance from the target. */
  distance: number;
  /** The view offset that centres the board in the open area (CSS px). */
  ox: number;
  oy: number;
}

/** The board with its margins: what must fill the open area. */
function boardPoints(): THREE.Vector3[] {
  const x0 = MARGIN_X[0], x1 = BOARD_W + MARGIN_X[1];
  return [new THREE.Vector3(x0, 0, -0.08), new THREE.Vector3(x1, 0, -0.08), new THREE.Vector3(x0, 0, BOARD_D + 0.1), new THREE.Vector3(x1, 0, BOARD_D + 0.1)];
}
const BOARD_POINTS = boardPoints();

/** The back lane's tallest heads at a pitch: they may rise into the top bar's strip, never above it. */
function headPoints(pitch: number): THREE.Vector3[] {
  const l = lean(pitch), z = TILE_D / 2 - CHARACTER_H * Math.sin(l), y = CHARACTER_H * Math.cos(l);
  return [new THREE.Vector3(MARGIN_X[0] + 0.3, y, z), new THREE.Vector3(BOARD_W + MARGIN_X[1] - 0.3, y, z)];
}

const target = new THREE.Vector3(BOARD_W / 2 + (MARGIN_X[0] + MARGIN_X[1]) / 2, 0, BOARD_D / 2);
const v = new THREE.Vector3();

/** Places the camera for a fit on a w × h CSS px screen. */
export function place(cam: THREE.PerspectiveCamera, w: number, h: number, fit: Fit) {
  cam.fov = FOV;
  cam.aspect = w / Math.max(1, h);
  cam.near = Math.max(0.1, fit.distance * 0.5);
  cam.far = fit.distance * 2 + 60;
  cam.position.set(target.x, target.y + Math.sin(fit.pitch) * fit.distance, target.z + Math.cos(fit.pitch) * fit.distance);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  cam.setViewOffset(w, h, fit.ox, fit.oy, w, h);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}

function bounds(cam: THREE.PerspectiveCamera, w: number, h: number, points: readonly THREE.Vector3[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of points) {
    v.copy(c).project(cam);
    const x = (v.x + 1) * 0.5 * w, y = (1 - v.y) * 0.5 * h;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** The board's width / height on screen at a pitch. */
export function boardAspect(cam: THREE.PerspectiveCamera, pitch: number) {
  place(cam, 1000, 1000, { pitch, distance: 60, ox: 0, oy: 0 });
  const b = bounds(cam, 1000, 1000, BOARD_POINTS);
  return (b.x1 - b.x0) / (b.y1 - b.y0);
}

/**
 * Frames the board as large as the open area allows: first the tilt whose picture has the open
 * area's shape (within PITCH_RANGE), then the distance and offset that make it fill and centre.
 * The back lane's heads may use `headroom` px above the open area (the top bar's strip).
 */
export function fitCamera(cam: THREE.PerspectiveCamera, w: number, h: number, insets?: Insets): Fit {
  const lay = layout(w, h, insets), open = lay.open;
  const headroom = Math.max(0, lay.topBar.h - 10);
  const ow = Math.max(1, open.w - 4), oh = Math.max(1, open.h - 4);
  const want = ow / oh;
  let pitch = (PITCH_RANGE[0] * Math.PI) / 180, best = Infinity;
  for (let deg = PITCH_RANGE[0]; deg <= PITCH_RANGE[1] + 1e-9; deg += 0.25) {
    const p = (deg * Math.PI) / 180, miss = Math.abs(Math.log(boardAspect(cam, p) / want));
    if (miss < best) { best = miss; pitch = p; }
  }
  const heads = headPoints(pitch);
  const cx = open.x + open.w / 2, cy = open.y + open.h / 2;
  const fit: Fit = { pitch, distance: 40, ox: w / 2 - cx, oy: h / 2 - cy };
  for (let round = 0; round < 16; round++) {
    place(cam, w, h, fit);
    const b = bounds(cam, w, h, BOARD_POINTS), top = bounds(cam, w, h, heads).y0;
    const scale = Math.max((b.x1 - b.x0) / ow, (b.y1 - b.y0) / oh, (b.y1 - top) / (oh + headroom));
    fit.distance *= scale;
    // centre the board; if the heads would rise past the headroom, slide it down to make room
    const dy = Math.max((b.y0 + b.y1) / 2 - cy, Math.min(0, top - (open.y + 2 - headroom)));
    fit.ox += (b.x0 + b.x1) / 2 - cx;
    fit.oy += dy;
    if (Math.abs(scale - 1) < 1e-4 && Math.abs((b.x0 + b.x1) / 2 - cx) < 0.05 && Math.abs(dy) < 0.05) break;
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

/** Where a point `h` up a leaned character (standing at x, z) is in the world. */
export function upLeaned(pitch: number, x: number, z: number, h: number, out = new THREE.Vector3()) {
  const l = lean(pitch);
  return out.set(x, h * Math.cos(l), z - h * Math.sin(l));
}
