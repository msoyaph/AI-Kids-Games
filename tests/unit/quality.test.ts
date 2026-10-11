import { describe, expect, it } from 'vitest';
import { pixelRatioFor, PROFILES, QualityGovernor, recommendTier } from '../../src/systems/quality';
import { defaultSettings } from '../../src/systems/save/settings';

const run = (g: QualityGovernor, ms: number, seconds: number) => {
  const changes: string[] = [];
  const dt = ms / 1000;
  for (let t = 0; t < seconds; t += dt) {
    const c = g.sample(ms, dt);
    if (c) changes.push(`${c}:${g.tier}:${g.scale.toFixed(2)}`);
  }
  return changes;
};

describe('quality tiers', () => {
  it('profiles get richer from low to high', () => {
    expect(PROFILES.low.post).toBe(false);
    expect(PROFILES.medium.post).toBe(true);
    expect(PROFILES.high.shadows).toBe(true);
    expect(PROFILES.low.maxDpr).toBeLessThan(PROFILES.medium.maxDpr);
    expect(PROFILES.medium.maxDpr).toBeLessThan(PROFILES.high.maxDpr);
    expect(PROFILES.low.asteroids).toBeLessThan(PROFILES.high.asteroids);
  });

  it('recommends tiers from device signals', () => {
    expect(recommendTier({ touch: false, mobile: false, cores: 12, memoryGb: 16, gpu: 'Apple M3' })).toBe('high');
    expect(recommendTier({ touch: true, mobile: true, cores: 6, memoryGb: 4, gpu: 'Apple GPU' })).toBe('medium');
    expect(recommendTier({ touch: true, mobile: true, cores: 4, memoryGb: 2, gpu: 'Mali-G52' })).toBe('low');
    expect(recommendTier({ touch: false, mobile: false, cores: 8, memoryGb: 8, gpu: 'Google SwiftShader' })).toBe('low');
  });

  it('caps the pixel ratio per tier and never goes below 0.5', () => {
    expect(pixelRatioFor(PROFILES.low, 3, 1)).toBe(1);
    expect(pixelRatioFor(PROFILES.medium, 3, 1)).toBe(1.5);
    expect(pixelRatioFor(PROFILES.high, 3, 0.85)).toBeCloseTo(1.7);
    expect(pixelRatioFor(PROFILES.low, 1, 0.1)).toBe(0.5);
  });
});

describe('quality governor', () => {
  it('leaves a smooth 60 fps alone', () => {
    const g = new QualityGovernor('medium', true, 'medium');
    expect(run(g, 16.6, 30)).toEqual([]);
    expect(g.tier).toBe('medium');
    expect(g.scale).toBe(1);
  });

  it('lowers render scale first, then the tier, when frames are slow', () => {
    const g = new QualityGovernor('high', true, 'high');
    const changes = run(g, 22, 40);
    expect(changes[0]).toMatch(/^scale:high/);
    expect(changes.some((c) => c.startsWith('tier:medium'))).toBe(true);
    expect(g.scale).toBeGreaterThanOrEqual(PROFILES[g.tier].minScale);
  });

  it('drops a tier quickly when under 30 fps', () => {
    const g = new QualityGovernor('high', true, 'high');
    const changes = run(g, 45, 6);
    expect(changes.some((c) => c.startsWith('tier:'))).toBe(true);
  });

  it('only changes scale when the player picked a fixed tier', () => {
    const g = new QualityGovernor('high', false, 'high');
    run(g, 40, 60);
    expect(g.tier).toBe('high');
    expect(g.scale).toBeCloseTo(PROFILES.high.minScale);
  });

  it('recovers slowly, but not above the ceiling, and not straight back to a tier it left', () => {
    const g = new QualityGovernor('medium', true, 'medium');
    run(g, 45, 6);
    expect(g.tier).toBe('low');
    run(g, 8, 20);
    expect(g.tier).toBe('low');
    run(g, 8, 60);
    expect(g.tier).toBe('medium');
    run(g, 8, 120);
    expect(g.tier).toBe('medium');
    expect(g.scale).toBe(1);
  });

  it('ignores hitches (tab switches, GC)', () => {
    const g = new QualityGovernor('medium', true, 'medium');
    for (let i = 0; i < 50; i++) g.sample(400, 0.4);
    expect(g.tier).toBe('medium');
    expect(g.scale).toBe(1);
  });
});

describe('settings defaults', () => {
  it('has auto quality, follows the device for comfort, and normal steering', () => {
    const s = defaultSettings();
    expect(s.quality).toBe('auto');
    expect(s.comfort).toBeNull();
    expect(s.flipY).toBe(false);
  });
});
