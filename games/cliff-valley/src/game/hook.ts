/**
 * window.__cliffvalley — a small, frozen test hook (like the other Ai Kids Games titles)
 * so automated tests and the site's preview capture can inspect and drive the game.
 * It never touches save slots unless a test explicitly asks to load one.
 */
import { TILE } from '../core/math';
import { CROPS } from '../data/crops';
import { CROP_BALANCE } from '../tuning';
import { Sim } from '../sim';
import { addAnimal } from '../sim/animals';
import { enterFloor } from '../sim/mine';
import { resetNpcs } from '../sim/npcs';
import { SEASON_NAMES, dayOfSeason, seasonOf, type Weather } from '../sim/state';
import { SOIL_TILLED, SOIL_WATERED } from '../sim/types';
import type { Game } from './game';

export const CAPTURE_SCENES = ['spring', 'summer', 'autumn', 'winter', 'farmHarvest', 'town', 'festival', 'mine', 'fishingSunset', 'title'] as const;
export type CaptureScene = (typeof CAPTURE_SCENES)[number];

function freshSim(seed: number): Sim {
  return Sim.newGame({ name: 'Sunny', farm: 'Clover', pet: 'dog', petName: 'Biscuit', seed });
}

function plantFarm(sim: Sim, season: number, mature: boolean): void {
  const farm = sim.loc('farm');
  const crops = CROPS.filter((c) => c.seasons.includes(season));
  let k = 0;
  for (let y = 15; y < 32; y++)
    for (let x = 18; x < 44; x++) {
      if (!farm.isTillable(x, y) || farm.inClearZone(x, y)) continue;
      farm.removeObj(x, y);
      if (x % 3 === 2 && y % 4 === 3) continue; // little paths
      farm.setSoil(x, y, SOIL_TILLED | (season === 3 ? 0 : SOIL_WATERED));
      const c = crops[Math.floor(k++ / 6) % crops.length];
      const days = CROP_BALANCE[c.id].days;
      farm.setObj(x, y, { k: 'crop', id: c.id, g: mature ? days : Math.max(1, Math.floor(days * ((x + y) % 4) / 4)) });
    }
  farm.setObj(30, 23, { k: 'scarecrow', id: 'scarecrow' });
  for (const [x, y] of [[24, 19], [36, 19], [24, 27], [36, 27]]) farm.setObj(x, y, { k: 'sprinkler', id: 'sprinkler2' });
}

export function buildCapture(name: CaptureScene): Sim {
  let sim: Sim;
  switch (name) {
    case 'spring':
    case 'summer':
    case 'autumn':
    case 'winter': {
      const s = ['spring', 'summer', 'autumn', 'winter'].indexOf(name);
      sim = freshSim(100 + s);
      sim.state.day = s * 10 + 4;
      sim.state.min = 11 * 60;
      sim.state.weather = s === 3 ? 'snow' : 'sun';
      sim.state.buildings.built = { coop: 1, barn: 1, silo: 0, well: 0 };
      sim.refreshLoc('farm');
      plantFarm(sim, s, false);
      for (const kind of ['chicken', 'cow', 'sheep', 'duck']) {
        const a = addAnimal(sim, kind, kind);
        a.loc = 'farm';
        a.x = (40 + a.id * 2) * TILE + 8;
        a.y = 9 * TILE + 14;
      }
      sim.warpTo('farm', 31, 21, 0);
      break;
    }
    case 'farmHarvest':
      sim = freshSim(201);
      sim.state.day = 16;
      sim.state.min = 16 * 60 + 30;
      sim.state.weather = 'sun';
      plantFarm(sim, 1, true);
      sim.warpTo('farm', 31, 21, 0);
      break;
    case 'town':
      sim = freshSim(202);
      sim.state.day = 3;
      sim.state.min = 13 * 60;
      sim.state.weather = 'sun';
      resetNpcs(sim);
      sim.warpTo('town', 36, 23, 0);
      break;
    case 'festival':
      sim = freshSim(203);
      sim.state.day = 37; // Starlight Night
      sim.state.min = 18 * 60 + 30;
      sim.state.weather = 'snow';
      resetNpcs(sim);
      sim.warpTo('town', 35, 27, 3);
      break;
    case 'mine':
      sim = freshSim(204);
      sim.state.story.done.push('minerals');
      enterFloor(sim, 24);
      break;
    case 'fishingSunset':
      sim = freshSim(205);
      sim.state.day = 13;
      sim.state.min = 19 * 60 + 20;
      sim.state.weather = 'sun';
      sim.state.story.done.push('fish');
      sim.p.tools.rod = 1;
      sim.p.inv[5] = { id: 'tool.rod', n: 1, q: 0 };
      sim.p.sel = 5;
      sim.warpTo('beach', 39, 28, 0);
      break;
    default:
      sim = freshSim(206);
  }
  return sim;
}

