/**
 * Where everything goes, from the viewport size and the safe-area insets (pure, unit-tested).
 * Portrait (phones): score bar on top, the board, the tray shelf below it, helpers at the bottom.
 * Landscape (tablets, computers, phones on their side): score and helpers in a column on the
 * left, the board in the middle, the tray standing in a column on the right.
 */
export interface Rect { x: number; y: number; w: number; h: number }
export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Layout {
  w: number; h: number; portrait: boolean;
  board: Rect; cell: number;
  tray: Rect; slots: [Rect, Rect, Rect]; trayCell: number;
  hud: Rect; helpers: Rect; pause: Rect;
  /** Where the streak meter's pips go. */
  streak: Rect;
  /** Pixels of finger-to-piece lift while dragging by touch. */
  lift: number;
}

const GAP = 12, BAR = 64, HELPERS = 64, MAX_BOARD = 640, PAUSE = 56, STREAK = 26;
/** The board panel's frame reaches 0.2 cells outside the grid on each side. */
const FRAME = 1 + 0.5 / 8;

export function layout(w: number, h: number, inset: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): Layout {
  const l = Math.max(GAP, inset.left + 8), r = Math.max(GAP, inset.right + 8), t = Math.max(GAP, inset.top + 8), b = Math.max(GAP, inset.bottom + 8);
  const aw = w - l - r, ah = h - t - b;
  // Landscape when the side columns fit beside a board at least as big as portrait's would be.
  const portraitBoard = Math.min(aw / FRAME, (ah - BAR - HELPERS - STREAK - 3 * GAP) / (FRAME + 0.36), MAX_BOARD);
  const landscapeBoard = Math.min(ah / FRAME, (aw - 4 * GAP) / (FRAME + 0.8), MAX_BOARD);
  // (the side columns are 0.4 board each; FRAME covers the panel's frame on both sides)
  const portrait = !(w > h && landscapeBoard >= portraitBoard * 0.92);
  if (portrait) {
    const size = Math.floor(Math.max(160, portraitBoard));
    const trayH = Math.round(size * 0.36);
    const total = BAR + GAP + size + STREAK + trayH + GAP + HELPERS;
    const top = t + Math.max(0, (ah - total) / 2);
    const x = Math.round(l + (aw - size) / 2);
    const hud = { x, y: top, w: size, h: BAR };
    const board = { x, y: Math.round(top + BAR + GAP), w: size, h: size };
    const streak = { x, y: board.y + size + size * 0.025, w: size, h: STREAK };
    const tray = { x, y: board.y + size + STREAK, w: size, h: trayH };
    const sw = size / 3;
    const slots = [0, 1, 2].map(i => ({ x: tray.x + i * sw, y: tray.y, w: sw, h: trayH })) as [Rect, Rect, Rect];
    const helpers = { x, y: tray.y + trayH + GAP, w: size, h: HELPERS };
    return finish(w, h, true, board, tray, slots, hud, helpers, { x: x + size - PAUSE, y: top + (BAR - PAUSE) / 2, w: PAUSE, h: PAUSE }, streak);
  }
  const size = Math.floor(Math.max(160, landscapeBoard));
  const side = Math.round(size * 0.4);
  const frame = Math.ceil(size / 8 * 0.2); // the board panel's frame
  const total = side + (GAP + frame) * 2 + size + side;
  const left = l + Math.max(0, (aw - total) / 2);
  const top = t + Math.max(0, (ah - size) / 2);
  const hud = { x: left, y: top, w: side, h: Math.min(size * 0.4, 150) };
  const streak = { x: left, y: hud.y + hud.h + GAP, w: side, h: STREAK };
  const helpers = { x: left, y: top + size - Math.min(size * 0.5, 3 * 64 + 2 * 8), w: side, h: Math.min(size * 0.5, 3 * 64 + 2 * 8) };
  const board = { x: Math.round(left + side + GAP + frame), y: Math.round(top), w: size, h: size };
  const tray = { x: board.x + size + frame + GAP, y: top, w: side, h: size };
  const sh = size / 3;
  const slots = [0, 1, 2].map(i => ({ x: tray.x, y: tray.y + i * sh, w: side, h: sh })) as [Rect, Rect, Rect];
  return finish(w, h, false, board, tray, slots, hud, helpers, { x: w - r - PAUSE, y: t, w: PAUSE, h: PAUSE }, streak);
}

function finish(w: number, h: number, portrait: boolean, board: Rect, tray: Rect, slots: [Rect, Rect, Rect], hud: Rect, helpers: Rect, pause: Rect, streak: Rect): Layout {
  const cell = board.w / 8;
  // Tray pieces share one cell size (sizes stay comparable); a 3×3 fits any slot with a margin,
  // and the rare piece that would still be too wide (a 5-long line) shrinks a little (trayFit).
  const trayCell = Math.min(cell * 0.6, slots[0].w / 3.6, slots[0].h / 3.6);
  return { w, h, portrait, board, cell, tray, slots, trayCell, hud, helpers, pause, streak, lift: Math.max(48, cell * 1.4) };
}

/** The cell size for one piece in a tray slot: the shared size, unless the piece is too wide or tall for the slot. */
export const trayFit = (l: Layout, slot: Rect, w: number, h: number) => Math.min(l.trayCell, (slot.w * 0.9) / w, (slot.h * 0.9) / h);

export const contains = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
