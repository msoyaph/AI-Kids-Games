// Scene helpers for tests, screenshots and the touch audit, on `window.__lc.dev`. They only stage a
// situation (a town, some tools, standing by the water, a festival day); playing it still goes
// through the real controls. Nothing here runs unless a test or a developer calls it.
import type { App } from './app';
import { VILLAGERS } from './data/villagers';
import { give } from './sim/inventory';
import { pitchTent, sleep } from './sim/housing';
import { applyEffect, questRT } from './sim/quests';
import { confirmPlacement, placementRT, scheduleMoveIn, startPlotPlacement } from './sim/placement';
import { startBuildPlacement } from './sim/build';
import { vstate } from './sim/villagers';
import { setSeason, setSeasonsPaused } from './sim/seasons';
import { equipKind } from './sim/tools';
import type { Season, ToolKind } from './data/types';
import { enterInterior, exitInterior, type RoomKind } from './sim/interior';
import { startContest } from './sim/challenges';
import { fishingRT } from './sim/fishing';
import { createGame } from './sim/systems';
import { newGameState } from './sim/state';
import { FESTIVAL_BY_ID, type FestivalId } from './data/festivals';
import { Ground, Region } from './world/types';
import type { Game } from './sim/game';

const TIPS = ['move', 'phone', 'net', 'rod', 'reel', 'axe', 'shovel', 'can', 'ladder', 'inventory', 'craft', 'shop', 'home', 'villager', 'night', 'rain', 'placement', 'museum', 'challenge', 'decor'];
const LOOK = { skin: 1, hair: 3, hairColor: 4, eyes: 1, mouth: 0, blush: true, outfit: 5 };

/** Stand on a free tile next to `target`, facing it. */
function faceTile(g: Game, target: number): boolean {
  const w = g.world;
  const tx = target % w.size, tz = Math.floor(target / w.size);
  for (const [dx, dz, f] of [[0, 1, Math.PI], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2], [0, -1, 0]] as const) {
    const x = tx + dx, z = tz + dz;
    if (!w.inb(x, z)) continue;
    const i = w.idx(x, z);
    if (!w.standable(i) || w.structure(i)) continue;
    if (!w.isWater(target) && w.height(i) !== w.height(target)) continue;
    const o = w.obj(i);
    if (o && o.k !== 'flower' && o.k !== 'weed') continue;
    const p = g.state.player;
    p.x = x + 0.5;
    p.z = z + 0.5;
    p.level = w.height(i);
    p.facing = f;
    return true;
  }
  return false;
}

