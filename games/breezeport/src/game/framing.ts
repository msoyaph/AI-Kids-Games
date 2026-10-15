/**
 * Where the camera starts: a new town is framed on City Hall and Main Street, as big as fits between
 * the HUD bars, never smaller than the phone or computer starting tile size (Fieldlark's minimums:
 * 64 px a tile on phones, 80 px on tablets and computers). Pure math over the screen size.
 */
import { boxPoints, frameView, startZoomMin, ZOOM, type Frame, type FramePoint } from '../render/camera';
import { openArea, type Insets } from '../ui/layout';

/** City Hall, the old cottages and the start of Main Street, with their roofs. */
export const START_POINTS: readonly FramePoint[] = boxPoints(35, 5, 47, 16, 0, 1.6);

export function startFrame(viewW: number, viewH: number, insets?: Insets, points: readonly FramePoint[] = START_POINTS, yaws: readonly number[] = [0]): Frame {
  return frameView(points, viewW, viewH, openArea(viewW, viewH, insets), 0, { yaws, minZoom: startZoomMin(viewW, viewH), maxZoom: ZOOM.max, fill: 0.86 });
}
