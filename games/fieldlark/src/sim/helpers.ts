/**
 * Farmhands: volunteers from Larkford who take on a job. Each one works through their job one task at
 * a time: they pick the nearest thing that needs doing, walk over (the task takes a few seconds of
 * play), and do it through the same actions the player uses (src/sim/actions.ts).
 *
 * - Watering: growing crops that need water, in their patch of land.
 * - Harvesting: ready crops and ripe fruit trees, in their patch (to the barn).
 * - Animals: their chosen homes: collect what's ready, feed from the barn, brush.
 * - Workshop: one workshop and one recipe: keep its queue filled while ingredients last, and collect.
 * - Deliveries: send wanted contract baskets and board orders the barn can fill (not story requests:
 *   those are yours to send), and top up the farm stand's shelves.
 *
 * Skills grow with practice (levels at 20, 60, 140 and 300 tasks of a job), and a skilled farmhand
 * works faster: a task every 6 seconds at level 1, every 3 at level 5. There are no wages, no
 * tiredness and no mistakes; a farmhand with nothing to do rests by the cottage.
 *
 * Hiring costs nothing: the first farmhand comes in chapter 3, then one more at farm level 9, at the
 * end of chapter 6 and at level 16, and two more from the Farm Lab. Six at most.
 */
import { animalForHome } from '../data/animals';
import { HELPER_NAMES } from '../data/cast';
import { MACHINE, RECIPE } from '../data/production';
import { act, type Action } from './actions';
import { animalsIn, feedFor, isHome, isReady } from './animals';
import { fieldState } from './fields';
import { roomLeft } from './inventory';
import { areaAt, type AreaId } from './map';
import type { Obj, OtherObj } from './objects';
import { canFill } from './orders';
import { canSendDrop } from './contracts';
import { restockTask } from './stand';
import { cantStart, isMachine, machineState, slotsOf } from './production';
import type { Farm } from './state';
import { isTree, treeRipe } from './trees';
import { bump, levelOf, objById } from './world';

export const JOBS = ['water', 'harvest', 'animals', 'workshop', 'deliver'] as const;
export type Job = (typeof JOBS)[number];
export const JOB_NAME: Record<Job | 'rest', string> = {
  water: 'Watering', harvest: 'Harvesting', animals: 'Animals', workshop: 'Workshop', deliver: 'Deliveries', rest: 'Resting',
};
/** What someone good at each job is called ("Fen is now a level 2 waterer!"). */
export const JOB_WORKER: Record<Job, string> = { water: 'waterer', harvest: 'picker', animals: 'animal carer', workshop: 'maker', deliver: 'delivery helper' };

export interface Task { action: Action; x: number; z: number }

export interface Helper {
  name: string;
  job: Job | 'rest';
  /** Watering and harvesting: one open area, or everywhere. */
  zone: AreaId | 'all';
  /** Animals: the homes they look after (object ids). */
  homes: number[];
  /** Workshop: the building and the recipe. */
  machine: number | null;
  recipe: string | null;
  /** Tasks done in each job (skill grows with these). */
  done: Record<Job, number>;
  /** What they're doing now and when it's done (null: resting, look again at `nextAt`). */
  task: Task | null;
  nextAt: number;
  /** Where they last worked (they choose the nearest next task). */
  x: number;
  z: number;
}

export const MAX_HELPERS = 6;
export const SKILL_AT = [20, 60, 140, 300] as const;
/** Seconds of play per task at skill levels 1–5. */
export const PACE = [6, 5.25, 4.5, 3.75, 3] as const;
const REST_LOOK = 2;

export function skillLevel(done: number): number {
  let level = 1;
  for (const n of SKILL_AT) if (done >= n) level++;
  return level;
}

