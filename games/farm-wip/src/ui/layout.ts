/**
 * Screen layout as numbers: how much room the HUD's top bar and bottom tool bar take, and the open
 * middle where taps reach the farm. style.css uses the same sizes (--top-bar, --tool-bar); the
 * picking tests use this to prove every tile can be brought into the open middle and tapped.
 */

export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** Heights of the HUD bars, in CSS px (without the device's safe-area insets). */
export const TOP_BAR = 60;
export const TOOL_BAR = 76;
/** Every tap target is at least this big (CSS px). */
export const MIN_TARGET = 48;

/** The open middle of the screen, where nothing covers the farm. */
export function openArea(viewW: number, viewH: number, insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): Rect {
  const top = Math.max(insets.top, 8) + TOP_BAR;
  const bottom = Math.max(insets.bottom, 8) + TOOL_BAR;
  const left = Math.max(insets.left, 0), right = Math.max(insets.right, 0);
  return { x: left, y: top, w: Math.max(0, viewW - left - right), h: Math.max(0, viewH - top - bottom) };
}

export interface Viewport { name: string; w: number; h: number; insets?: Insets }

const notchPortrait: Insets = { top: 47, right: 0, bottom: 34, left: 0 };
const notchLandscape: Insets = { top: 0, right: 47, bottom: 21, left: 47 };

/** The screens the game supports and tests: phones both ways up, tablets, laptops and desktops. */
export const SUPPORTED_VIEWPORTS: readonly Viewport[] = [
  { name: 'small phone', w: 320, h: 568 },
  { name: 'phone', w: 375, h: 667 },
  { name: 'notched phone', w: 390, h: 844, insets: notchPortrait },
  { name: 'big phone', w: 430, h: 932, insets: notchPortrait },
  { name: 'android phone', w: 412, h: 915 },
  { name: 'small phone sideways', w: 568, h: 320 },
  { name: 'phone sideways', w: 667, h: 375 },
  { name: 'notched phone sideways', w: 844, h: 390, insets: notchLandscape },
  { name: 'big phone sideways', w: 932, h: 430, insets: notchLandscape },
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'tablet sideways', w: 1024, h: 768 },
  { name: 'big tablet', w: 1024, h: 1366 },
  { name: 'big tablet sideways', w: 1366, h: 1024 },
  { name: 'laptop', w: 1280, h: 720 },
  { name: 'laptop plus', w: 1440, h: 900 },
  { name: 'desktop', w: 1920, h: 1080 },
  { name: 'big desktop', w: 2560, h: 1440 },
];
