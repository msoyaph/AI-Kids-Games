import { BODY_BY_ID, bodyForArea, SYSTEM_BY_ID, type SystemId } from '../data/bodies';
import { dialogue } from '../data/dialogue';
import { LEVELS } from '../data/levels';
import { MISSIONS } from '../data/missions';
import type { MissionDef, ObjectiveDef } from '../data/missionTypes';
import type { Difficulty } from '../data/types';
import { parseLevel } from './level';
import { routeLength } from './flightWorld';

/**
 * Pacing model: estimates how long each chapter takes a young player, so content can be tuned
 * to the 5-6 hour target. It walks through every mission in order, tracking where the player
 * is, and adds up flight, landing, exploration, puzzle, dialogue and menu time.
 *
 * The numbers are assumptions about a 6-7 year old (Easy) and an 8-10 year old (Normal),
 * based on how kids typically play: they wander, collect extra coins, re-read signs, and
 * sometimes get a little lost. They are deliberately written down here so they can be changed.
 */
export interface PacingAssumptions {
  /** Average speed along a trip including wandering and coin detours (units/s). */
  cruise: number;
  /** Time to fly around inside one planet system to reach a target (s). */
  inSystem: number;
  /** Landing minigame, including retries (s). */
  landing: number;
  /** Exploration: seconds per level column the first time through (walking, jumping, looking around). */
  perColumn: number;
  /** Extra seconds per puzzle (crate, machine, crystals). */
  puzzle: number;
  /** Reading speed for dialogue in words per minute (read-aloud helps on Easy). */
  wpm: number;
  /** Menus, hub, Star Map choices per mission (s). */
  menus: number;
  /** Extra play per chapter: hangar shopping, codex, stickers, dailies, just flying around (s). */
  freePlay: number;
  /** Retry / getting-lost multiplier on mission time. */
  lost: number;
  scan: number;
  gates: number;
  race: number;
  haul: number;
  /** Matches DiffTuning.routeScale. */
  routeScale: number;
  /** 3D: launch-and-warp cinematic on the Star Map before each trip (s, skippable). */
  warp: number;
  /** 3D: camera swoop from orbit down to the landing pad (s). */
  swoop: number;
}

export const ASSUMPTIONS: Record<Difficulty, PacingAssumptions> = {
  // Easy: autopilot landings, auto-scan and steering help make flying quicker; kids still wander.
  easy: { cruise: 240, inSystem: 70, landing: 28, perColumn: 1.3, puzzle: 100, wpm: 70, menus: 55, freePlay: 900, lost: 1.2, scan: 12, gates: 100, race: 140, haul: 110, routeScale: 0.85, warp: 3, swoop: 2.5 },
  normal: { cruise: 290, inSystem: 55, landing: 55, perColumn: 1.05, puzzle: 80, wpm: 110, menus: 50, freePlay: 780, lost: 1.12, scan: 18, gates: 80, race: 120, haul: 90, routeScale: 1, warp: 3, swoop: 2.5 },
};

export interface ChapterPace {
  chapter: number;
  mainMin: number;
  sideMin: number;
  freeMin: number;
  totalMin: number;
}

interface Where {
  system: SystemId;
  area: string | null;
}

function words(id: string): number {
  return dialogue(id).reduce((n, l) => n + l.text.split(/\s+/).length, 0);
}

function puzzlesIn(area: string): number {
  const def = LEVELS[area];
  if (!def) return 0;
  const m = parseLevel(def);
  const plates = m.ents.filter((e) => e.kind === 'plate').length;
  const machines = m.ents.filter((e) => e.kind === 'machine').length;
  const groups = Object.keys(def.groups ?? {}).length;
  return plates + machines + groups;
}

function columns(area: string): number {
  const def = LEVELS[area];
  if (!def) return 0;
  const tall = def.map.length > 15 ? def.map.length / 15 : 1;
  return def.map[0].length * tall;
}

