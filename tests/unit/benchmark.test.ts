import { describe, expect, it } from 'vitest';
import { BenchRecorder, BUDGETS, tierForGpu } from '../../src/game/benchmark';

const ctx = { version: 'test', map: 'meadow', quality: 'medium' as const, width: 1600, height: 900, dpr: 1, gpu: 'Test GPU', seconds: 60 };

describe('benchmark recorder', () => {
  it('reports average FPS, 1% lows and maxima', () => {
    const rec = new BenchRecorder();
    // 990 frames at 10 ms, 10 hitches at 50 ms
    for (let i = 0; i < 990; i++) rec.frame(10, 2, 0.5, 40, 300_000, 800);
    for (let i = 0; i < 10; i++) rec.frame(50, 4, 1, 60, 500_000, 801);
    const r = rec.result(ctx);
    expect(r.frames).toBe(1000);
    expect(r.avgFps).toBe(Math.round(1000 / ((990 * 10 + 10 * 50) / 1000)));
    expect(r.low1Fps).toBe(20); // the slowest 1% = the 50 ms hitches
    expect(r.p99FrameMs).toBe(50);
    expect(r.drawCalls.max).toBe(60);
    expect(r.triangles.max).toBe(500_000);
    expect(r.enemiesMax).toBe(801);
    expect(r.cpuFrameMs).toBeCloseTo(2.02, 2);
    expect(r.budget.ok).toBe(true);
    expect(r.resolution).toBe('1600×900');
  });

  it('flags frames over the tier budget', () => {
    const rec = new BenchRecorder();
    rec.frame(16, 3, 1, BUDGETS.low.calls + 1, 100_000, 10);
    expect(rec.result({ ...ctx, quality: 'low' }).budget.ok).toBe(false);
  });

  it('survives an empty recording', () => {
    const r = new BenchRecorder().result(ctx);
    expect(r.frames).toBe(0);
    expect(Number.isFinite(r.avgFps)).toBe(true);
  });
});

describe('auto quality from the GPU name', () => {
  it.each([
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'low'],
    ['llvmpipe (LLVM 15.0.7, 256 bits)', 'low'],
    ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'low'],
    ['ANGLE (Intel, Intel(R) HD Graphics 520 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'low'],
    ['ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'medium'],
    ['ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'medium'],
    ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)', 'high'],
    ['ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)', 'high'],
    ['unknown', 'high'],
  ])('%s → %s', (name, tier) => {
    expect(tierForGpu(name)).toBe(tier);
  });
});
