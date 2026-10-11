// Fixed-timestep simulation loop (60 Hz) with interpolated rendering and tab-visibility pausing.

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
const MAX_STEPS_PER_FRAME = 5;

export interface LoopCallbacks {
  /** Advance simulation by exactly SIM_DT. */
  step(dt: number): void;
  /** Render with interpolation factor alpha in [0,1) and the real frame delta. */
  render(alpha: number, frameDt: number): void;
  /** Called when the tab becomes hidden (game should open pause menu). */
  onHidden?(): void;
}

export class GameLoop {
  private acc = 0;
  private last = -1;
  private rafId = 0;
  private running = false;
  /** When true, step() is not called but render() continues (menus, pause screen). */
  simPaused = false;
  /** Time scale for slow-mo effects (finish line). */
  timeScale = 1;

  constructor(private readonly cb: LoopCallbacks) {
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = -1;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Drop any accumulated time (e.g. after a long load) so we don't fast-forward. */
  resetClock(): void {
    this.acc = 0;
    this.last = -1;
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      this.cb.onHidden?.();
      cancelAnimationFrame(this.rafId);
    } else if (this.running) {
      this.resetClock();
      this.rafId = requestAnimationFrame(this.frame);
    }
  };

  private frame = (t: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.frame);
    if (this.last < 0) this.last = t;
    let frameDt = (t - this.last) / 1000;
    this.last = t;
    if (frameDt > 0.25) frameDt = 0.25;
    if (frameDt < 0) frameDt = 0;
    if (!this.simPaused) {
      this.acc += frameDt * this.timeScale;
      let steps = 0;
      while (this.acc >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
        this.cb.step(SIM_DT);
        this.acc -= SIM_DT;
        steps++;
      }
      // Spiral-of-death guard: if we're too far behind, drop the remainder.
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    }
    this.cb.render(this.simPaused ? 1 : this.acc / SIM_DT, frameDt);
  };
}