export function installHook(g: Game): void {
  const hook = {
    version: 1,
    get ready() {
      return g.mode !== 'boot';
    },
    get info() {
      const sim = g.sim;
      if (!sim) return null;
      const st = sim.state;
      return {
        mode: g.mode,
        day: st.day,
        season: SEASON_NAMES[seasonOf(st.day)],
        dayOfSeason: dayOfSeason(st.day),
        minutes: Math.round(st.min),
        weather: st.weather,
        location: sim.p.loc,
        tile: { ...sim.playerTile() },
        coins: sim.p.coins,
        energy: Math.round(sim.p.energy),
        boards: st.story.done.slice(),
        finale: st.story.finale,
        fps: Math.round(g.fps),
        renderer: g.host.kind,
        zoom: g.host.zoom,
        modalOpen: g.modals.open,
        blocked: g.inputBlocked,
      };
    },
    /** Start a new (unsaved unless it sleeps) game in a slot. */
    newGame(o: { name?: string; farm?: string; pet?: 'dog' | 'cat'; petName?: string; seed?: number; slot?: number } = {}) {
      g.newGame(o.slot ?? 3, { name: o.name ?? 'Tester', farm: o.farm ?? 'Test', pet: o.pet ?? 'dog', petName: o.petName ?? 'Pup', seed: o.seed ?? 1234 });
      g.sim.state.flags.introSeen = 1;
      return true;
    },
    load(slot: number) {
      g.loadGame(slot);
      return g.mode === 'play';
    },
    /** Jump to a ready-made scene for screenshots (does not save). */
    scene(name: CaptureScene) {
      g.modals.closeAll();
      if (name === 'title') {
        g.showTitle();
        return true;
      }
      const sim = buildCapture(name);
      sim.state.flags.introSeen = 1;
      for (const b of sim.state.story.done) sim.state.flags[`repairSeen.${b}`] = 1; // no story scenes in previews
      sim.state.tips = ['move', 'tools', 'till', 'plant', 'water', 'harvest', 'energy', 'night', 'town', 'hall', 'mine', 'mineFloor', 'rod', 'animal', 'machine', 'kitchen', 'craft'];
      g.attachSimForBench(sim);
      g.mode = 'play';
      g.title.show(false);
      g.bakePlayer();
      g.player.visible = true;
      g.playerShadow.visible = true;
      g.enterLocation();
      g.hud.show(true);
      g.slot = 0; // capture scenes never save
      return true;
    },
    warp(loc: string, x: number, y: number) {
      g.sim.warpTo(loc, x, y, 0);
      g.enterLocation();
    },
    /** Where a tile's center is on screen, in CSS pixels relative to the game canvas. */
    screenOf(x: number, y: number) {
      const z = g.host.zoom, dpr = g.host.dpr;
      return { x: ((x + 0.5) * TILE * z + g.view.root.x) / dpr, y: ((y + 0.5) * TILE * z + g.view.root.y) / dpr };
    },
    setTime(min: number) {
      g.sim.state.min = min;
    },
    setWeather(w: Weather) {
      g.sim.state.weather = w;
    },
    sleep() {
      void g.goToBed(false);
    },
    closeModals() {
      g.modals.closeAll();
    },
    bench(seconds = 5) {
      return import('./bench').then((b) => b.runBenchmark(g, seconds));
    },
    get lastBench() {
      return g.lastBench;
    },
    press(action: string) {
      g.input.push(action as never);
    },
    scenes: CAPTURE_SCENES,
  };
  Object.defineProperty(window, '__cliffvalley', { value: Object.freeze(hook), writable: false, configurable: false });
}