/** How many farmhands the farm can have now. */
export function helperSlots(farm: Farm): number {
  const level = levelOf(farm), ch = farm.story.chapter;
  const n = (ch >= 2 ? 1 : 0) + (level >= 9 ? 1 : 0) + (ch >= 6 ? 1 : 0) + (level >= 16 ? 1 : 0) + (farm.flags['lab:helpers1'] ? 1 : 0) + (farm.flags['lab:helpers2'] ? 1 : 0);
  return Math.min(MAX_HELPERS, n);
}

/** When the next farmhand can come (for the panel), or null if all six are here. */
export function nextHelperHint(farm: Farm): string | null {
  if (farm.helpers.length >= MAX_HELPERS) return null;
  if (farm.story.chapter < 2) return 'Your first farmhand comes in chapter 3.';
  const level = levelOf(farm);
  if (level < 9) return 'Another farmhand comes at farm level 9.';
  if (farm.story.chapter < 6) return 'Another farmhand comes after chapter 6.';
  if (level < 16) return 'Another farmhand comes at farm level 16.';
  return 'More farmhands can come through the Farm Lab.';
}

export function hire(farm: Farm, cottage: { x: number; z: number }): Helper | null {
  if (farm.helpers.length >= helperSlots(farm)) return null;
  const name = HELPER_NAMES[farm.helpers.length]!;
  const h: Helper = { name, job: 'rest', zone: 'all', homes: [], machine: null, recipe: null, done: { water: 0, harvest: 0, animals: 0, workshop: 0, deliver: 0 }, task: null, nextAt: farm.t, x: cottage.x, z: cottage.z };
  farm.helpers.push(h);
  bump(farm, 'hired');
  return h;
}

/** Give a farmhand a job (and its settings). */
export function assign(farm: Farm, i: number, job: Job | 'rest', opts: { zone?: AreaId | 'all'; homes?: number[]; machine?: number | null; recipe?: string | null } = {}): boolean {
  const h = farm.helpers[i];
  if (!h) return false;
  h.job = job;
  if (opts.zone !== undefined) h.zone = opts.zone;
  if (opts.homes !== undefined) h.homes = [...opts.homes];
  if (opts.machine !== undefined) h.machine = opts.machine;
  if (opts.recipe !== undefined) h.recipe = opts.recipe;
  h.task = null;
  h.nextAt = farm.t;
  return true;
}

const inZone = (farm: Farm, h: Helper, x: number, z: number) => {
  const a = areaAt(x, z);
  return !!a && farm.unlocked.includes(a) && (h.zone === 'all' || h.zone === a);
};

const nearest = <T extends { x: number; z: number }>(h: Helper, list: T[]): T | undefined =>
  list.reduce<T | undefined>((best, o) => (!best || Math.hypot(o.x - h.x, o.z - h.z) < Math.hypot(best.x - h.x, best.z - h.z) ? o : best), undefined);

