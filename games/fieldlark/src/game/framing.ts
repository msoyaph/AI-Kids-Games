/**
 * Where the camera starts and where "Show me" takes it: the farmhouse and the fields for a new farm,
 * or whatever the goal pill or a tool is about. Pure math over the farm and the screen size.
 */
import { BUILDING } from '../data/buildings';
import { boxPoints, frameView, startZoomMin, ZOOM, type Frame, type FramePoint } from '../render/camera';
import { STEP_Y, tileAt } from '../sim/map';
import type { Obj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { sizeOf } from '../sim/world';
import { openArea, type Insets } from '../ui/layout';

const groundOf = (x: number, z: number) => tileAt(x, z).level * STEP_Y;

/**
 * The shape a thing takes on screen: its footprint and its height (a field counts its crop). Buildings
 * have pitched roofs: full height along the middle, lower at the eaves.
 */
export function objPoints(o: Obj): FramePoint[] {
  const size = sizeOf(o);
  const w = o.rot % 2 ? size.d : size.w, d = o.rot % 2 ? size.w : size.d;
  const y0 = groundOf(o.x, o.z);
  if (o.kind === 'field' || o.kind === 'tree' || !BUILDING[o.def]) return boxPoints(o.x, o.z, o.x + w, o.z + d, y0, o.kind === 'field' ? 0.5 : o.kind === 'tree' ? 1.6 : 1);
  const h = BUILDING[o.def]!.height ?? 1;
  const pts = boxPoints(o.x, o.z, o.x + w, o.z + d, y0, h * 0.62);
  // the ridge runs along the model's own x (east–west before turning)
  const cx = o.x + w / 2, cz = o.z + d / 2;
  if (o.rot % 2 === 0) pts.push({ x: o.x + 0.2, y: y0 + h, z: cz }, { x: o.x + w - 0.2, y: y0 + h, z: cz });
  else pts.push({ x: cx, y: y0 + h, z: o.z + 0.2 }, { x: cx, y: y0 + h, z: o.z + d - 0.2 });
  return pts;
}

/** A new farm starts on the farmhouse and its fields. */
export function startPoints(farm: Farm): FramePoint[] {
  const pts: FramePoint[] = [];
  for (const o of farm.objects) if (o.def === 'cottage' || o.kind === 'field') pts.push(...objPoints(o));
  return pts;
}

/** The starting view for a screen: everything in `startPoints`, as big as fits, never under the phone or computer minimum. */
export function startFrame(farm: Farm, viewW: number, viewH: number, insets?: Insets, points = startPoints(farm), yaws: readonly number[] = [0, 2, 6]): Frame {
  const cottage = farm.objects.find(o => o.def === 'cottage');
  return frameView(points, viewW, viewH, openArea(viewW, viewH, insets), cottage ? groundOf(cottage.x, cottage.z) : 0, {
    yaws, minZoom: startZoomMin(viewW, viewH), maxZoom: ZOOM.max, fill: 0.86,
  });
}

/**
 * "Show me": frame these tiles at the current turn, zooming out only as far as needed. Things spread
 * all over the farm: just the group nearest to where the camera is looking.
 */
export function showFrame(tiles: readonly { x: number; z: number }[], cam: { x: number; z: number; yawStep: number; zoom: number }, viewW: number, viewH: number, insets?: Insets): Frame | null {
  if (!tiles.length) return null;
  const rect = openArea(viewW, viewH, insets);
  const near = [...tiles].sort((a, b) => Math.hypot(a.x + 0.5 - cam.x, a.z + 0.5 - cam.z) - Math.hypot(b.x + 0.5 - cam.x, b.z + 0.5 - cam.z));
  const first = near[0]!;
  const opts = { yaws: [cam.yawStep], minZoom: ZOOM.min, maxZoom: Math.max(cam.zoom, startZoomMin(viewW, viewH)), fill: 0.8 };
  const pts = (list: readonly { x: number; z: number }[]) => list.flatMap(t => boxPoints(t.x, t.z, t.x + 1, t.z + 1, groundOf(t.x, t.z), 0.5));
  let f = frameView(pts(near), viewW, viewH, rect, groundOf(first.x, first.z), opts);
  if (f.zoom < startZoomMin(viewW, viewH) * 0.75) {
    // too spread out: the nearest group (within 6 tiles of the nearest one)
    const group = near.filter(t => Math.hypot(t.x - first.x, t.z - first.z) <= 6);
    f = frameView(pts(group), viewW, viewH, rect, groundOf(first.x, first.z), opts);
  }
  return f;
}
