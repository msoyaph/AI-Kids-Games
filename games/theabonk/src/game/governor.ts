import type { Quality } from '../render/Renderer';

/**
 * Adaptive quality governor (Quality = Auto only): if a run keeps rendering well under 60 fps,
 * step down one tier — High → Medium → Low, Tablet → Low — and never back up mid-run. The
 * Game applies a requested step when a screen next covers the scene (level-up / chest), or
 * after GOVERNOR.applyWithin seconds, so the world-mesh rebuild never hitches mid-action.
 */
export const GOVERNOR = {
  /** Ignore the start of a run (shaders compiling, first spawns). */
  warmup: 5,
  /** …and this long after any tier change. */
  settle: 3,
  /** Look at the frames of the last this-many seconds. */
  window: 4,
  /** Step down when the median frame is slower than this (≈ 48 fps). */
  slowMs: 1000 / 48,
  /**
   * Frames longer than this are a stall, not slow rendering. Hidden tabs are handled by a
   * reset when the tab comes back (Game, visibilitychange), so this only catches absurd gaps:
   * a really slow device can run at under 1 fps, and that's exactly when to step down.
   */
  ignoreMs: 5000,
  /** A requested step is applied at the next level-up / chest, or after this long. */
  applyWithin: 8,
} as const;

/** The next lighter tier, or null at the bottom. */
export function stepDown(q: Quality): Quality | null {
  if (q === 'high') return 'medium';
  if (q === 'medium' || q === 'tablet') return 'low';
  return null;
}

export class QualityGovernor {
  private times: number[] = [];
  private ms: number[] = [];
  private quietUntil = 0;

  /** Forget the history (new run, or the tier just changed at time `now`, seconds). */
  reset(now: number, settle: number = GOVERNOR.warmup): void {
    this.times.length = 0;
    this.ms.length = 0;
    this.quietUntil = now + settle;
  }

  /**
   * One rendered frame (`now` in seconds, `frameMs` = time since the previous frame). Returns
   * true when the run has been slow enough, long enough, to step down a tier.
   */
  frame(now: number, frameMs: number): boolean {
    if (now < this.quietUntil || frameMs > GOVERNOR.ignoreMs) return false;
    this.times.push(now);
    this.ms.push(frameMs);
    // keep only the window
    let drop = 0;
    while (drop < this.times.length && this.times[drop] < now - GOVERNOR.window) drop++;
    if (drop) {
      this.times.splice(0, drop);
      this.ms.splice(0, drop);
    }
    // a full window of evidence before deciding (≥ 3 frames: a device under 1 fps has ~3 in 4 s)
    // (coverage counts the oldest frame's own duration: at 0.7 fps three frames span 2.8 s)
    const covered = now - this.times[0] + this.ms[0] / 1000;
    if (this.times.length < 3 || covered < GOVERNOR.window * 0.95) return false;
    const sorted = [...this.ms].sort((a, b) => a - b);
    return sorted[sorted.length >> 1] > GOVERNOR.slowMs;
  }
}
