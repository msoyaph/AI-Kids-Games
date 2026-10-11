import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { BODY_BY_ID, bodyForArea, SYSTEM_BY_ID, type SystemDef, type SystemId } from '../data/bodies';
import { levelById } from '../data/levels';
import type { ObjectiveDef, Where } from '../data/missionTypes';
import { STICKERS } from '../data/stickers';
import { condOk } from '../systems/level';
import type { FlightExtras } from '../systems/flightWorld';
import { h } from '../ui/dom';
import { closeTopModal, openModal } from '../ui/modal';
import { toast } from '../ui/toast';
import { button } from '../ui/widgets';
import { exploreHooks } from './exploreHooks';
import { directorFactory, findBody, type FlightDirector, type FlightTarget } from './flightDirector';
import type { FlightScene, FlightSceneParams } from './FlightScene';
import { landingHooks } from './landingHooks';
import { mapHooks } from './mapHooks';

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

  const nearest = <T extends { x: number; y: number }>(scene: FlightScene, list: T[], ok: (t: T) => boolean): T | null => {
    const ship = scene.getShip();
    let best: T | null = null;
    let bd = Infinity;
    for (const it of list) {
      if (!ok(it)) continue;
      const d = Math.hypot(it.x - ship.x, it.y - ship.y);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  };

  return {
    extras: () => extras,
    target: (scene): FlightTarget | null => {
      const world = scene.getLayout().world;
      if (scene.isRacing()) {
        const g = world.gates[world.nextGate];
        return g ? { x: g.x, y: g.y, r: g.r * 0.5 } : null;
      }
      const cur = S.missions.currentObjective();
      if (cur) {
        const o = cur.obj;
        if (o.kind === 'gates' && world.gates.length) {
          const g = world.gates[world.nextGate];
          if (g) return { x: g.x, y: g.y, r: g.r * 0.5 };
        }
        if (o.kind === 'scan' && o.target) {
          const t = nearest(scene, world.bodies, (b) => (o.target!.endsWith(':') ? b.id.startsWith(o.target!) : b.id === o.target) && !cur.prog.seen.includes(b.id));
          if (t) return t;
        }
        if (o.kind === 'haul') {
          const t = nearest(scene, world.hauls, (q) => q.alive);
          if (t) return { x: t.x, y: t.y, r: 20 };
        }
        if (o.kind === 'glimmer') {
          const t = nearest(scene, world.glimmers, (q) => q.alive);
          if (t) return { x: t.x, y: t.y, r: 20 };
        }
        if (o.kind === 'fuel') {
          const t = nearest(scene, world.fuels, (q) => q.alive);
          if (t) return { x: t.x, y: t.y, r: 20 };
        }
        if (o.kind === 'coins') {
          const t = nearest(scene, world.coins, (q) => q.alive);
          if (t) return { x: t.x, y: t.y, r: 14 };
        }
        const w = whereOf(o);
        if (w.body) {
          const b = findBody(scene, w.body);
          if (b) return b;
        }
        if (w.system && routeSystems.has(w.system)) {
          const b = findBody(scene, SYSTEM_BY_ID[w.system as SystemId].main);
          if (b) return b;
        }
        if (w.place || cur.obj.kind === 'home' || cur.obj.kind === 'talk') {
          const e = findBody(scene, 'earth');
          if (e) return e;
        }
      }
      return findBody(scene, SYSTEM_BY_ID[p.to].main);
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
