import type { Page } from 'playwright';

/** What a capture take can do while it is being recorded. */
export interface TakeContext {
  page: Page;
  slug: string;
  /** Wait in real time while the game keeps running. */
  wait(ms: number): Promise<void>;
  /** Hold keys down for a while (game input), then release them. */
  hold(keys: string[], ms: number): Promise<void>;
  /** Mark where the best part of this take starts: now, or `offset` seconds from now (negative = earlier). */
  cut(offset?: number): Promise<void>;
  /** Save a full-resolution still for the details gallery. */
  still(alt: string): Promise<void>;
  /** Evaluate in the game page. */
  run<T>(fn: () => T | Promise<T>): Promise<T>;
  run<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
  log(message: string): void;
}

export interface Take {
  /** Short id, used for file names (e.g. "ring-wave"). */
  id: string;
  /**
   * Continue in the previous take's page instead of opening a fresh one, so a long
   * play-through (e.g. reaching wave 10) can yield several moments.
   */
  continues?: boolean;
  /** Query string for the game page (e.g. "?seed=7"). Ignored when the take continues. */
  query?: string;
  /** localStorage entries to seed before the game boots. */
  storage?: Record<string, string>;
  /** Include this take in the preview loop (default true). Takes can exist only for stills. */
  loop?: boolean;
  /**
   * What to record: "tab" (default) records the composited page, so hide the HUD in setup.
   * A canvas selector records only that canvas (needs a headed browser; headless delivers no frames).
   */
  source?: string;
  /** Zoom into part of the 1920×1080 frame for the loop and stills: [x, y, width, height], 16:9. */
  crop?: [number, number, number, number];
  /**
   * Open the page as a phone or tablet (head take of a chain only): CSS viewport, pixel ratio,
   * touch and a mobile user agent. Record it with source "tab" to include the touch controls.
   */
  device?: Device;
  /** Frame rate for a tab recording (default 60); a costly page records more evenly at 30. */
  fps?: number;
  /** Also record the game's own sound (Web Audio output, tapped in the page). Head take only. */
  audio?: boolean;
  /** Prepare the game until the moment is about to happen. Not recorded. */
  setup(ctx: TakeContext): Promise<void>;
  /** Play the moment while recording. Call ctx.cut() when the best part begins. */
  act(ctx: TakeContext): Promise<void>;
}

export interface Device { width: number; height: number; scale: number; touch?: boolean; userAgent?: string }

export interface Scenario {
  slug: string;
  /** Selector of the game's main canvas (recorded unless a take uses "tab"). */
  canvas: string;
  /** Takes in loop order. The loop uses 3–4 of them; the first returns at the end. */
  takes: Take[];
  /** Loop order by take id (the first one is also the poster). Defaults to take order. */
  loopOrder?: string[];
  /** Seconds of each take used in the loop (including the crossfade). */
  clipSeconds?: number;
  /**
   * false: record only the loop and poster. The game's gallery comes from elsewhere (its own
   * screenshots, src/data/temporary-art.ts), so no stills are written and old ones are removed.
   */
  gallery?: false;
}