/** The next thing this farmhand could do, or null. */
export function findTask(farm: Farm, h: Helper): Task | null {
  switch (h.job) {
    case 'water': {
      const f = nearest(h, farm.objects.filter(o => o.kind === 'field' && !o.watered && fieldState(farm, o) === 'growing' && inZone(farm, h, o.x, o.z)));
      return f ? { action: { type: 'water', x: f.x, z: f.z }, x: f.x, z: f.z } : null;
    }
    case 'harvest': {
      if (roomLeft(farm) < 6) return null;
      const ready = farm.objects.filter(o => inZone(farm, h, o.x, o.z) && ((o.kind === 'field' && fieldState(farm, o) === 'ready') || (isTree(o) && treeRipe(farm, o))));
      const o = nearest(h, ready);
      if (!o) return null;
      return { action: o.kind === 'field' ? { type: 'harvest', x: o.x, z: o.z } : { type: 'pickTree', id: o.id }, x: o.x, z: o.z };
    }
    case 'animals': {
      const homes = h.homes.map(id => objById(farm, id)).filter((o): o is Obj => !!o && isHome(o)) as OtherObj[];
      for (const home of [...homes].sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))) {
        const list = animalsIn(home);
        if (!list.length) continue;
        if (list.some(a => isReady(farm, a)) && roomLeft(farm) >= list.length) return { action: { type: 'collect', home: home.id }, x: home.x, z: home.z };
        const kind = animalForHome(home.def);
        if (kind && kind.id !== 'bee' && kind.id !== 'dog') {
          if (list.some(a => !a.fed && !isReady(farm, a)) && feedFor(farm, kind.id)) return { action: { type: 'feed', home: home.id }, x: home.x, z: home.z };
          if (list.some(a => !a.brushed && !isReady(farm, a))) return { action: { type: 'brush', home: home.id }, x: home.x, z: home.z };
        }
      }
      return null;
    }
    case 'workshop': {
      const m = h.machine !== null ? objById(farm, h.machine) : undefined;
      if (!m || !isMachine(m)) return null;
      const s = machineState(m);
      if (s.shelf.length && roomLeft(farm) >= s.shelf.length) return { action: { type: 'collectGoods', machine: m.id }, x: m.x, z: m.z };
      const rec = h.recipe ? RECIPE[h.recipe] : undefined;
      if (rec && s.queue.length < slotsOf(m) && !cantStart(farm, m, rec)) return { action: { type: 'make', machine: m.id, recipe: rec.id }, x: m.x, z: m.z };
      return null;
    }
    case 'deliver': {
      const dock = farm.objects.find(x => x.def === 'dock');
      if (!dock) return null;
      const c = farm.contracts.find(x => canSendDrop(farm, x));
      if (c) return { action: { type: 'sendDrop', business: c.business }, x: dock.x, z: dock.z };
      const o = farm.orders.find(x => !x.story && canFill(farm, x));
      if (o) return { action: { type: 'deliver', order: o.id }, x: dock.x, z: dock.z };
      const slot = restockTask(farm);
      // the stand is in town, down the river: they set off from the dock
      return slot !== null ? { action: { type: 'restock', slot }, x: dock.x, z: dock.z } : null;
    }
    case 'rest': return null;
  }
}

export type HelperEvent = { type: 'helper-skill'; name: string; job: Job; level: number } | { type: 'helper-found'; name: string; variety: string };

/** Let every farmhand work up to the farm's clock. */
export function helpersTick(farm: Farm): HelperEvent[] {
  const out: HelperEvent[] = [];
  for (const h of farm.helpers) {
    // a long step (fast-forward, or a slow frame) can fit several tasks
    for (let guard = 0; guard < 8 && farm.t >= h.nextAt; guard++) {
      if (h.task) {
        const r = act(farm, h.task.action);
        h.x = h.task.x; h.z = h.task.z;
        const job = h.job;
        h.task = null;
        if (r.ok && job !== 'rest') {
          const before = skillLevel(h.done[job]);
          h.done[job] += farm.flags['lab:skills'] ? 2 : 1;
          bump(farm, `helper:${job === 'deliver' ? 'deliveries' : job}`);
          const after = skillLevel(h.done[job]);
          if (after > before) out.push({ type: 'helper-skill', name: h.name, job, level: after });
          if (typeof r.discovered === 'string') out.push({ type: 'helper-found', name: h.name, variety: r.discovered });
        }
      }
      const next = findTask(farm, h);
      if (next && h.job !== 'rest') {
        h.task = next;
        h.nextAt += PACE[skillLevel(h.done[h.job]) - 1]!;
      } else {
        h.nextAt = Math.max(h.nextAt, farm.t) + REST_LOOK;
      }
      // never fall far behind the clock (after a pause, start fresh)
      if (h.nextAt < farm.t - 30) h.nextAt = farm.t;
    }
  }
  return out;
}

/** A workshop's recipes a farmhand could keep making (for the panel). */
export const recipesFor = (farm: Farm, m: OtherObj) => Object.values(RECIPE).filter(r => r.machine === m.def && r.level <= levelOf(farm) && !!MACHINE[m.def]);
