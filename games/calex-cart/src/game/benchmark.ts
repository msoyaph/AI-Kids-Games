// In-game performance test: a scripted race on the heaviest track (Neon Nightway) with 8 racers, the player's
// kart on autopilot and the normal chase camera. Measures frame times, draw calls, triangles, quality tier and
// memory, then shows a results card. Nothing is saved: no records, no playtest log, no settings changes.
import type * as THREE from 'three';
import type { App } from './app';
import type { QualitySetting } from '../render/quality';
import type { SessionConfig } from './session';

export const BENCH_TRACK = 'neon-nightway';

export interface BenchSecond {
  t: number;
  fps: number;
  tier: string;
  scale: number;
}

export interface BenchResult {
  track: string;
  seconds: number;
  setting: QualitySetting;
  /** Touch controls shown during the run (`?bench=1&controls=`), or null for the plain test. */
  controls?: BenchControls | null;
  avgFps: number;
  /** Average FPS over the slowest 1 % of frames. */
  low1Fps: number;
  p50Ms: number;
  p99Ms: number;
  maxMs: number;
  avgDraws: number;
  maxDraws: number;
  avgTris: number;
  maxTris: number;
  timeline: BenchSecond[];
  finalTier: string;
  finalScale: number;
  dpr: number;
  viewport: string;
  gpu: string;
  device: string;
  geometries: number;
  textures: number;
  /** Estimated GPU buffer memory for the race scene (vertex + index data). */
  bufferMB: number;
  /** JS heap (Chrome only) at the start / end / peak, MB. */
  heapStartMB: number | null;
  heapEndMB: number | null;
  heapPeakMB: number | null;
  sceneryChunks: string;
  build: string;
}

function heapMB(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null;
}

/** Bytes of vertex/index data referenced by a scene (each buffer counted once). */
export function sceneBufferBytes(scene: THREE.Object3D): number {
  const seen = new Set<unknown>();
  let bytes = 0;
  scene.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g || seen.has(g)) return;
    seen.add(g);
    for (const a of Object.values(g.attributes)) {
      const arr = (a as THREE.BufferAttribute).array as ArrayLike<number> & { byteLength?: number };
      if (!seen.has(arr)) {
        seen.add(arr);
        bytes += arr.byteLength ?? 0;
      }
    }
    if (g.index && !seen.has(g.index.array)) {
      seen.add(g.index.array);
      bytes += (g.index.array as ArrayLike<number> & { byteLength: number }).byteLength;
    }
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) bytes += im.instanceMatrix.array.byteLength + (im.instanceColor?.array.byteLength ?? 0);
  });
  return bytes;
}

export function benchConfig(app: App): SessionConfig {
  const ai = ['pip', 'juno', 'mochi', 'grumbo', 'bo', 'fennel', 'luma'];
  const bodies = ['bubble', 'zoomster', 'bubble', 'brick', 'pickup', 'scooter', 'royal'];
  const paints = ['ocean', 'grape', 'bubblegum', 'lime', 'sunny', 'tangerine', 'gold'];
  return {
    mode: 'versus',
    trackId: BENCH_TRACK,
    speedClass: 'pro',
    mirror: false,
    items: true,
    itemSet: 'all',
    laps: 3,
    players: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'stripes' }, source: app.inputSources(1)[0] }],
    ai: ai.map((id, i) => ({ racerId: id, kart: { body: bodies[i], wheels: 'standard', glider: 'kite', paint: paints[i], decal: 'none' } })),
    seed: 2024,
    intro: false,
    benchmark: true,
  };
}

/**
 * Run the benchmark. `quality` overrides the tier for this run only (the saved setting is restored afterwards).
 * Resolves with the results when done (or null if it could not start).
 */
/** Benchmark variants for the touch controls' cost. */
export type BenchControls = 'none' | 'fake' | 'blur';

