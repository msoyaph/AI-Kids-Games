import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { BODY_BY_ID, bodyForArea, SYSTEM_BY_ID, type SystemDef, type SystemId } from '../data/bodies';
import { levelById } from '../data/levels';
import type { ObjectiveDef, Where } from '../data/missionTypes';
import type { FBody } from '../systems/flight';
import { STICKERS } from '../data/stickers';
import { condOk } from '../systems/level';
import type { FlightExtras } from '../systems/flightWorld';
import { h } from '../ui/dom';
import { closeTopModal, openModal } from '../ui/modal';
import { toast } from '../ui/toast';
import { readAloudOn, speak } from '../ui/speech';
import { button } from '../ui/widgets';
import { exploreHooks } from './exploreHooks';
import { directorFactory, findBody, type FlightDirector, type FlightTarget } from './flightDirector';
import type { FlightScene, FlightSceneParams } from './FlightScene';
import { landingHooks } from './landingHooks';
import { mapHooks } from './mapHooks';

/** Seconds since the tracked objective last moved forward (drives gentle hints). */
let stuckT = 0;
let lastKey = '';

/** Call every frame in play scenes: shows the objective's hint if the player seems stuck. */
export function hintTick(dt: number): void {
  const cur = S.missions?.currentObjective();
  if (!cur) return;
  const key = `${cur.mission.id}:${cur.prog.step}:${cur.prog.count}`;
  if (key !== lastKey) {
    lastKey = key;
    stuckT = 0;
    return;
  }
  stuckT += dt;
  if (stuckT >= S.state.tuning.hintEvery) {
    stuckT = 0;
    const text = cur.obj.hint ?? `${cur.obj.text}. Follow the yellow arrow!`;
    toast(text, 'question', 5000);
    if (readAloudOn()) speak(text);
  }
}

/** HUD label for the tracked objective, with a counter for "collect 3" style goals. */
export function objectiveLabel(): { text: string; icon: string } | null {
  const cur = S.missions?.currentObjective();
  if (!cur) return null;
  const need = cur.obj.count ?? 1;
  const progress = need > 1 ? ` (${Math.min(need, Math.floor(cur.prog.count))}/${need})` : '';
  return { text: cur.obj.text + progress, icon: cur.obj.icon ?? 'target' };
}

/** Fill in system/body from an objective's area or body. */
export function whereOf(obj: ObjectiveDef): Where {
  const w: Where = { ...(obj.where ?? {}) };
  if (!w.body && w.area) w.body = bodyForArea(w.area)?.id;
  if (!w.body && obj.body) w.body = obj.body;
  if (!w.system && w.body) w.system = BODY_BY_ID[w.body]?.system;
  if (!w.system && obj.system) w.system = obj.system as SystemId;
  return w;
}

/** Areas you can visit on a body right now. */
export function openAreas(bodyId: string): string[] {
  const body = BODY_BY_ID[bodyId];
  const cs = exploreHooks.condState();
  return (body?.areas ?? []).filter((a) => condOk(levelById(a)?.unlock, cs));
}

function currentWhere(): Where | null {
  const cur = S.missions?.currentObjective();
  return cur ? whereOf(cur.obj) : null;
}

// ------------------------------------------------------------------ flight

