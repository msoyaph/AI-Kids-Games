/** A tiny pooled tween runner: no allocation per frame, one list, eases in one place. */
export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  /** A springy overshoot, for snaps and squash. */
  back: (t: number) => { const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
};

interface Tween { active: boolean; delay: number; t: number; dur: number; ease: Ease; step: (k: number) => void; done: (() => void) | null }

const pool: Tween[] = [];
const live: Tween[] = [];
/** A global speed factor (Relax plays effects slower). */
export let tweenSpeed = 1;
export const setTweenSpeed = (k: number) => { tweenSpeed = k; };

/** Runs `step(k)` with k from 0 to 1 over `dur` seconds after `delay`, then `done`. */
export function tween(dur: number, step: (k: number) => void, opts: { delay?: number; ease?: Ease; done?: () => void } = {}) {
  const t = pool.pop() ?? ({} as Tween);
  t.active = true; t.delay = opts.delay ?? 0; t.t = 0; t.dur = Math.max(0.0001, dur); t.ease = opts.ease ?? ease.outCubic; t.step = step; t.done = opts.done ?? null;
  live.push(t);
  if (t.delay <= 0) step(0);
  return t;
}

/** Advances every tween; returns whether any is still running. */
export function updateTweens(dt: number): boolean {
  dt *= 1 / tweenSpeed;
  for (let i = live.length - 1; i >= 0; i--) {
    const t = live[i]!;
    if (t.delay > 0) { t.delay -= dt; if (t.delay > 0) continue; t.step(0); }
    t.t += dt;
    const k = Math.min(1, t.t / t.dur);
    t.step(t.ease(k));
    if (k >= 1) {
      live[i] = live[live.length - 1]!; live.pop();
      t.active = false; const done = t.done; t.done = null; pool.push(t);
      done?.();
    }
  }
  return live.length > 0;
}

/** Finishes every running tween at once (for tests, captures and reduced motion). */
export function finishTweens() { let guard = 0; while (live.length && guard++ < 1000) updateTweens(1e6); }
export const tweensRunning = () => live.length;
