import type { App } from '../../game/app';
import { benchSummary, runBenchmark, type BenchResult } from '../../game/benchmark';
import type { QualitySetting } from '../../render/quality';
import { button, h, type Screen } from '../ui';
import { copyOverlay } from './playtest';

/** Start the performance test; `back` runs when the player leaves the results card. */
export function startBenchmark(app: App, back: () => void, seconds = 60, quality?: QualitySetting): void {
  const label = h('div', { class: 'bench-label', role: 'status' }, `Performance test — ${seconds} s left`);
  app.uiRoot.appendChild(label);
  app.audio.ui('start');
  void runBenchmark(app, seconds, quality, (left) => (label.textContent = `Performance test — ${left} s left`)).then((r) => {
    label.remove();
    if (!r) return; // left early through the pause menu
    console.info(benchSummary(r));
    (window as unknown as { __calex?: Record<string, unknown> }).__calex!.lastBench = r;
    app.loop.simPaused = true;
    app.session?.hideHud();
    app.ui.show(benchResultsScreen(app, r, () => {
      app.endSession();
      back();
    }, () => {
      app.endSession();
      startBenchmark(app, back, seconds, quality);
    }));
  });
}

function stat(label: string, value: string, cls = ''): HTMLElement {
  return h('div', { class: `bench-stat ${cls}` }, h('b', null, value), h('span', null, label));
}

export function benchResultsScreen(app: App, r: BenchResult, done: () => void, again: () => void): Screen {
  const grade = r.avgFps >= 55 && r.low1Fps >= 40 ? 'good' : r.avgFps >= 40 ? 'ok' : 'slow';
  const verdict = grade === 'good' ? 'Runs smoothly on this device! 🎉' : grade === 'ok' ? 'Playable. Try Low graphics for a smoother race.' : 'This device struggles — pick Low graphics in Settings.';
  const bars = h('div', { class: 'bench-bars', 'aria-label': 'Frames per second, each bar is one second' });
  for (const t of r.timeline) {
    const b = h('i', { title: `${t.t}s: ${t.fps} fps · ${t.tier}${t.scale < 1 ? ` ×${t.scale}` : ''}` });
    b.style.height = `${Math.max(6, Math.min(100, (t.fps / 60) * 100))}%`;
    b.className = t.fps >= 55 ? 'g' : t.fps >= 40 ? 'y' : 'r';
    bars.appendChild(b);
  }
  const el = h(
    'div',
    { class: 'dim', style: 'gap:10px' },
    h('div', { class: 'topbar' }, h('div', { class: 'title-h' }, 'Performance test'), h('div', { class: 'spacer' }), button('Done', done, 'small yellow')),
    h(
      'div',
      { class: 'panel menu-col scroll bench-card', style: 'flex:1;min-height:0' },
      h('div', { class: `bench-verdict ${grade}` }, verdict),
      h(
        'div',
        { class: 'bench-grid' },
        stat('average FPS', String(r.avgFps), grade),
        stat('1% low FPS', String(r.low1Fps)),
        stat('frame time p99', `${r.p99Ms} ms`),
        stat('draw calls (avg / max)', `${r.avgDraws} / ${r.maxDraws}`),
        stat('triangles (avg)', `${Math.round(r.avgTris / 1000)}k`),
        stat('graphics', `${r.finalTier}${r.finalScale < 1 ? ` ×${r.finalScale}` : ''}`),
      ),
      bars,
      h('div', { class: 'hint' }, `Tier per second: ${[...new Set(r.timeline.map((t) => t.tier))].join(' → ')} · ${r.viewport} @ DPR ${r.dpr}`),
      h('div', { class: 'hint' }, `GPU: ${r.gpu}`),
      h('div', { class: 'hint' }, `Memory: ${r.geometries} geometries · ${r.textures} textures · ~${r.bufferMB} MB of 3D data${r.heapEndMB !== null ? ` · JS heap ${r.heapEndMB} MB (peak ${r.heapPeakMB})` : ''}`),
      h('div', { class: 'hint' }, `Scenery: ${r.sceneryChunks}`),
      h(
        'div',
        { class: 'menu-row' },
        button('Copy results', () => app.ui.showOverlay(copyOverlay(app, 'Performance results', `${benchSummary(r)}\n\n${JSON.stringify(r)}`, 'Copy these numbers and send them to whoever asked for the test.')), 'small'),
        button('Run again ↻', again, 'small ghost'),
      ),
    ),
  );
  return { el, onBack: done, fullCover: false };
}