function missionFlightDirector(p: FlightSceneParams): FlightDirector {
  const routeSystems = new Set<string>([p.from, p.to]);
  let hudT = 0;
  const extras: FlightExtras = {};
  for (const def of S.missions.active()) {
    const prog = S.missions.progress(def.id)!;
    for (let i = prog.step; i < def.objectives.length; i++) {
      const o = def.objectives[i];
      const w = whereOf(o);
      if (!o.flight || (w.system && !routeSystems.has(w.system))) continue;
      if (o.flight.course && !extras.course) extras.course = o.flight.course;
      if (o.flight.scanObjects && !extras.scanObjects) extras.scanObjects = o.flight.scanObjects;
      if (o.flight.hauls && !extras.hauls) extras.hauls = o.flight.hauls;
      if (o.flight.glimmers && !extras.glimmers) extras.glimmers = o.flight.glimmers;
    }
  }
  // Race courses chosen from the race board win over mission rings.
  if (p.course) extras.course = p.course;
  for (const st of STICKERS) {
    if (st.source.kind !== 'space' || S.state.data.stickers.includes(st.id)) continue;
    const body = BODY_BY_ID[st.source.body];
    if (body && routeSystems.has(body.system)) extras.sticker = { id: st.id, near: st.source.body };
  }

  // Everything below runs every frame, so it reuses objects and avoids closures.
  const out: FlightTarget = { x: 0, y: 0, r: 0 };
  const set = (x: number, y: number, r: number): FlightTarget => {
    out.x = x;
    out.y = y;
    out.r = r;
    return out;
  };
  /** Nearest alive item in a list (coins, fuel, hauls, glimmers). */
  const nearestAlive = (scene: FlightScene, list: Array<{ x: number; y: number; alive: boolean }>, r: number): FlightTarget | null => {
    const ship = scene.getShip();
    let bi = -1;
    let bd = Infinity;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (!it.alive) continue;
      const d = (it.x - ship.x) ** 2 + (it.y - ship.y) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return bi >= 0 ? set(list[bi].x, list[bi].y, r) : null;
  };
  // Cached objective lookup: only recomputed when the tracked mission or step changes.
  let cacheMission: string | null = '';
  let cacheStep = -1;
  let cacheObj: ObjectiveDef | null = null;
  let cacheSeen: string[] = [];
  let cacheBody: FBody | null = null;
  let cacheFallback: FBody | null = null;
  let cacheScene: FlightScene | null = null;
  const refresh = (scene: FlightScene) => {
    const id = S.state.data.activeMission;
    const prog = id ? S.state.data.missions[id] : undefined;
    const step = prog && prog.status === 'active' ? prog.step : -1;
    if (id === cacheMission && step === cacheStep && scene === cacheScene) {
      if (prog) cacheSeen = prog.seen;
      return;
    }
    cacheMission = id;
    cacheStep = step;
    cacheScene = scene;
    cacheObj = id && step >= 0 ? S.missions.byId[id]?.objectives[step] ?? null : null;
    cacheSeen = prog?.seen ?? [];
    cacheBody = null;
    cacheFallback = findBody(scene, SYSTEM_BY_ID[p.to].main);
    if (cacheObj) {
      const w = whereOf(cacheObj);
      if (w.body) cacheBody = findBody(scene, w.body);
      if (!cacheBody && w.system && routeSystems.has(w.system)) cacheBody = findBody(scene, SYSTEM_BY_ID[w.system as SystemId].main);
      if (!cacheBody && (w.place || cacheObj.kind === 'home' || cacheObj.kind === 'talk')) cacheBody = findBody(scene, 'earth');
    }
  };

  return {
    extras: () => extras,
    target: (scene): FlightTarget | null => {
      const world = scene.getLayout().world;
      if (scene.isRacing()) {
        const g = world.gates[world.nextGate];
        return g ? set(g.x, g.y, g.r * 0.5) : null;
      }
      refresh(scene);
      const o = cacheObj;
      if (o) {
        if (o.kind === 'gates' && world.gates.length) {
          const g = world.gates[world.nextGate];
          if (g) return set(g.x, g.y, g.r * 0.5);
        }
        if (o.kind === 'scan' && o.target) {
          const ship = scene.getShip();
          const prefix = o.target.endsWith(':');
          let best: FBody | null = null;
          let bd = Infinity;
          for (let i = 0; i < world.bodies.length; i++) {
            const b = world.bodies[i];
            const hit = prefix ? b.id.startsWith(o.target) : b.id === o.target;
            if (!hit || cacheSeen.includes(b.id)) continue;
            const d = (b.x - ship.x) ** 2 + (b.y - ship.y) ** 2;
            if (d < bd) {
              bd = d;
              best = b;
            }
          }
          if (best) return best;
        }
        if (o.kind === 'haul') return nearestAlive(scene, world.hauls, 20) ?? cacheBody ?? cacheFallback;
        if (o.kind === 'glimmer') return nearestAlive(scene, world.glimmers, 20) ?? cacheBody ?? cacheFallback;
        if (o.kind === 'fuel') return nearestAlive(scene, world.fuels, 20) ?? cacheFallback;
        if (o.kind === 'coins') return nearestAlive(scene, world.coins, 14) ?? cacheFallback;
        if (cacheBody) return cacheBody;
      }
      return cacheFallback;
    },
    canScan: (id) => {
      for (const def of S.missions.active()) {
        const o = S.missions.objective(def.id);
        if (o?.kind === 'scan' && o.target && (o.target.endsWith(':') ? id.startsWith(o.target) : id === o.target)) return !S.missions.progress(def.id)!.seen.includes(id);
      }
      const body = BODY_BY_ID[id];
      return !!body && !body.landable && !S.state.data.codex.includes(id);
    },
    onStart: (scene) => {
      const lbl = objectiveLabel();
      scene.setObjective(lbl?.text ?? `Explore ${SYSTEM_BY_ID[p.to].name}!`, lbl?.icon ?? 'rocket');
    },
    update: (scene, dt) => {
      hintTick(dt);
      hudT -= dt;
      if (hudT > 0) return;
      hudT = 0.25;
      if (scene.isRacing()) return;
      const lbl = objectiveLabel();
      scene.setObjective(lbl?.text ?? `Explore ${SYSTEM_BY_ID[p.to].name}!`, lbl?.icon ?? 'rocket');
    },
    onScan: () => {},
    onLand: (_scene, bodyId) => {
      void S.game.go('landing', { body: bodyId });
    },
    onCourseDone: (scene, seconds) => {
      const course = extras.course;
      if (!course) return;
      scene.celebrate();
      sfx('fanfare');
      raceHooks.finished(scene, course, seconds);
    },
    onTowedHome: () => {
      S.state.data.location = 'earth';
      void S.game.go('hub');
    },
  };
}

