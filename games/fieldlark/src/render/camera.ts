/**
 * The diorama camera: it looks down at a target point at a fixed tilt and turns around it in 45°
 * steps. Zoom is measured in screen pixels per tile at the middle of the screen, so a tile looks
 * the same size on a phone and on a big monitor at the same zoom.
 *
 * Pure math over a three.js PerspectiveCamera (no WebGL), so the tap-picking tests can use it.
 */
import * as THREE from 'three';
import { VIEW_Z_MAX, W } from '../sim/map';

/** Tilt above the horizon: low enough to see the fronts of buildings and the trees on the skyline. */
export const PITCH = (50 * Math.PI) / 180;
/** Vertical field of view, degrees: narrow, so the farm reads like a diorama. */
export const FOV = 30;
/**
 * Short screens (phones held sideways) narrow it to 20°. Zoom is pixels per tile, so a short screen
 * puts the camera close, and a wide field of view would then stretch tall things near the top.
 */
export const fovFor = (viewH: number) => Math.min(FOV, Math.max(20, 20 + ((viewH - 320) * 10) / 220));
/**
 * Pixels per tile at the screen's middle (CSS px, so the same on every screen). `min` keeps a tile at
 * least 32 px wide when zoomed all the way out; `max` is close enough to admire a crop or an animal.
 * `default` is the smallest starting zoom on a tablet or computer (see `startZoomRange`).
 */
export const ZOOM = { min: 32, max: 240, default: 80 } as const;
/** The smallest starting tile size: 64 px on phones, 80 px on tablets and computers. */
export const START_TILE_PX = { phone: 64, other: 80 } as const;
/** Phones: the screen's short side is under 600 CSS px. */
export const isPhoneScreen = (w: number, h: number) => Math.min(w, h) < 600;
/** The starting zoom is never below this for a screen size. */
export const startZoomMin = (w: number, h: number) => (isPhoneScreen(w, h) ? START_TILE_PX.phone : START_TILE_PX.other);
export const YAW_STEP = Math.PI / 4;

export interface View {
  /** Target, in tile units (world x and z). */
  x: number;
  z: number;
  /** Height of the ground at the target (eased by the view). */
  y: number;
  /** Turn in radians (yawStep × 45°, eased by the view). */
  yaw: number;
  zoom: number;
}

export const clampZoom = (z: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));
/** The target may go anywhere over the land, so every tile can be brought to the middle. */
/** The camera looks at the farm, and may pan south down the river to Larkford's square. */
export const clampTarget = (x: number, z: number): [number, number] => [Math.min(W, Math.max(0, x)), Math.min(VIEW_Z_MAX - 2, Math.max(0, z))];

/** Camera distance from the target that gives `zoom` pixels per world unit on a `viewH` px tall view. */
export function distanceFor(zoom: number, viewH: number) {
  return viewH / (2 * Math.tan(((fovFor(viewH) / 2) * Math.PI) / 180) * zoom);
}

/** Where the camera sits for a view: behind the target (towards +z at yaw 0) and above it. */
export function cameraPosition(v: View, viewH: number, out = new THREE.Vector3()) {
  const d = distanceFor(v.zoom, viewH);
  const flat = Math.cos(PITCH) * d;
  return out.set(v.x + Math.sin(v.yaw) * flat, v.y + Math.sin(PITCH) * d, v.z + Math.cos(v.yaw) * flat);
}

/**
 * Places a three.js camera for a view on a `viewW` × `viewH` CSS px screen. `center` is the screen
 * point where the target shows (the middle of the open area between the HUD bars); by default the
 * screen's middle.
 */
export function placeCamera(cam: THREE.PerspectiveCamera, v: View, viewW: number, viewH: number, center?: { x: number; y: number }) {
  const d = distanceFor(v.zoom, viewH);
  cam.fov = fovFor(viewH);
  cam.aspect = viewW / Math.max(1, viewH);
  cam.near = Math.max(0.1, d * 0.2);
  cam.far = d * 3 + 120;
  cameraPosition(v, viewH, cam.position);
  cam.up.set(0, 1, 0);
  cam.lookAt(v.x, v.y, v.z);
  // shift the picture so the target lands on `center` instead of the screen's middle
  const ox = center ? viewW / 2 - center.x : 0, oy = center ? viewH / 2 - center.y : 0;
  if (ox || oy) cam.setViewOffset(viewW, viewH, ox, oy, viewW, viewH);
  else cam.clearViewOffset();
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}

const ndc = new THREE.Vector3();

