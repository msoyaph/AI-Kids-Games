// Every balance value in the game lives here, so balancing never means hunting through code.
// Phase 0 holds the board and the safety limits; phase 2 adds plants, critters, compost and
// waves, and the bots' balance reports (reports/balance.md) are read against this file.

export const BOARD = {
  lanes: 5,
  tiles: 9,
  /** Tile size in world units: a little deeper than wide, so tiles read square at the tilted camera. */
  tileWidth: 1.0,
  tileDepth: 1.15,
  /**
   * The path in: this many tiles of garden path beyond the last column, where critters are seen
   * coming through the bushes before they reach the beds. Not plantable.
   */
  runway: 1.5,
} as const;

export const SIM = {
  /** The rules run at a fixed 60 steps a second, whatever the frame rate. */
  stepHz: 60,
  /** The longest real frame time fed to the rules (seconds), clamped before any test speed-up. */
  maxFrame: 0.25,
} as const;

export const BASKET = {
  /** Snacks in the basket; stars count the snacks left at the end of a level. */
  snacks: 3,
} as const;

export const SAFETY = {
  /** Nothing on screen flashes more often than this (WCAG 2.3.1); see render/fx.ts. */
  flashLimitHz: 3,
  /** The smallest touch target, in CSS pixels. */
  minTouchPx: 48,
  /** The smallest tile on the smallest supported phone, in CSS pixels (the pick test checks it). */
  minTilePx: 40,
} as const;
