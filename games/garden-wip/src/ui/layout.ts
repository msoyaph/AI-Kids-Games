// The screen layout as numbers: the top bar, the plant cards (a column on the left when the screen
// is wider than tall, a row along the bottom when it's taller) and the open area between them where
// the garden is framed and taps reach it. style.css reads the same sizes from CSS variables that
// hud.ts sets from here, and the pick test (tests/unit/pick.test.ts) uses them to prove every tile
// can be tapped on every supported screen. Adapted from farm-wip's ui/layout.ts.

export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Rect { x: number; y: number; w: number; h: number }

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Every tap target is at least this big (CSS px). */
export const MIN_TARGET = 48;
/** Breathing room around the open area (CSS px). */
export const GAP = 6;

export interface Layout {
  /** Phones: a short side under 500 px. */
  compact: boolean;
  /** Cards down the left side (wide screens) or along the bottom (tall ones). */
  cards: 'column' | 'row';
  topBar: Rect;
  cardArea: Rect;
  /** A card's size (square-ish badge), CSS px. */
  card: number;
  /** Where the garden is framed; nothing covers it. */
  open: Rect;
}

export function layout(w: number, h: number, insets: Insets = NONE): Layout {
  const compact = Math.min(w, h) < 500;
  const top = Math.max(insets.top, GAP), left = Math.max(insets.left, GAP), right = Math.max(insets.right, GAP), bottom = Math.max(insets.bottom, GAP);
  const barH = compact ? 52 : 64;
  const card = compact ? 64 : 84;
  const topBar = { x: left, y: top, w: w - left - right, h: barH };
  const below = top + barH + GAP;
  if (w >= h) {
    const colW = card + 8;
    const cardArea = { x: left, y: below, w: colW, h: h - below - bottom };
    const ox = left + colW + GAP;
    return { compact, cards: 'column', topBar, cardArea, card, open: { x: ox, y: below, w: Math.max(0, w - ox - right), h: Math.max(0, h - below - bottom) } };
  }
  const rowH = card + 8;
  const cardArea = { x: left, y: h - bottom - rowH, w: w - left - right, h: rowH };
  return { compact, cards: 'row', topBar, cardArea, card, open: { x: left, y: below, w: Math.max(0, w - left - right), h: Math.max(0, cardArea.y - GAP - below) } };
}

export const openArea = (w: number, h: number, insets?: Insets) => layout(w, h, insets).open;

export interface Viewport { name: string; w: number; h: number; insets?: Insets }

const notchLandscape: Insets = { top: 0, right: 47, bottom: 21, left: 47 };
const islandLandscape: Insets = { top: 0, right: 59, bottom: 21, left: 59 };

/**
 * The screens the game supports and tests. Phones play sideways (upright phones see the rotate hint),
 * tablets and computers either way up. The smallest is 667×375 (iPhone SE 2nd/3rd generation, 6, 7, 8).
 */
export const SUPPORTED_VIEWPORTS: readonly Viewport[] = [
  { name: 'phone sideways', w: 667, h: 375 },
  { name: 'notched phone sideways', w: 844, h: 390, insets: notchLandscape },
  { name: 'big phone sideways', w: 932, h: 430, insets: islandLandscape },
  { name: 'android phone sideways', w: 915, h: 412 },
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'tablet sideways', w: 1024, h: 768 },
  { name: 'big tablet', w: 1024, h: 1366 },
  { name: 'big tablet sideways', w: 1366, h: 1024 },
  { name: 'laptop', w: 1280, h: 720 },
  { name: 'laptop plus', w: 1440, h: 900 },
  { name: 'desktop', w: 1920, h: 1080 },
  { name: 'big desktop', w: 2560, h: 1440 },
];

/**
 * Older 4-inch phones (568×320, the first iPhone SE) still play, with tiles a little under the 40 px
 * goal: there isn't room for 40 px tiles and the cards. Taps stay exact and generous there too.
 */
export const SMALLEST_PHONE: Viewport = { name: 'small phone sideways', w: 568, h: 320 };
/** The smallest tile side on SMALLEST_PHONE (CSS px). */
export const SMALLEST_PHONE_TILE_PX = 34;

/** True when the screen is a phone held upright: the game asks to turn it sideways. */
export const needsRotate = (w: number, h: number) => h > w && w < 500;