/** World point → CSS px on screen ({x, y, behind}). */
export function project(cam: THREE.PerspectiveCamera, viewW: number, viewH: number, x: number, y: number, z: number) {
  ndc.set(x, y, z).project(cam);
  return { x: (ndc.x + 1) * 0.5 * viewW, y: (1 - ndc.y) * 0.5 * viewH, behind: ndc.z > 1 };
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/** The ray under a screen point (CSS px). */
export function screenRay(cam: THREE.PerspectiveCamera, viewW: number, viewH: number, sx: number, sy: number): THREE.Ray {
  pointer.set((sx / viewW) * 2 - 1, -(sy / viewH) * 2 + 1);
  raycaster.setFromCamera(pointer, cam);
  return raycaster.ray.clone();
}

/** Where a ray meets the flat plane y = `planeY` (for dragging the map under a finger). */
export function rayToPlane(ray: THREE.Ray, planeY: number): { x: number; z: number } | null {
  if (Math.abs(ray.direction.y) < 1e-6) return null;
  const t = (planeY - ray.origin.y) / ray.direction.y;
  if (t < 0) return null;
  return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
}

/**
 * Screen directions turned into map directions for the current yaw: pressing "up" (or W) moves the
 * view away from the camera, "right" moves it to the screen's right.
 */
export function screenToMap(yaw: number, right: number, up: number): [number, number] {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // forward on the ground
  const rx = Math.cos(yaw), rz = -Math.sin(yaw); // right on the ground
  return [rx * right + fx * up, rz * right + fz * up];
}

export interface FramePoint { x: number; y: number; z: number }
export interface Frame { x: number; z: number; yawStep: number; zoom: number; fits: boolean }
export interface FrameOpts {
  /** Turns to try, best first; the first where everything fits at `minZoom` or closer wins. */
  yaws: readonly number[];
  minZoom: number;
  maxZoom: number;
  /** Share of the open area the points should fill (the rest is breathing room). */
  fill: number;
}

const fcam = new THREE.PerspectiveCamera();

/** The 8 corners of a box (a building's footprint and height), for framing. */
export function boxPoints(x0: number, z0: number, x1: number, z1: number, y0: number, h: number): FramePoint[] {
  const out: FramePoint[] = [];
  for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [y0, y0 + h]) out.push({ x, y, z });
  return out;
}

/** The target and zoom that fit `points` exactly into `rect` (CSS px) at one turn. */
function fitAt(points: readonly FramePoint[], yawStep: number, viewW: number, viewH: number, rect: { x: number; y: number; w: number; h: number }, groundY: number) {
  const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const yaw = yawStep * YAW_STEP;
  let tx = 0, tz = 0;
  for (const p of points) { tx += p.x; tz += p.z; }
  tx /= points.length; tz /= points.length;
  let zoom = 64;
  // the projection is nearly linear at this narrow field of view: a few rounds settle it
  for (let i = 0; i < 6; i++) {
    placeCamera(fcam, { x: tx, z: tz, y: groundY, yaw, zoom }, viewW, viewH, center);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) {
      const s = project(fcam, viewW, viewH, p.x, p.y, p.z);
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
    }
    const mx = (x0 + x1) / 2 - center.x, my = (y0 + y1) / 2 - center.y;
    const [dx, dz] = screenToMap(yaw, mx / zoom, -my / (zoom * Math.sin(PITCH)));
    tx += dx; tz += dz;
    zoom *= Math.min(rect.w / Math.max(1, x1 - x0), rect.h / Math.max(1, y1 - y0));
  }
  return { x: tx, z: tz, zoom };
}

/**
 * The view that shows every point inside `rect` (the open area between the HUD bars) with breathing
 * room. Tries the turns in order and takes the first where everything fits at `minZoom` or closer
 * (squeezing the breathing room down to 4% before giving up on a turn); if none does, the one that
 * comes closest, at `minZoom`, so a tile never starts smaller than that.
 */
export function frameView(points: readonly FramePoint[], viewW: number, viewH: number, rect: { x: number; y: number; w: number; h: number }, groundY: number, o: FrameOpts): Frame {
  let best: Frame | null = null;
  for (const yawStep of o.yaws) {
    const f = fitAt(points, yawStep, viewW, viewH, rect, groundY);
    const [x, z] = clampTarget(f.x, f.z);
    if (f.zoom * o.fill >= o.minZoom) return { x, z, yawStep, zoom: Math.min(o.maxZoom, f.zoom * o.fill), fits: true };
    if (f.zoom * 0.96 >= o.minZoom) return { x, z, yawStep, zoom: o.minZoom, fits: true };
    if (!best || f.zoom > best.zoom) best = { x, z, yawStep, zoom: f.zoom, fits: false };
  }
  return { ...best!, zoom: Math.min(o.maxZoom, Math.max(o.minZoom, best!.zoom)) };
}

/** How wide one tile at the target looks on screen (CSS px), measured by projecting its corners. */
export function tileWidthOnScreen(cam: THREE.PerspectiveCamera, viewW: number, viewH: number, x: number, y: number, z: number) {
  const a = project(cam, viewW, viewH, x - 0.5, y, z), b = project(cam, viewW, viewH, x + 0.5, y, z);
  const c = project(cam, viewW, viewH, x, y, z - 0.5), d = project(cam, viewW, viewH, x, y, z + 0.5);
  return Math.max(Math.abs(b.x - a.x), Math.abs(d.x - c.x));
}