/** Estimate seconds for one mission, updating where the player ends up. */
function missionSeconds(m: MissionDef, a: PacingAssumptions, at: Where, exploredAreas: Set<string>): number {
  let t = a.menus + (words(m.briefing) + words(m.done)) / (a.wpm / 60);
  const travelTo = (sys: SystemId) => {
    if (sys === at.system) {
      t += a.inSystem;
      return;
    }
    t += routeLength(at.system, sys, a.routeScale) / a.cruise + a.inSystem * 0.6 + a.warp;
    at.system = sys;
    at.area = null;
  };
  const visitArea = (area: string) => {
    if (at.area === area) return;
    const body = bodyForArea(area);
    if (body) travelTo(body.system as SystemId);
    t += a.landing + a.swoop;
    const first = !exploredAreas.has(area);
    exploredAreas.add(area);
    // First visits: explore most of the level; later visits: go straight to the goal.
    t += columns(area) * a.perColumn * (first ? 1 : 0.45) + (first ? puzzlesIn(area) * a.puzzle : 0);
    at.area = area;
  };
  for (const o of m.objectives as ObjectiveDef[]) {
    if (o.onStart) t += words(o.onStart) / (a.wpm / 60);
    if (o.onDone) t += words(o.onDone) / (a.wpm / 60);
    const area = o.where?.area ?? o.area;
    const body = o.where?.body ?? o.body;
    const sys = (o.where?.system ?? (body ? BODY_BY_ID[body]?.system : undefined) ?? o.system) as SystemId | undefined;
    switch (o.kind) {
      case 'visit':
        t += 20;
        break;
      case 'talk':
        if (area && area !== 'lounge') visitArea(area);
        else if (area === 'lounge' && at.system !== 'earth') {
          travelTo('earth');
          t += a.landing + a.swoop;
          at.area = null;
        }
        t += 15;
        break;
      case 'arrive':
      case 'near':
        if (sys) travelTo(sys);
        at.area = null;
        break;
      case 'land':
        if (sys) travelTo(sys);
        t += a.landing + a.swoop;
        if (body && BODY_BY_ID[body]?.areas?.[0]) visitArea(BODY_BY_ID[body].areas![0]);
        break;
      case 'home':
        travelTo('earth');
        t += a.landing + a.swoop;
        at.area = null;
        break;
      case 'collect':
      case 'reach':
      case 'solve':
      case 'enterArea':
        if (area) visitArea(area);
        break;
      case 'scan':
        if (sys) travelTo(sys);
        t += a.scan * (o.count ?? 1);
        break;
      case 'gates':
        if (sys) travelTo(sys);
        t += a.gates;
        break;
      case 'race':
        t += a.race;
        break;
      case 'haul':
      case 'glimmer':
        if (sys) travelTo(sys);
        t += a.haul;
        break;
      case 'deliver':
        if (sys) travelTo(sys);
        t += a.landing + a.swoop;
        break;
      case 'coins':
        t += ((o.count ?? 10) / 25) * 60;
        break;
      case 'fuel':
      case 'boost':
      case 'slingshot':
        t += 30 * (o.count ?? 1);
        break;
      case 'equip':
        t += 30;
        break;
    }
  }
  return t * a.lost;
}

/** Estimated minutes per chapter for a difficulty. */
export function simulatePacing(diff: Difficulty, includeSides = true): ChapterPace[] {
  const a = ASSUMPTIONS[diff];
  const at: Where = { system: 'earth', area: null };
  const explored = new Set<string>();
  const out: ChapterPace[] = [];
  for (let ch = 1; ch <= 5; ch++) {
    let main = 0;
    let side = 0;
    for (const m of MISSIONS.filter((x) => x.chapter === ch && x.kind === 'main')) main += missionSeconds(m, a, at, explored);
    if (includeSides) for (const m of MISSIONS.filter((x) => x.chapter === ch && x.kind === 'side')) side += missionSeconds(m, a, at, explored);
    const free = a.freePlay * (ch === 5 ? 0.7 : 1);
    out.push({ chapter: ch, mainMin: main / 60, sideMin: side / 60, freeMin: free / 60, totalMin: (main + side + free) / 60 });
  }
  void SYSTEM_BY_ID;
  return out;
}

export function totalHours(p: ChapterPace[]): number {
  return p.reduce((s, c) => s + c.totalMin, 0) / 60;
}