export function devTools(app: App) {
  const g = () => {
    if (!app.game) throw new Error('no game running');
    return app.game;
  };
  const dev = {
    /** A fresh island in slot 2, past the opening narration and tips. */
    start(seed = 777, name = 'Wren'): Game {
      app.saves.remove(2);
      const game = createGame(newGameState(seed, name, LOOK));
      app.enterGame(game, 2);
      app.ui.closeAll();
      game.state.tips = Object.fromEntries(TIPS.map((k) => [k, 1]));
      questRT(game).inbox.length = 0;
      return game;
    },
    /** Tent, shop, museum and some neighbors moved in. */
    town(residents: string[] = ['tansy', 'rusk', 'juno', 'kip']): void {
      const gm = g();
      pitchTent(gm);
      gm.state.home.level = Math.max(gm.state.home.level, 1);
      applyEffect(gm, { type: 'spawn', struct: 'shopCart' });
      applyEffect(gm, { type: 'construct', from: 'shopCart', to: 'shop' });
      applyEffect(gm, { type: 'spawn', struct: 'museumTent' });
      applyEffect(gm, { type: 'construct', from: 'museumTent', to: 'museum' });
      const w = gm.world;
      const p = gm.state.player;
      const keep = { x: p.x, z: p.z, level: p.level, facing: p.facing };
      for (const id of residents) {
        startPlotPlacement(gm, id);
        const pl = placementRT(gm)!;
        for (let i = 0; i < w.size * w.size; i++) {
          if (w.region(i) !== Region.West || !w.standable(i)) continue;
          p.x = (i % w.size) + 0.5;
          p.z = Math.floor(i / w.size) + 0.5;
          p.level = w.height(i);
          p.facing = Math.PI;
          pl.compute(gm, pl);
          if (pl.valid) {
            confirmPlacement(gm);
            break;
          }
        }
      }
      scheduleMoveIn(gm, residents);
      gm.state.clock.minute = 22 * 60;
      sleep(gm);
      for (const id of residents) vstate(gm, id).friendship = 45;
      Object.assign(p, keep);
      gm.emit('structuresChanged', {});
      app.ui.closeAll();
      questRT(gm).inbox.length = 0;
    },
    /** Every tool in the pockets. */
    tools(): void {
      for (const id of ['net_flimsy', 'rod_flimsy', 'axe_flimsy', 'shovel_flimsy', 'can_flimsy', 'ladder']) give(g(), id, 1);
    },
    equip(kind: ToolKind): boolean {
      return equipKind(g(), kind);
    },
    give(id: string, n = 1): void {
      give(g(), id, n);
    },
    hour(h: number): void {
      g().state.clock.minute = Math.round(h * 60);
    },
    season(s: Season, day = 3): void {
      const gm = g();
      gm.state.quests.chapter = Math.max(gm.state.quests.chapter, 3);
      setSeason(gm, s, day);
      setSeasonsPaused(gm, true);
      gm.state.weather.today = 'sunny';
      app.ui.closeAll();
      questRT(gm).inbox.length = 0;
    },
    /** Later in the story: the contests are unlocked. */
    chapter(n: number): void {
      const q = g().state.quests;
      q.chapter = n;
      if (n >= 4) for (const id of ['m4_tourney', 'm4_bugoff']) if (!q.done.includes(id)) q.done.push(id);
    },
    goto(x: number, z: number, facing = Math.PI): void {
      const p = g().state.player;
      p.x = x;
      p.z = z;
      p.facing = facing;
      p.level = g().world.height(g().world.idx(Math.floor(x), Math.floor(z)));
    },
    /** Stand next to the nearest tree / rock / dig spot / water / flower and face it. */
    face(kind: 'tree' | 'rock' | 'dig' | 'water' | 'flower' | 'weed'): boolean {
      const gm = g();
      const w = gm.world;
      const p = gm.state.player;
      const tiles = [...Array(w.size * w.size).keys()].sort((a, b) => Math.hypot((a % w.size) - p.x, Math.floor(a / w.size) - p.z) - Math.hypot((b % w.size) - p.x, Math.floor(b / w.size) - p.z));
      for (const i of tiles) {
        const o = w.obj(i);
        const ok =
          kind === 'water'
            ? w.isWater(i) && w.ground(i) !== Ground.Ocean
            : kind === 'tree'
              ? o?.k === 'tree' || o?.k === 'fruitTree'
              : o?.k === kind;
        if (ok && faceTile(gm, i)) return true;
      }
      return false;
    },
    inside(kind: RoomKind): void {
      app.ui.closeAll();
      enterInterior(g(), kind);
    },
    outside(): void {
      exitInterior(g());
    },
    panel(name: string, arg?: unknown): void {
      app.panels[name]?.(arg);
    },
    /** A big fish on the line: the reel minigame starts. */
    reel(): void {
      const rt = fishingRT(g());
      const p = g().state.player;
      rt.cast = { phase: 'reel', x: p.x, z: p.z + 2, t: 0, target: -1, nibbles: 0, nextEvent: 9, biteWindow: 0, dips: 0, reel: { progress: 0.35, cursor: 0.5, cursorV: 0, zone: 0.5, zoneW: 0.28, zoneV: 0, zoneTarget: 0.5, t: 0 } };
    },
    plot(owner = 'bellamy'): void {
      startPlotPlacement(g(), owner);
    },
    build(kind: 'bridge' | 'ramp'): boolean {
      return startBuildPlacement(g(), kind);
    },
    contest(kind: 'tournament' | 'bugoff'): boolean {
      dev.chapter(4);
      return startContest(g(), kind);
    },
    /** Festival day at the right time, with the host moved in. */
    festival(id: FestivalId): void {
      const f = FESTIVAL_BY_ID[id];
      dev.season(f.season, f.day);
      dev.hour(f.hours[0] + 1);
    },
    residents(): string[] {
      return VILLAGERS.map((v) => v.id);
    },
    /** Lose (and later restore) the WebGL context, like a phone under memory pressure. */
    loseGL(): boolean {
      const ext = app.view.renderer.getContext().getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      (dev as { glExt?: WEBGL_lose_context }).glExt = ext;
      return true;
    },
    restoreGL(): void {
      (dev as { glExt?: WEBGL_lose_context }).glExt?.restoreContext();
    },
  };
  return dev;
}
