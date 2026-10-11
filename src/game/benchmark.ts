/**
 * Performance benchmark (`?bench=1`, Settings → Test performance): a scripted 60 s run with
 * a fixed seed, an invulnerable autopilot, an 800-strong horde and a boss at 20 s. Frame
 * times are recorded after a short warm-up; the result card reports FPS, 1% lows, draw
 * calls, triangles, tier, resolution and GPU, and checks the tier's render budget.
 */

import type { Quality } from '../render/Renderer';

/** Shown on result cards (bump with releases). */
export const GAME_VERSION = '1.1.0';

export const BENCH = {
  seconds: 60,
  warmup: 3,
  seed: 4242,
  enemies: 800,
  bossAt: 20,
  /** Camera orbit speed (rad/s). */
  orbit: 0.18,
} as const;

/** Render budget per tier (per frame, every pass included). */
export const BUDGETS: Record<Quality, { calls: number; tris: number }> = {
  high: { calls: 90, tris: 900_000 },
  medium: { calls: 85, tris: 800_000 },
  low: { calls: 70, tris: 450_000 },
  tablet: { calls: 70, tris: 450_000 },
};

export interface BenchResult {
  game: string;
  version: string;
  map: string;
  quality: Quality;
  /** On-screen touch controls during the test: none, fake glass or real blur. */
  controls: 'none' | 'fake' | 'blur';
  resolution: string;
  dpr: number;
  gpu: string;
  seconds: number;
  frames: number;
  avgFps: number;
  /** FPS of the slowest 1% of frames. */
  low1Fps: number;
  avgFrameMs: number;
  p99FrameMs: number;
  /** Main-thread work per frame (sim + scene submit), without waiting for vsync. */
  cpuFrameMs: number;
  simMs: number;
  drawCalls: { avg: number; max: number };
  triangles: { avg: number; max: number };
  enemiesMax: number;
  budget: { calls: number; tris: number; ok: boolean };
  userAgent: string;
}

/** Collects per-frame numbers during the measured part of the run. */
export class BenchRecorder {
  private frameMs: number[] = [];
  private cpu = 0;
  private sim = 0;
  private calls: number[] = [];
  private tris: number[] = [];
  private enemies = 0;

  frame(frameMs: number, cpuMs: number, simMs: number, calls: number, tris: number, enemies: number): void {
    this.frameMs.push(frameMs);
    this.cpu += cpuMs;
    this.sim += simMs;
    this.calls.push(calls);
    this.tris.push(tris);
    if (enemies > this.enemies) this.enemies = enemies;
  }

  get frames(): number {
    return this.frameMs.length;
  }

  result(ctx: { version: string; map: string; quality: Quality; width: number; height: number; dpr: number; gpu: string; seconds: number; controls?: 'none' | 'fake' | 'blur' }): BenchResult {
    const n = Math.max(1, this.frameMs.length);
    const total = this.frameMs.reduce((a, b) => a + b, 0);
    const sorted = [...this.frameMs].sort((a, b) => a - b);
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? 0;
    // 1% low = average FPS over the slowest 1% of frames
    const worst = sorted.slice(Math.floor(sorted.length * 0.99));
    const worstAvg = worst.length ? worst.reduce((a, b) => a + b, 0) / worst.length : p99;
    const avg = (v: number[]): number => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
    const budget = BUDGETS[ctx.quality];
    const callsMax = Math.max(0, ...this.calls);
    const trisMax = Math.max(0, ...this.tris);
    return {
      game: 'theabonk-benchmark',
      version: ctx.version,
      map: ctx.map,
      quality: ctx.quality,
      controls: ctx.controls ?? 'none',
      resolution: `${ctx.width}×${ctx.height}`,
      dpr: Math.round(ctx.dpr * 100) / 100,
      gpu: ctx.gpu,
      seconds: ctx.seconds,
      frames: this.frameMs.length,
      avgFps: Math.round((1000 * n) / Math.max(1, total)),
      low1Fps: Math.round(1000 / Math.max(1, worstAvg)),
      avgFrameMs: Math.round((total / n) * 100) / 100,
      p99FrameMs: Math.round(p99 * 100) / 100,
      cpuFrameMs: Math.round((this.cpu / n) * 100) / 100,
      simMs: Math.round((this.sim / n) * 100) / 100,
      drawCalls: { avg: Math.round(avg(this.calls)), max: callsMax },
      triangles: { avg: Math.round(avg(this.tris)), max: trisMax },
      enemiesMax: this.enemies,
      budget: { calls: budget.calls, tris: budget.tris, ok: callsMax <= budget.calls && trisMax <= budget.tris },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  }
}

/** The graphics card / driver name, as far as the browser will say. */
export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    // Firefox reports the real (sanitised) renderer here — and warns if the debug extension
    // is used; Chromium / WebKit say "WebKit WebGL" and need the extension
    const plain = String(gl.getParameter(gl.RENDERER) || '');
    if (plain && !/^webkit webgl$/i.test(plain)) return plain;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : plain;
    return String(name || 'unknown');
  } catch {
    return 'unknown';
  }
}

/**
 * First guess at a render tier from the GPU name (Quality 'auto' on desktops): software
 * renderers and older Intel integrated graphics start on Low, newer integrated on Medium.
 * The benchmark (or the player) can always choose differently.
 */
export function tierForGpu(name: string): Quality {
  const n = name.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(n)) return 'low';
  if (/intel.*(hd|uhd) graphics/.test(n) && !/iris/.test(n)) return 'low';
  if (/intel.*iris|radeon\(tm\) graphics|radeon graphics|vega \d+|mali|adreno|powervr/.test(n)) return 'medium';
  return 'high';
}
