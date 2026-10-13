import { describe, expect, it } from 'vitest';
import { occlusionFade } from '../../src/render/occlusion';

// camera at (0, 6, 12) looking at the player's chest at (0, 1.1, 0)
const cam = [0, 6, 12] as const;
const focus = [0, 1.1, 0] as const;
const fade = (ox: number, oy: number, oz: number, r = 1.5, top = 4.4): number => occlusionFade(cam[0], cam[1], cam[2], focus[0], focus[1], focus[2], ox, oy, oz, r, top);

describe('camera occlusion fade', () => {
  it('a tree squarely between camera and player fades almost completely', () => {
    expect(fade(0, 0, 6)).toBeGreaterThan(0.9);
  });

  it('trees beside the line, behind the player or behind the camera stay solid', () => {
    expect(fade(6, 0, 6)).toBe(0);
    expect(fade(0, 0, -4)).toBe(0);
    expect(fade(0, 0, 16)).toBe(0);
  });

  it('fades smoothly with sideways distance (no popping)', () => {
    let prev = fade(0, 0, 6);
    for (let x = 0.1; x <= 4; x += 0.1) {
      const f = fade(x, 0, 6);
      expect(prev - f).toBeLessThan(0.15);
      expect(f).toBeLessThanOrEqual(prev + 1e-9);
      prev = f;
    }
    expect(prev).toBe(0);
  });

  it('a low rock under a high line of sight does not fade', () => {
    // line of sight at z=10 is ~5.2 high; a 1.4-tall rock there is not in the way
    expect(fade(0, 0, 10, 1.4, 1.4)).toBe(0);
  });
});
