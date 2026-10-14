import { describe, expect, it } from 'vitest';
import { FLASH_LIMIT_HZ, FX } from '../../src/render/fx';
import { Governor, guessTier, isSoftwareRenderer, QUALITY, urlTier } from '../../src/render/quality';

describe('quality tiers', () => {
  it('Low has no post effects or shadow map and draws at 1×; High adds bloom', () => {
    expect(QUALITY.low).toMatchObject({ pixelRatio: 1, shadowMap: 0, bloom: false });
    expect(QUALITY.medium.shadowMap).toBeGreaterThan(0);
    expect(QUALITY.medium.bloom).toBe(false);
    expect(QUALITY.high).toMatchObject({ pixelRatio: 2, bloom: true });
  });
  it('software renderers and phones start on Low', () => {
    for (const gpu of ['Google SwiftShader', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))', 'llvmpipe (LLVM 15.0.7, 256 bits)']) expect(isSoftwareRenderer(gpu), gpu).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe(false);
    expect(guessTier({ hardwareConcurrency: 16 }, { width: 1920, height: 1080 }, 'Google SwiftShader')).toBe('low');
    expect(guessTier({ userAgent: 'iPhone', maxTouchPoints: 5, hardwareConcurrency: 6 }, { width: 390, height: 844 })).toBe('low');
    expect(guessTier({ hardwareConcurrency: 10 }, { width: 1920, height: 1080 })).toBe('high');
  });
  it('reads ?quality=', () => {
    expect(urlTier('?quality=high')).toBe('high');
    expect(urlTier('?quality=ultra')).toBeNull();
  });
  it('the governor drops after 2.5 s of slow frames and climbs back only to where it started', () => {
    const g = new Governor('medium');
    let changed: string | null = null;
    for (let i = 0; i < 400 && !changed; i++) changed = g.sample(1 / 30);
    expect(changed).toBe('low');
    for (let i = 0; i < 60 * 30 && g.tier !== 'medium'; i++) g.sample(1 / 60);
    expect(g.tier).toBe('medium');
    for (let i = 0; i < 60 * 30; i++) g.sample(1 / 60);
    expect(g.tier).toBe('medium');
  });
});

describe('no flashing (at most 3 flashes a second)', () => {
  it('every repeating brightness effect is slower than 3 a second', () => {
    for (const [name, hz] of Object.entries(FX)) expect(hz, name).toBeLessThan(FLASH_LIMIT_HZ);
  });
});
