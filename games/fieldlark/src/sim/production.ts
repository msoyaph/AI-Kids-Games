/**
 * Production buildings at work. Starting a job takes its ingredients from the barn at once (best
 * stars first, so good ingredients make good goods) and puts the job in the building's queue. The
 * building works on the first job, then the next; finished goods wait on its shelf until you collect
 * them, and never spoil. Upgrades add queue slots and work faster.
 */
import { MACHINE, RECIPE, type RecipeDef } from '../data/production';
import { add, count, roomLeft, type Stars } from './inventory';
import type { Obj, OtherObj } from './objects';
import type { Farm } from './state';
import { bump, ledgerNow, levelOf, spend } from './world';

export interface Job { recipe: string; stars: Stars; minutes: number; startedAt: number | null; endsAt: number | null }
export interface MachineState { level: 1 | 2 | 3; queue: Job[]; shelf: { recipe: string; stars: Stars }[] }

export type MachineObj = OtherObj & { kind: 'building' };
export const isMachine = (o: Obj): o is MachineObj => o.kind === 'building' && !!MACHINE[o.def];

export function machineState(o: OtherObj): MachineState {
  const d = (o.data ??= {});
  if (d.level !== 2 && d.level !== 3) d.level = 1;
  if (!Array.isArray(d.queue)) d.queue = [];
  if (!Array.isArray(d.shelf)) d.shelf = [];
  return d as unknown as MachineState;
}

export const slotsOf = (o: OtherObj) => MACHINE[o.def]!.slots[machineState(o).level - 1]!;
export const speedOf = (o: OtherObj) => MACHINE[o.def]!.speed[machineState(o).level - 1]!;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; why: string };

/** Why a recipe can't start right now (or null if it can). */
export function cantStart(farm: Farm, o: OtherObj, rec: RecipeDef): string | null {
  const s = machineState(o);
  if (rec.machine !== o.def) return 'That isn’t made here.';
  if (levelOf(farm) < rec.level) return `${rec.name} comes at farm level ${rec.level}.`;
  if (s.queue.length >= slotsOf(o)) return 'The queue is full. Upgrade for more slots!';
  const missing = Object.entries(rec.inputs).filter(([id, n]) => count(farm, id) < n);
  if (missing.length) return 'Missing ingredients.';
  return null;
}

/** Takes `n` of an item, best stars first, and returns the stars of each one taken. */
function takeBest(farm: Farm, id: string, n: number): Stars[] {
  const s = farm.inv[id]!;
  const out: Stars[] = [];
  for (let st = 3; st >= 1 && out.length < n; st--) {
    while (s[st - 1]! > 0 && out.length < n) { s[st - 1]!--; out.push(st as Stars); }
  }
  if (s[0] + s[1] + s[2] === 0) delete farm.inv[id];
  return out;
}

export function startJob(farm: Farm, o: OtherObj, recipeId: string): Result<{ stars: Stars }> {
  const rec = RECIPE[recipeId];
  if (!rec) return { ok: false, why: 'Unknown recipe.' };
  const why = cantStart(farm, o, rec);
  if (why) return { ok: false, why };
  const stars: Stars[] = [];
  for (const [id, n] of Object.entries(rec.inputs)) stars.push(...takeBest(farm, id, n));
  const avg = stars.reduce((a, b) => a + b, 0) / stars.length;
  const st = Math.min(3, Math.max(1, Math.round(avg - 0.01))) as Stars;
  const s = machineState(o);
  const job: Job = { recipe: rec.id, stars: st, minutes: rec.minutes * speedOf(o), startedAt: null, endsAt: null };
  s.queue.push(job);
  runQueue(o, farm.t);
  return { ok: true, stars: st };
}

/** Starts the first waiting job if nothing is running (from `from`, when the last one finished). */
function runQueue(o: OtherObj, from: number) {
  const head = machineState(o).queue[0];
  if (head && head.startedAt === null) {
    head.startedAt = from;
    head.endsAt = from + head.minutes * 60;
  }
}

/** Moves finished jobs to the shelf as time passes. Returns how many finished. */
export function workMachines(farm: Farm): number {
  let done = 0;
  for (const o of farm.objects) {
    if (!isMachine(o)) continue;
    const s = machineState(o);
    for (let guard = 0; guard < 16; guard++) {
      const head = s.queue[0];
      if (!head || head.endsAt === null || farm.t < head.endsAt) break;
      s.queue.shift();
      s.shelf.push({ recipe: head.recipe, stars: head.stars });
      done++;
      runQueue(o, head.endsAt);
    }
  }
  return done;
}

/** Take finished goods off the shelf into the barn. */
export function collectGoods(farm: Farm, o: OtherObj): Result<{ got: { recipe: string; stars: Stars }[] }> {
  const s = machineState(o);
  if (!s.shelf.length) return { ok: false, why: 'Nothing is finished yet.' };
  const got: { recipe: string; stars: Stars }[] = [];
  while (s.shelf.length && roomLeft(farm) > 0) {
    const g = s.shelf.shift()!;
    add(farm, g.recipe, g.stars, 1);
    farm.xp += Math.max(2, Math.round(RECIPE[g.recipe]!.minutes * 2));
    const page = ledgerNow(farm);
    page.made[g.recipe] = (page.made[g.recipe] ?? 0) + 1;
    bump(farm, 'made');
    bump(farm, `made:${g.recipe}`);
    if (g.stars === 3) bump(farm, 'stars3');
    got.push(g);
  }
  if (!got.length) return { ok: false, why: 'The barn is full! Sell or use some things to make room.' };
  return { ok: true, got };
}

export function upgradeMachine(farm: Farm, o: OtherObj): Result<{ level: number }> {
  const def = MACHINE[o.def];
  const s = machineState(o);
  if (!def) return { ok: false, why: 'Not a workshop.' };
  if (s.level >= 3) return { ok: false, why: `The ${def.name} is as good as it gets!` };
  const cost = def.upgrade[s.level - 1]!;
  if (!spend(farm, cost)) return { ok: false, why: `The upgrade costs ${cost} coins.` };
  s.level = (s.level + 1) as 2 | 3;
  return { ok: true, level: s.level };
}

/** For "while you were away": the running job finishes sooner (never later). */
export function machinesCatchUp(farm: Farm, seconds: number) {
  for (const o of farm.objects) {
    if (!isMachine(o)) continue;
    const head = machineState(o).queue[0];
    if (head?.endsAt != null && head.endsAt > farm.t) head.endsAt = Math.max(farm.t, head.endsAt - seconds);
  }
  workMachines(farm);
}

/** Seconds until the running job is done (or null). */
export function jobLeft(farm: Farm, o: OtherObj): number | null {
  const head = machineState(o).queue[0];
  return head?.endsAt != null ? Math.max(0, head.endsAt - farm.t) : null;
}
