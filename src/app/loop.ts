/**
 * Fixed-timestep loop with interpolated rendering.
 * Game logic always advances in steps of `dt`; render receives alpha in [0,1)
 * describing how far we are between the previous and current logic state.
 */
export class FixedLoop {
  readonly dt: number;
  /** Largest real frame time we accept (prevents the "spiral of death" after a hitch). */
  maxFrame = 0.25;
  /** Max logic steps per frame. */
  maxSteps = 8;
  private acc = 0;
  steps = 0;

  constructor(
    hz: number,
    private readonly step: (dt: number) => void,
    private readonly render: (alpha: number) => void,
  ) {
    this.dt = 1 / hz;
  }

  /** Advance by real elapsed seconds. Returns number of logic steps run. */
  tick(elapsedSec: number): number {
    if (!(elapsedSec > 0)) elapsedSec = 0;
    this.acc += Math.min(elapsedSec, this.maxFrame);
    let n = 0;
    while (this.acc >= this.dt && n < this.maxSteps) {
      this.step(this.dt);
      this.acc -= this.dt;
      n++;
    }
    if (n >= this.maxSteps) this.acc = 0;
    this.steps += n;
    this.render(this.acc / this.dt);
    return n;
  }

  reset(): void {
    this.acc = 0;
  }
}
