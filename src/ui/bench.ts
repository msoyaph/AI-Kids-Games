// Performance benchmark: walks a scripted loop around the busiest place (the plaza during the
// Harvest Feast at 6 PM, every neighbor out) and reports average FPS, 1% low FPS, draw calls,
// triangles and the quality tier. Runs on a throwaway island — your save is never touched.
// Open with Settings → "Test performance", or add ?bench=1 (one tier) / ?bench=all to the URL.
import type { App } from '../app';
import { benchRoute, buildBusyIsland } from '../sim/benchIsland';
import { TIERS, type QualityTier } from '../render/quality';
import { btn, h, type Panel } from './dom';
import { copyText } from './playtest';

export interface BenchResult {
  tier: QualityTier;
  seconds: number;
  frames: number;
  avgFps: number;
  low1Fps: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
  size: string;
}

/** Summarize frame times (seconds) into average and 1%-low FPS. */
export function summarize(frames: number[]): { avgFps: number; low1Fps: number } {
  if (!frames.length) return { avgFps: 0, low1Fps: 0 };
  const total = frames.reduce((a, b) => a + b, 0);
  const sorted = [...frames].sort((a, b) => b - a);
  const worst = sorted.slice(0, Math.max(1, Math.floor(frames.length / 100)));
  const worstAvg = worst.reduce((a, b) => a + b, 0) / worst.length;
  return { avgFps: Math.round((frames.length / total) * 10) / 10, low1Fps: Math.round((1 / worstAvg) * 10) / 10 };
}

/** Walk the route on a fresh busy island at one tier, measuring every real frame. */
export function runBenchmark(app: App, tier: QualityTier, seconds = 30): Promise<BenchResult> {
  return new Promise((done) => {
    const g = buildBusyIsland();
    app.enterBench(g, tier);
    const route = benchRoute(g);
    let wp = 0;
    const frameTimes: number[] = [];
    let calls = 0;
    let tris = 0;
    let warm = 3; // skip shader warm-up after the tier switch
    let t = 0;
    app.benchDriver = (dt) => {
      // steer toward the next waypoint
      const p = g.state.player;
      const target = route[wp % route.length]!;
      const dx = target.x - p.x, dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6) wp++;
      if (warm > 0) {
        warm -= dt;
        return { x: dx / Math.max(d, 1e-3), z: dz / Math.max(d, 1e-3) };
      }
      t += dt;
      frameTimes.push(dt);
      const info = app.view.renderer.info.render;
      calls += info.calls;
      tris += info.triangles;
      if (t >= seconds) {
        app.benchDriver = null;
        const s = summarize(frameTimes);
        const cv = app.view.renderer.domElement;
        done({
          tier,
          seconds: Math.round(t * 10) / 10,
          frames: frameTimes.length,
          ...s,
          drawCalls: Math.round(calls / frameTimes.length),
          triangles: Math.round(tris / frameTimes.length),
          pixelRatio: app.view.renderer.getPixelRatio(),
          size: `${cv.width}×${cv.height}`,
        });
      }
      return { x: dx / Math.max(d, 1e-3), z: dz / Math.max(d, 1e-3) };
    };
  });
}

/** The on-screen report (also offered as JSON to copy). */
export function benchPanel(app: App, results: BenchResult[], onDone: () => void): Panel {
  const rows = results.map((r) =>
    h(
      'tr',
      null,
      h('td', null, r.tier[0]!.toUpperCase() + r.tier.slice(1)),
      h('td', null, String(r.avgFps)),
      h('td', null, String(r.low1Fps)),
      h('td', null, String(r.drawCalls)),
      h('td', null, `${Math.round(r.triangles / 1000)}k`),
      h('td', null, `${r.size} @${r.pixelRatio}`),
    ),
  );
  const json = JSON.stringify({ benchmark: 'light-crossing', results }, null, 1);
  const status = h('div', { class: 'tiny muted' }, 'Busiest spot: the plaza during the Harvest Feast, 6 PM, all neighbors out. 30 seconds per tier.');
  const p: Panel = {
    name: 'bench',
    modal: true,
    el: h(
      'div',
      { class: 'screen', style: 'z-index:12' },
      h('div', { class: 'dim' }),
      h(
        'div',
        { class: 'panel center', style: 'padding:20px;width:min(640px,96vw);display:flex;flex-direction:column;gap:10px' },
        h('h2', null, 'Performance test'),
        h('table', { class: 'bench-table' }, h('tr', null, ...['Quality', 'Avg FPS', '1% low', 'Draw calls', 'Triangles', 'Screen'].map((t) => h('th', null, t))), ...rows),
        status,
        h(
          'div',
          { class: 'row wrap' },
          ...TIERS.map((t) => btn(`Test ${t}`, () => {
            app.ui.pop(p);
            void app.runBench([t]);
          }, 'small')),
          btn('Copy results', () => void copyText(json).then((r) => (status.textContent = r === 'copied' ? 'Copied!' : 'Select the text and copy it.'))),
          btn('Done', () => {
            app.ui.pop(p);
            onDone();
          }, 'primary'),
        ),
      ),
    ),
  };
  return p;
}
