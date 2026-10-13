import { describe, expect, it } from 'vitest';
import { GOVERNOR, QualityGovernor, stepDown } from '../../src/game/governor';

/** Feed `seconds` of frames at `fps` starting at time t0; returns the time a drop was asked for (or -1). */
function run(g: QualityGovernor, t0: number, seconds: number, fps: number, jitter = 0): number {
  const dt = 1 / fps;
  for (let t = t0; t < t0 + seconds; t += dt) {
    const ms = dt * 1000 * (1 + (jitter ? (Math.sin(t * 37) * jitter) : 0));
    if (g.frame(t, ms)) return t;
  }
  return -1;
}

describe('quality governor (Auto only)', () => {
  it('steps High → Medium → Low and Tablet → Low, never below Low', () => {
    expect(stepDown('high')).toBe('medium');
    expect(stepDown('medium')).toBe('low');
    expect(stepDown('tablet')).toBe('low');
    expect(stepDown('low')).toBeNull();
  });

  it('leaves a smooth run alone (60 fps, and 50 fps with jitter)', () => {
    const g = new QualityGovernor();
    g.reset(0);
    expect(run(g, 0, 30, 60)).toBe(-1);
    expect(run(g, 30, 30, 50, 0.3)).toBe(-1);
  });

  it('asks to step down after a few seconds well under 60 fps — not before the warm-up', () => {
    const g = new QualityGovernor();
    g.reset(0);
    const at = run(g, 0, 30, 35);
    expect(at).toBeGreaterThanOrEqual(GOVERNOR.warmup + GOVERNOR.window * 0.95 - 0.1);
    expect(at).toBeLessThan(GOVERNOR.warmup + GOVERNOR.window + 1);
  });

  it('a short hitch (a boss arriving) is not a reason to drop', () => {
    const g = new QualityGovernor();
    g.reset(0);
    expect(run(g, 0, 10, 60)).toBe(-1);
    expect(run(g, 10, 0.8, 20)).toBe(-1);
    expect(run(g, 10.8, 10, 60)).toBe(-1);
  });

  it('ignores hidden-tab gaps and waits to settle after a change', () => {
    const g = new QualityGovernor();
    g.reset(0);
    for (let k = 0; k < 40; k++) expect(g.frame(10 + k * 6, 6000)).toBe(false);
    g.reset(100, GOVERNOR.settle);
    expect(run(g, 100, GOVERNOR.settle, 30)).toBe(-1);
  });

  it('a really slow device (a few fps) does step down', () => {
    const g = new QualityGovernor();
    g.reset(0);
    expect(run(g, 0, 60, 3)).toBeGreaterThan(0);
  });

  it('…even one running under 1 fps', () => {
    const g = new QualityGovernor();
    g.reset(0);
    let asked = false;
    for (let t = 0; t < 60 && !asked; t += 1.4) asked = g.frame(t, 1400);
    expect(asked).toBe(true);
  });
});
