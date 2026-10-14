/**
 * The diorama camera: it looks down at a target point at a fixed tilt and turns around it in 45°
 * steps. Zoom is measured in screen pixels per tile at the middle of the screen, so a tile looks
 * the same size on a phone and on a big monitor at the same zoom.
 *
 * Pure math over a three.js PerspectiveCamera (no WebGL), so the tap-picking tests can use it.
 */
import * as THREE from 'three';
import { H, W } from '../sim/map';

/** Tilt above the horizon. */
export const PITCH = (55 * Math.PI) / 180;
/** Vertical field of view, degrees: narrow, so the farm reads like a diorama. */
export const FOV = 30;
/** Pixels per tile at the screen's middle. MAX keeps a tile at least 48 px tall (72 × sin 55° ≈ 59). */
export const ZOOM = { min: 12, max: 72, default: 38 } as const;
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
export const clampTarget = (x: number, z: number): [number, number] => [Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, z))];

/** Camera distance from the target that gives `zoom` pixels per world unit on a `viewH` px tall view. */
export function distanceFor(zoom: number, viewH: number) {
  return viewH / (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * zoom);
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
  cam.fov = FOV;
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
