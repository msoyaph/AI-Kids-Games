/**
 * Benchmark (Settings → Test performance, or ?bench=1): flies the camera through the
 * busiest scenes — a farm at full harvest, the festival town, and a deep mine floor —
 * and reports average FPS and 1%-low FPS. Uses a throwaway game; never touches saves.
 */
import { TILE } from '../core/math';
import { CROPS } from '../data/crops';
import { CROP_BALANCE } from '../tuning';
import { Sim } from '../sim';
import { addAnimal } from '../sim/animals';
import { enterFloor } from '../sim/mine';
import { resetNpcs } from '../sim/npcs';
import { SOIL_TILLED, SOIL_WATERED } from '../sim/types';
import { h } from '../ui/dom';
import type { Game } from './game';

export interface SceneResult {
  name: string;
  avgFps: number;
  lowFps: number;
  frames: number;
}

export interface BenchResult {
  scenes: SceneResult[];
  avgFps: number;
  renderer: string;
  resolution: string;
  zoom: number;
}

function buildFarm(): Sim {
  const sim = Sim.newGame({ name: 'Bench', farm: 'Bench', pet: 'dog', petName: 'Benchy', seed: 777 });
  const farm = sim.loc('farm');
  sim.state.day = 12; // summer
  sim.state.min = 17 * 60 + 40;
  sim.state.weather = 'rain';
  sim.state.buildings.built = { coop: 2, barn: 2, silo: 0, well: 0, shed: 0 };
  sim.refreshLoc('farm');
  const summer = CROPS.filter((c) => c.seasons.includes(1));
  let k = 0;
  for (let y = 3; y < farm.h - 3; y++)
    for (let x = 3; x < farm.w - 3; x++) {
      if (!farm.isTillable(x, y) || farm.inClearZone(x, y)) continue;
      farm.removeObj(x, y);
      if ((x % 9 === 4) && (y % 9 === 4)) {
        farm.setObj(x, y, { k: 'sprinkler', id: 'sprinkler3' });
        continue;
      }
      if ((x % 13 === 7) && (y % 11 === 6)) {
        farm.setObj(x, y, { k: 'machine', id: 'preservesJar', inp: 'tomato', t: 500 });
        continue;
      }
      farm.setSoil(x, y, SOIL_TILLED | SOIL_WATERED);
      const c = summer[k++ % summer.length];
      farm.setObj(x, y, { k: 'crop', id: c.id, g: CROP_BALANCE[c.id].days });
    }
  for (const kind of ['chicken', 'duck', 'rabbit', 'cow', 'goat', 'sheep', 'chicken', 'cow', 'sheep', 'goat', 'duck', 'chicken']) {
    const a = addAnimal(sim, kind, kind);
    a.loc = 'farm';
    a.x = (20 + (a.id * 7) % 30) * TILE + 8;
    a.y = (18 + (a.id * 5) % 20) * TILE + 14;
  }
  sim.warpTo('farm', 32, 20, 0);
  return sim;
}

function buildFestival(): Sim {
  const sim = Sim.newGame({ name: 'Bench', farm: 'Bench', pet: 'cat', petName: 'Benchy', seed: 778 });
  sim.state.day = 7; // Sprout Fair
  sim.state.min = 11 * 60;
  sim.state.weather = 'sun';
  resetNpcs(sim);
  sim.warpTo('town', 35, 28, 3);
  return sim;
}

function buildMine(): Sim {
  const sim = Sim.newGame({ name: 'Bench', farm: 'Bench', pet: 'cat', petName: 'Benchy', seed: 779 });
  sim.state.story.done.push('minerals');
  enterFloor(sim, 34);
  return sim;
}

const SCENES: { name: string; make: () => Sim; path: (t: number, sim: Sim) => { x: number; y: number } }[] = [
  { name: 'Farm at full harvest (rain, dusk)', make: buildFarm, path: (t) => ({ x: (14 + t * 7) * TILE, y: (14 + Math.sin(t * 0.9) * 8 + t * 2) * TILE }) },
  { name: 'Festival in town', make: buildFestival, path: (t) => ({ x: (30 + Math.sin(t * 0.8) * 9) * TILE, y: (25 + Math.cos(t * 0.6) * 6) * TILE }) },
  { name: 'Deep mine with critters', make: buildMine, path: (t, sim) => ({ x: sim.p.x + Math.sin(t) * 60, y: sim.p.y + Math.cos(t * 0.7) * 40 }) },
];

let overlay: HTMLElement | null = null;

export function fpsOverlay(g: Game): HTMLElement {
  if (!overlay) {
    overlay = h('div', { class: 'fps panel dark' });
    g.uiRoot.appendChild(overlay);
  }
  return overlay;
}

export async function runBenchmark(g: Game, secondsPerScene = 6): Promise<BenchResult> {
  const prevSim = g.sim, prevMode = g.mode;
  g.modals.closeAll();
  const out: SceneResult[] = [];
  const ov = fpsOverlay(g);
  ov.style.display = '';
  g.hud.show(false);
  g.title.show(false);
  for (const sc of SCENES) {
    const sim = sc.make();
    g.attachSimForBench(sim);
    g.mode = 'bench';
    g.enterLocation();
    g.player.visible = true;
    const times: number[] = [];
    let last = performance.now();
    const t0 = last;
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const t = (now - t0) / 1000;
        if (t > 0.5) times.push(dt);
        g.camTarget = sc.path(t, sim);
        ov.textContent = `${sc.name}\n${Math.round(1 / Math.max(0.001, dt))} fps`;
        if (t >= secondsPerScene) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    times.sort((a, b) => b - a);
    const avg = times.length / Math.max(0.001, times.reduce((s, x) => s + x, 0));
    const low = 1 / (times[Math.floor(times.length * 0.01)] ?? 0.016);
    out.push({ name: sc.name, avgFps: Math.round(avg), lowFps: Math.round(low), frames: times.length });
  }
  g.camTarget = null;
  const res: BenchResult = {
    scenes: out,
    avgFps: Math.round(out.reduce((s, r) => s + r.avgFps, 0) / out.length),
    renderer: g.host.kind,
    resolution: `${g.host.width}×${g.host.height}`,
    zoom: g.host.zoom,
  };
  // restore
  if (prevMode === 'play') {
    g.attachSimForBench(prevSim);
    g.mode = 'play';
    g.enterLocation();
    g.hud.show(true);
  } else g.showTitle();
  ov.style.display = g.settings.showFps ? '' : 'none';
  g.lastBench = res;
  g.modals.ask('Performance test', h('div', null,
    ...res.scenes.map((s) => h('div', { class: 'row' }, h('div', { class: 'nm' }, h('b', null, s.name), h('small', null, `${s.frames} frames`)), h('b', null, `${s.avgFps} fps`), h('small', null, `(low ${s.lowFps})`))),
    h('p', null, `Renderer: ${res.renderer} · ${res.resolution} · zoom ${res.zoom}×`),
    h('p', null, res.avgFps >= 55 ? 'Super smooth! 🎉' : res.avgFps >= 40 ? 'Pretty smooth. Try "Low" graphics for more speed.' : 'A bit slow on this device — the game will lower its quality automatically.'),
  ), [{ label: 'OK', primary: true }]);
  return res;
}