/** Race results are handled by the race system (phase 7) — default: training rings. */
export const raceHooks = {
  finished: (scene: FlightScene, course: string, _seconds: number) => {
    S.state.emit({ type: 'gates', course });
    scene.floatText('All rings done!', '#8cff66');
  },
};

// ------------------------------------------------------------------ install

export function installDirectors(): void {
  directorFactory.make = (p) => missionFlightDirector(p);

  exploreHooks.objective = () => objectiveLabel();
  exploreHooks.onEnter = () => {
    const cur = S.missions.currentObjective();
    if (cur?.obj.hint && S.state.difficulty === 'easy') setTimeout(() => toast(cur.obj.hint!, 'question', 4200), 2500);
  };
  let hintT = 0;
  exploreHooks.update = (scene, dt) => {
    hintTick(dt);
    hintT += dt;
    if (hintT > 0.3) {
      hintT = 0;
      scene.updateObjective();
    }
  };
  exploreHooks.onLeave = () => {
    void S.game.go('map');
  };

  mapHooks.targetSystem = () => {
    const w = currentWhere();
    if (!w) return null;
    if (w.system) return w.system as SystemId;
    if (w.place) return 'earth';
    return null;
  };
  mapHooks.isUnlocked = (sys: SystemDef, chapter: number) => {
    if (sys.chapter > chapter) return false;
    if (sys.id === 'wormhole') return S.state.flag('wormholeFound');
    if (sys.id === 'zephyra') return S.state.flag('wormholeDone');
    return true;
  };

  landingHooks.onDone = (body) => {
    const st = S.state;
    st.data.location = body;
    st.addUnique(st.data.visitedBodies, body);
    if (body === 'earth') {
      st.emit({ type: 'home' });
      void S.game.go('hub');
      return;
    }
    const areas = openAreas(body);
    const w = currentWhere();
    if (w?.area && areas.includes(w.area)) {
      void S.game.go('explore', { area: w.area });
      return;
    }
    if (areas.length <= 1) {
      void S.game.go(areas.length ? 'explore' : 'map', areas.length ? { area: areas[0] } : {});
      return;
    }
    chooseArea(body, areas);
  };
}

/** Pick where to explore on a world with several areas (Mars, Zephyra). */
export function chooseArea(body: string, areas: string[]): void {
  const w = currentWhere();
  const list = h('div', { class: 'col area-list' });
  for (const a of areas) {
    const lvl = levelById(a);
    const rec = w?.area === a;
    list.append(button(`${lvl?.name ?? a}${rec ? '  (Mission!)' : ''}`, rec ? 'flag' : 'planet', () => {
      closeTopModal();
      void S.game.go('explore', { area: a });
    }, { color: rec ? 'green' : 'white', id: `area-${a}` }));
  }
  const panel = h('div', { class: 'panel col center', 'data-testid': 'area-picker' }, h('div', { class: 'h2' }, `Where to on ${BODY_BY_ID[body]?.name}?`), list);
  openModal(panel, { dismissable: false });
}
