// Scene helpers for tests, screenshots and the touch audit, on `window.__lc.dev`. They only stage a
// situation (a town, some tools, standing by the water, a festival day); playing it still goes
// through the real controls. Nothing here runs unless a test or a developer calls it.
import type { App } from './app';
import { VILLAGERS } from './data/villagers';
import { give } from './sim/inventory';
import { pitchTent, sleep } from './sim/housing';
import { applyEffect, questRT } from './sim/quests';
import { cancelPlacement, confirmPlacement, placementRT, scheduleMoveIn, startPlotPlacement } from './sim/placement';
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
import { bugRT } from './sim/bugs';
import { findPath } from './sim/pathfind';
import { tileOf } from './sim/player';
import { interiorRT } from './sim/interior';
import { countItem } from './sim/inventory';
import { equippedTool } from './sim/tools';
import { BUGS, FISH } from './data/registry';
import { actionTarget } from './sim/target';
import { festivalState, skateRings } from './sim/happenings';
import { agents } from './sim/agents';

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
    /** A fresh island in slot 2 (or -1: never saved), past the opening narration and tips. */
    start(seed = 777, name = 'Wren', slot = 2): Game {
      if (slot >= 0) app.saves.remove(slot);
      const game = createGame(newGameState(seed, name, LOOK));
      app.enterGame(game, slot);
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
    learn(recipe: string): void {
      const r = g().state.recipes;
      if (!r.includes(recipe)) r.push(recipe);
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
      const fish = FISH.find((f) => f.size >= 4 && !f.seasons && f.rarity <= 2) ?? FISH[0]!;
      const id = rt.nextId++;
      const x = p.x + Math.sin(p.facing) * 2.5, z = p.z + Math.cos(p.facing) * 2.5;
      rt.shadows.push({ id, fish: fish.id, size: fish.size, where: 'river', x, z, tx: x, tz: z, heading: 0, life: 120, state: 'nibble', wait: 0 });
      rt.cast = { phase: 'reel', x, z, t: 0, target: id, nibbles: 0, nextEvent: 9, biteWindow: 0, dips: 0, reel: { progress: 0.35, cursor: 0.5, cursorV: 0, zone: 0.5, zoneW: 0.28, zoneV: 0, zoneTarget: 0.5, t: 0 } };
    },
    /** Stand in front of the plaza (open ground with room all around). */
    toPlaza(): void {
      const pl = g().world.gen.lots.plaza;
      dev.goto(pl.x + pl.w / 2 + 0.5, pl.z + pl.d + 2.5, Math.PI);
    },
    /** Where a home plot fits (position + facing), found without moving anyone. */
    plotSpot(owner = 'bellamy'): { x: number; z: number; facing: number } | null {
      const gm = g();
      const w = gm.world;
      const p = gm.state.player;
      const keep = { x: p.x, z: p.z, level: p.level, facing: p.facing };
      const was = placementRT(gm);
      if (!was) startPlotPlacement(gm, owner);
      const pl = placementRT(gm)!;
      let found: { x: number; z: number; facing: number } | null = null;
      const cx = Math.floor(p.x), cz = Math.floor(p.z);
      search: for (let r = 2; r < 24; r++)
        for (let z = cz - r; z <= cz + r; z++)
          for (let x = cx - r; x <= cx + r; x++) {
            if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) !== r || !w.inb(x, z)) continue;
            const i = w.idx(x, z);
            if (w.region(i) !== Region.West || !w.standable(i) || w.obj(i)) continue;
            for (const f of [Math.PI, 0, Math.PI / 2, -Math.PI / 2]) {
              Object.assign(p, { x: x + 0.5, z: z + 0.5, level: w.height(i), facing: f });
              pl.compute(gm, pl);
              if (pl.valid) {
                found = { x: x + 0.5, z: z + 0.5, facing: f };
                break search;
              }
            }
          }
      Object.assign(p, keep);
      if (was) pl.compute(gm, pl);
      else cancelPlacement(gm);
      return found;
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
    // ---- looking, not touching: what a player could see on screen (for tests that play by touch)
    /** A summary of what's going on. */
    peek() {
      const gm = app.game;
      if (!gm) return null;
      const p = gm.state.player;
      const rt = interiorRT(gm);
      const cast = fishingRT(gm).cast;
      return {
        mode: gm.mode,
        location: p.location,
        x: rt && p.location !== 'island' ? rt.x : p.x,
        z: rt && p.location !== 'island' ? rt.z : p.z,
        facing: p.facing,
        minute: gm.state.clock.minute,
        day: gm.state.clock.day,
        action: gm.action?.kind ?? null,
        tool: equippedTool(gm)?.kind ?? null,
        cast: cast ? cast.phase : null,
        reel: cast?.reel ? { ...cast.reel } : null,
        walking: app.tapMove.active,
        panel: app.ui.topName,
        prompt: gm.mode === 'play' && !gm.action ? (gm.resolve()?.label ?? null) : null,
        glints: p.glints,
        chapter: gm.state.quests.chapter,
        active: Object.keys(gm.state.quests.active),
        done: [...gm.state.quests.done],
        stats: { ...gm.state.stats },
        creeping: gm.creeping,
        running: gm.motion.running,
        speed: gm.motion.speed,
      };
    },
    count(id: string): number {
      return countItem(g(), id);
    },
    /** Nearest object of a kind (and item) on the island, by walking distance guess. */
    nearest(kind: string, item?: string, skip: number[] = []): { x: number; z: number; tile: number } | null {
      const gm = g();
      const w = gm.world;
      const p = gm.state.player;
      let best: { x: number; z: number; tile: number } | null = null;
      let bd = Infinity;
      for (const key in gm.state.world.objects) {
        const i = Number(key);
        const o = gm.state.world.objects[i]!;
        if (!kind.split(',').includes(o.k) || (item && o.item !== item) || skip.includes(i)) continue;
        if (w.height(i) !== w.height(tileOf(w, p.x, p.z))) continue;
        const x = (i % w.size) + 0.5, z = Math.floor(i / w.size) + 0.5;
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < bd) {
          bd = d;
          best = { x, z, tile: i };
        }
      }
      return best;
    },
    /** Walking route (tile centres) from the player to tile (x, z), or to a free tile next to it. */
    route(x: number, z: number): { x: number; z: number }[] | null {
      const gm = g();
      const w = gm.world;
      const from = tileOf(w, gm.state.player.x, gm.state.player.z);
      const goal = w.idx(Math.floor(x), Math.floor(z));
      const goals = w.standable(goal) && !w.obj(goal) ? [goal] : [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dz]) => w.idx(Math.floor(x) + dx!, Math.floor(z) + dz!)).filter((i) => w.standable(i));
      let best: number[] | null = null;
      for (const t of goals) {
        const path = t === from ? [] : findPath(w, from, t, 6000);
        if (path && (!best || path.length < best.length)) best = path;
      }
      return best ? best.map((i) => ({ x: (i % w.size) + 0.5, z: Math.floor(i / w.size) + 0.5 })) : null;
    },
    /** The nearest river or pond tile with dry land next to it: { water, shore } tile centres. */
    nearestWater(): { x: number; z: number; sx: number; sz: number } | null {
      const gm = g();
      const w = gm.world;
      const p = gm.state.player;
      const here = tileOf(w, p.x, p.z);
      let best: { x: number; z: number; sx: number; sz: number } | null = null;
      let bd = Infinity;
      for (let i = 0; i < w.size * w.size; i++) {
        if (!w.isWater(i) || w.ground(i) === Ground.Ocean) continue;
        const x = i % w.size, z = Math.floor(i / w.size);
        for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const s2 = w.idx(x + dx!, z + dz!);
          if (!w.inb(x + dx!, z + dz!) || !w.standable(s2) || w.obj(s2) || w.height(s2) !== w.height(here)) continue;
          const d = Math.hypot(x + dx! + 0.5 - p.x, z + dz! + 0.5 - p.z);
          if (d < bd) {
            bd = d;
            best = { x: x + 0.5, z: z + 0.5, sx: x + dx! + 0.5, sz: z + dz! + 0.5 };
          }
        }
      }
      return best;
    },
    /** Where a world point is on screen. */
    screen(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
      return app.view.project(x, y, z);
    },
    groundY(x: number, z: number): number {
      return g().world.surfaceY(x, z);
    },
    /** The tile the ring is on (what the action button will touch). */
    target(): { x: number; z: number; tile: number; ok: boolean } | null {
      const t = actionTarget(g());
      return t ? { x: t.x, z: t.z, tile: t.tile, ok: t.ok } : null;
    },
    rings(): { x: number; z: number }[] {
      return skateRings(g());
    },
    festivalDone(): boolean {
      return !!festivalState(g())?.done;
    },
    /** Where a person is: in the room you're in, or out on the island. */
    person(id: string): { x: number; z: number } | null {
      const gm = g();
      const rt = interiorRT(gm);
      if (gm.state.player.location !== 'island' && rt) {
        const pp = rt.room.people.find((q) => q.id === id);
        return pp ? { x: pp.x, z: pp.z } : null;
      }
      const a = agents(gm).get(id);
      return a && a.visible ? { x: a.x, z: a.z } : null;
    },
    /** A building's front door (the tile you stand on to go in). */
    door(type: string, owner?: string): { x: number; z: number; tx: number; tz: number } | null {
      const s = g().state.world.structures.find((q) => q.type === type && (!owner || q.owner === owner));
      return s ? { x: s.x + Math.floor(s.w / 2) + 0.5, z: s.z + s.d + 0.5, tx: s.x + Math.floor(s.w / 2) + 0.5, tz: s.z + s.d - 0.5 } : null;
    },
    room(): { w: number; d: number; door: { x: number; z: number } } | null {
      const rt = interiorRT(g());
      return rt ? { w: rt.room.w, d: rt.room.d, door: rt.room.door } : null;
    },
    /** Where to stand to cast at a fish: a bank tile 1–3 tiles from (x, z), and the water tile to face. */
    castSpot(x: number, z: number): { x: number; z: number; wx: number; wz: number } | null {
      const gm = g();
      const w = gm.world;
      const here = tileOf(w, gm.state.player.x, gm.state.player.z);
      let best: { x: number; z: number; wx: number; wz: number } | null = null;
      let bd = Infinity;
      for (let tz = Math.floor(z) - 4; tz <= Math.floor(z) + 4; tz++)
        for (let tx = Math.floor(x) - 4; tx <= Math.floor(x) + 4; tx++) {
          if (!w.inb(tx, tz)) continue;
          const i = w.idx(tx, tz);
          if (!w.standable(i) || w.obj(i) || w.height(i) !== w.height(here)) continue;
          for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const wi = w.idx(tx + dx!, tz + dz!);
            if (!w.inb(tx + dx!, tz + dz!) || !w.isWater(wi)) continue;
            // the bobber lands ~2.5 tiles out: how far is that from the fish?
            const bx = tx + 0.5 + dx! * 2.5, bz = tz + 0.5 + dz! * 2.5;
            const d = Math.hypot(bx - x, bz - z);
            if (d < bd) {
              bd = d;
              best = { x: tx + 0.5, z: tz + 0.5, wx: tx + dx! + 0.5, wz: tz + dz! + 0.5 };
            }
          }
        }
      return best && bd < 2.5 ? best : null;
    },
    /** Fish shadows in the water (what you see swimming). */
    shadows(): { x: number; z: number; size: number }[] {
      return fishingRT(g()).shadows.filter((s) => s.state !== 'gone').map((s) => ({ x: s.x, z: s.z, size: s.size }));
    },
    bugs(): { x: number; z: number; y: number; state: string; id: string }[] {
      return bugRT(g()).bugs.filter((b) => b.state !== 'gone').map((b) => ({ x: b.x, z: b.z, y: b.y, state: b.state, id: b.bug }));
    },
    /** A beetle on the ground a few steps in front of the player (for the bug-catching check). */
    bug(dist = 3): boolean {
      const gm = g();
      const p = gm.state.player;
      const w = gm.world;
      const rt = bugRT(gm);
      const def = BUGS.find((b) => !b.seasons && b.wariness <= 1) ?? BUGS[0]!;
      for (const a of [p.facing, p.facing + Math.PI / 2, p.facing - Math.PI / 2, p.facing + Math.PI]) {
        const x = p.x + Math.sin(a) * dist, z = p.z + Math.cos(a) * dist;
        const i = w.idx(Math.floor(x), Math.floor(z));
        if (!w.standable(i) || w.obj(i) || w.height(i) !== w.height(tileOf(w, p.x, p.z))) continue;
        rt.bugs.push({ id: rt.nextId++, bug: def.id, habitat: 'ground', x: Math.floor(x) + 0.5, y: w.surfaceY(x, z) + 0.05, z: Math.floor(z) + 0.5, tile: i, alert: 0, state: 'idle', vx: 0, vz: 0, vy: 0, t: 0, phase: 0, life: 120 });
        return true;
      }
      return false;
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
