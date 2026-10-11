import { describe, expect, it } from 'vitest';
import { dueCues, fromHere, makeSample, pathDuration, samplePath, type CamKey } from '../../src/systems/timeline';

const keys: CamKey[] = [
  { t: 0, pos: [0, 0, 10], look: [0, 0, 0], fov: 40 },
  { t: 2, pos: [5, 2, 8], look: [1, 0, 0] },
  { t: 5, pos: [10, 0, 6], look: [2, 1, 0], fov: 50 },
];

describe('cutscene timeline', () => {
  it('passes through every key and clamps outside the path', () => {
    const s = makeSample();
    for (const k of keys) {
      samplePath(keys, k.t, s, 45);
      expect(s.pos).toEqual(k.pos);
      expect(s.look).toEqual(k.look);
      expect(s.fov).toBe(k.fov ?? 45);
    }
    samplePath(keys, -3, s);
    expect(s.pos).toEqual([0, 0, 10]);
    samplePath(keys, 99, s);
    expect(s.pos).toEqual([10, 0, 6]);
    expect(pathDuration(keys)).toBe(5);
  });

  it('moves smoothly: no jumps between nearby times, gentle start and stop', () => {
    const s = makeSample();
    let prev = samplePath(keys, 0, s).pos.slice();
    let maxStep = 0;
    const steps: number[] = [];
    for (let t = 0.01; t <= 5; t += 0.01) {
      const p = samplePath(keys, t, s).pos;
      const d = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      maxStep = Math.max(maxStep, d);
      steps.push(d);
      prev = p.slice();
    }
    expect(maxStep).toBeLessThan(0.1);
    // Starts and ends slowly (ease in / out).
    expect(steps[0]).toBeLessThan(steps[100] / 4);
    expect(steps[steps.length - 1]).toBeLessThan(steps[300] / 4);
  });

  it('continues from where the camera is', () => {
    const here = makeSample();
    here.pos = [1, 2, 3];
    here.look = [0, 1, 0];
    here.fov = 38;
    const path = fromHere(here, [{ t: 1, pos: [4, 4, 4], look: [0, 0, 0] }], 0.5);
    expect(path[0].pos).toEqual([1, 2, 3]);
    expect(path[1].t).toBe(1.5);
    const s = samplePath(path, 0, makeSample());
    expect(s.fov).toBe(38);
  });

  it('fires each cue once as time passes it', () => {
    const cues = [{ t: 1, id: 'a' }, { t: 2, id: 'b' }, { t: 2, id: 'c' }];
    expect(dueCues(cues, 0, 0.5)).toEqual([]);
    expect(dueCues(cues, 0.5, 1)).toEqual(['a']);
    expect(dueCues(cues, 1, 1.5)).toEqual([]);
    expect(dueCues(cues, 1.5, 3)).toEqual(['b', 'c']);
  });
});
