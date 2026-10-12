import { t } from '../i18n';
import { h, setText } from '../ui/dom';
import { showModal } from '../ui/modals';
import type { App } from './App';
import type { Nav } from './flow';
import { FrameStats } from './playtest';
import { startStress } from './stress';

/** Warm-up, then measured seconds. */
const WARMUP = 3;
const MEASURE = 12;
/** Same load as the benchmark target (`npm run perf`). */
const COUNT = 300;

export interface PerfResult {
  avgFps: number;
  low1Fps: number;
  worstMs: number;
  tier: string;
  resolution: number;
  renderer: string;
  enemies: number;
  shots: number;
  fx: number;
}

export function perfVerdict(r: Pick<PerfResult, 'avgFps' | 'low1Fps'>): 'great' | 'ok' | 'slow' {
  if (r.avgFps >= 55 && r.low1Fps >= 40) return 'great';
  if (r.avgFps >= 40) return 'ok';
  return 'slow';
}

/**
 * Settings → Test performance: a 15-second busy battle (every tower, 300
 * constructs) measured on this device, with the player's quality setting.
 * Results stay on screen (and can be copied for the developer).
 */
export function runPerfTest(app: App, nav: Nav): void {
  const screen = startStress(app, nav, COUNT, { overlay: false, onQuit: () => nav.settings() });
  const label = h('div.perf-run.panel', { role: 'status' }, t('perf.running', { n: WARMUP + MEASURE }));
  screen.el.append(label);
  const stats = new FrameStats();
  // wall-clock time: frame dt is capped at 0.1 s, which would stretch the test on slow devices
  const start = performance.now();
  let last = start;
  let worst = 0;
  let load = { enemies: 0, shots: 0, fx: 0, n: 0 };
  let done = false;
  screen.onFrame(() => {
    if (done) return;
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    const time = (now - start) / 1000;
    setText(label, t('perf.running', { n: Math.max(0, Math.ceil(WARMUP + MEASURE - time)) }));
    if (time < WARMUP) return;
    stats.add(dt);
    worst = Math.max(worst, dt);
    load = { enemies: load.enemies + screen.game.enemies.length, shots: load.shots + screen.game.projectiles.length, fx: load.fx + screen.view.particleCount, n: load.n + 1 };
    if (time < WARMUP + MEASURE) return;
    done = true;
    label.remove();
    screen.paused = true;
    const n = Math.max(1, load.n);
    showResults(app, nav, {
      avgFps: Math.round(stats.avgFps),
      low1Fps: Math.round(stats.low1Fps),
      worstMs: Math.round(worst * 1000),
      tier: app.quality.tier,
      resolution: Math.round(app.stage.resolution * 100) / 100,
      renderer: app.stage.rendererName,
      enemies: Math.round(load.enemies / n),
      shots: Math.round(load.shots / n),
      fx: Math.round(load.fx / n),
    });
  });
}

function showResults(app: App, nav: Nav, r: PerfResult): void {
  const rows: [string, string][] = [
    [t('perf.avg'), t('perf.fps', { n: r.avgFps })],
    [t('perf.low'), t('perf.fps', { n: r.low1Fps })],
    [t('perf.worst'), t('perf.ms', { n: r.worstMs })],
    [t('perf.quality'), `${t(`settings.q.${r.tier as 'low'}`)} · ${r.resolution}×`],
    [t('perf.renderer'), r.renderer === 'webgl' ? 'WebGL' : r.renderer === 'webgpu' ? 'WebGPU' : 'Canvas'],
    [t('perf.load'), t('perf.loadValue', { enemies: r.enemies, shots: r.shots, fx: r.fx })],
    [t('perf.screen'), t('perf.screenValue', { w: innerWidth, h: innerHeight, dpr: Math.round(devicePixelRatio * 100) / 100 })],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const status = h('p.note', { role: 'status' });
  const m = showModal(
    app.ui,
    [
      h('h2', null, t('perf.title')),
      h('p', null, t(`perf.verdict.${perfVerdict(r)}`)),
      h('table.stats-table.perf-table', null, h('tbody', null, ...rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))))),
      status,
      h(
        'div.row',
        null,
        h(
          'button.btn',
          {
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(text);
                status.textContent = t('workshop.copied');
              } catch {
                status.textContent = t('workshop.copyFail');
              }
            },
          },
          t('perf.copy'),
        ),
        h(
          'button.btn.green',
          {
            onClick: () => {
              m.close();
              nav.settings();
            },
          },
          t('common.ok'),
        ),
      ),
    ],
    { cls: 'wide' },
  );
}