export function runBenchmark(app: App, seconds = 60, quality?: QualitySetting, onTick?: (left: number) => void, controls?: BenchControls): Promise<BenchResult | null> {
  return new Promise((resolve) => {
    const savedSetting = app.gr.quality.setting;
    const setting = quality ?? savedSetting;
    app.gr.quality.setSetting(setting);
    app.startSession(benchConfig(app), () => {});
    const s = app.session;
    if (!s) {
      app.gr.quality.setSetting(savedSetting);
      resolve(null);
      return;
    }
    // `controls`: measure the glass touch controls' cost — none, fake glass, or real blur (pinned for the run)
    const touch = app.input.touch;
    if (controls) {
      touch.forceGlass = controls === 'blur' ? 'blur' : 'fake';
      touch.setGlass(touch.forceGlass);
      touch.show(controls !== 'none');
    }
    const restoreControls = (): void => {
      if (!controls) return;
      touch.forceGlass = null;
      app.syncGlass();
    };
    // the player's kart drives itself
    const k = s.world.karts[0];
    const p = k.player;
    k.player = -1;
    s.ai?.takeOver(k, 0.8, 'balanced');
    k.player = p;
    const frames: number[] = [];
    const timeline: BenchSecond[] = [];
    let draws = 0;
    let maxDraws = 0;
    let tris = 0;
    let maxTris = 0;
    let samples = 0;
    let started = -1;
    let last = 0;
    let secStart = 0;
    let secFrames = 0;
    const heapStart = heapMB();
    let heapPeak = heapStart;
    const tick = (now: number): void => {
      if (app.session !== s) {
        app.gr.quality.setSetting(savedSetting);
        restoreControls();
        resolve(null); // left early
        return;
      }
      // measure only once the race is under way (countdown excluded)
      if (s.world.phase !== 'race') {
        last = now;
        requestAnimationFrame(tick);
        return;
      }
      if (started < 0) {
        started = now;
        secStart = now;
        last = now;
      } else {
        frames.push(now - last);
        last = now;
        secFrames++;
        const st = app.gr.stats();
        draws += st.calls;
        tris += st.triangles;
        maxDraws = Math.max(maxDraws, st.calls);
        maxTris = Math.max(maxTris, st.triangles);
        samples++;
      }
      if (now - secStart >= 1000) {
        timeline.push({ t: timeline.length + 1, fps: Math.round((secFrames * 1000) / (now - secStart)), tier: app.gr.quality.level, scale: app.gr.quality.renderScale });
        secStart = now;
        secFrames = 0;
        const hm = heapMB();
        if (hm !== null && (heapPeak === null || hm > heapPeak)) heapPeak = hm;
        // memory log every second (Safari/iOS has no JS heap API, so GPU-side counts are logged everywhere)
        const mem = app.gr.renderer.info.memory;
        console.info(`[bench] t=${timeline.length}s fps=${timeline[timeline.length - 1].fps} tier=${app.gr.quality.level} geometries=${mem.geometries} textures=${mem.textures}${hm !== null ? ` heap=${hm}MB` : ''}`);
        onTick?.(Math.max(0, seconds - timeline.length));
      }
      if (now - started < seconds * 1000) {
        requestAnimationFrame(tick);
        return;
      }
      // ---- done
      const sorted = [...frames].sort((a, b) => a - b);
      const pct = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
      const worst = sorted.slice(Math.floor(sorted.length * 0.99));
      const worstAvg = worst.reduce((a, b) => a + b, 0) / Math.max(1, worst.length);
      const total = frames.reduce((a, b) => a + b, 0);
      const info = app.gr.renderer.info.memory;
      const dev = app.gr.quality.device;
      const ps = s.view.props?.stats();
      const res: BenchResult = {
        track: BENCH_TRACK,
        seconds,
        setting,
        avgFps: +((frames.length * 1000) / Math.max(1, total)).toFixed(1),
        low1Fps: +(1000 / Math.max(1, worstAvg)).toFixed(1),
        p50Ms: +pct(0.5).toFixed(1),
        p99Ms: +pct(0.99).toFixed(1),
        maxMs: +(sorted[sorted.length - 1] ?? 0).toFixed(1),
        avgDraws: Math.round(draws / Math.max(1, samples)),
        maxDraws,
        avgTris: Math.round(tris / Math.max(1, samples)),
        maxTris,
        timeline,
        finalTier: app.gr.quality.level,
        finalScale: app.gr.quality.renderScale,
        dpr: +app.gr.renderer.getPixelRatio().toFixed(2),
        viewport: `${app.gr.width}×${app.gr.height}`,
        gpu: dev.gpu || 'unknown',
        device: `${dev.mobile ? 'mobile' : dev.touch ? 'touch' : 'desktop'} · ${dev.cores} cores · ${dev.memoryGb} GB · recommended ${dev.recommended}`,
        geometries: info.geometries,
        textures: info.textures,
        bufferMB: +(sceneBufferBytes(s.view.scene) / 1048576).toFixed(1),
        heapStartMB: heapStart,
        heapEndMB: heapMB(),
        heapPeakMB: heapPeak,
        sceneryChunks: ps ? `${ps.chunks} chunks (${ps.full} full / ${ps.lod} LOD / ${ps.far} far), ${ps.billboards} impostors` : '—',
        build: typeof __CALEX_VERSION__ === 'string' ? __CALEX_VERSION__ : 'dev',
        controls: controls ?? null,
      };
      app.gr.quality.setSetting(savedSetting);
      restoreControls();
      resolve(res);
    };
    requestAnimationFrame(tick);
  });
}

/** Plain-text summary (for the copy box and the console). */
export function benchSummary(r: BenchResult): string {
  const tiers = [...new Set(r.timeline.map((t) => `${t.tier}${t.scale < 1 ? `×${t.scale}` : ''}`))].join(' → ');
  return [
    `Calex Cart ${r.build} — performance test (${r.track}, ${r.seconds} s, 8 racers)`,
    `Setting ${r.setting} · tiers ${tiers || r.finalTier} · DPR ${r.dpr} · ${r.viewport}`,
    `FPS avg ${r.avgFps} · 1% low ${r.low1Fps} · frame p50 ${r.p50Ms} ms · p99 ${r.p99Ms} ms · worst ${r.maxMs} ms`,
    `Draw calls avg ${r.avgDraws} / max ${r.maxDraws} · triangles avg ${r.avgTris} / max ${r.maxTris}`,
    `Scenery ${r.sceneryChunks}`,
    `GPU ${r.gpu}`,
    `Device ${r.device}`,
    `Memory: ${r.geometries} geometries · ${r.textures} textures · ~${r.bufferMB} MB buffers · JS heap ${r.heapStartMB ?? 'n/a'} → ${r.heapEndMB ?? 'n/a'} MB (peak ${r.heapPeakMB ?? 'n/a'})`,
    `FPS per second: ${r.timeline.map((t) => t.fps).join(' ')}`,
  ].join('\n');
}
