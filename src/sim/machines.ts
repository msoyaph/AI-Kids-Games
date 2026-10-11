/** Machines process goods over game time (also overnight) and show progress. */
import { MACHINE, MACHINES, type MachineRule } from '../data/machines';
import { tryItem } from '../data/items';
import { TUNING } from '../tuning';
import { PLAYER_SPACES, interactHooks } from './actions';
import { count, remove } from './inventory';
import { gainXp } from './skills';
import type { Sim } from './sim';
import { seasonOf } from './state';
import { registerSystem } from './systems';
import type { ItemStack, WorldObject } from './types';
import type { Loc } from './world';

export function machineRule(id: string, input: ItemStack): MachineRule | null {
  const m = MACHINE[id];
  if (!m?.rule) return null;
  return m.rule(input);
}

/** Bag items this machine can take. */
export function machineInputs(sim: Sim, id: string): { slot: number; rule: MachineRule }[] {
  const out: { slot: number; rule: MachineRule }[] = [];
  sim.p.inv.forEach((s, i) => {
    if (!s) return;
    const r = machineRule(id, s);
    if (!r) return;
    if (count(sim.p.inv, s.id) < (r.use ?? 1)) return;
    if (r.extra && r.extra.some(([e, n]) => count(sim.p.inv, e) < n)) return;
    out.push({ slot: i, rule: r });
  });
  return out;
}

export function loadMachine(sim: Sim, o: WorldObject, slot: number): { ok: boolean; msg?: string } {
  const s = sim.p.inv[slot];
  if (!s || o.inp || o.out) return { ok: false };
  const r = machineRule(o.id, s);
  if (!r) return { ok: false, msg: `The ${MACHINE[o.id].name} can't use that.` };
  const use = r.use ?? 1;
  if (count(sim.p.inv, s.id) < use) return { ok: false, msg: `You need ${use} ${tryItem(s.id)?.name}.` };
  for (const [e, n] of r.extra ?? []) if (count(sim.p.inv, e) < n) return { ok: false, msg: `You also need ${n} ${tryItem(e)?.name}.` };
  remove(sim.p.inv, s.id, use);
  for (const [e, n] of r.extra ?? []) remove(sim.p.inv, e, n);
  o.inp = s.id;
  o.t = r.minutes;
  o.out = null;
  // the pending output is computed again when done (keeps saves small)
  o.q = r.out.q;
  return { ok: true };
}

export function collect(sim: Sim, loc: Loc, x: number, y: number, o: WorldObject): ItemStack | null {
  if (!o.out) return null;
  const out = o.out;
  sim.give(out.id, out.n, out.q);
  gainXp(sim, 'cooking', 4);
  o.out = null;
  o.inp = undefined;
  o.t = undefined;
  loc.touch(x, y);
  return out;
}

function finish(o: WorldObject): void {
  const m = MACHINE[o.id];
  if (!m) return;
  if (m.auto) {
    o.out = { id: m.auto.out, n: 1, q: 0 };
  } else if (o.inp) {
    const r = m.rule!({ id: o.inp, n: 99, q: o.q ?? 0 });
    if (r) o.out = { ...r.out };
  }
  o.t = 0;
}

/** Advance every machine in player spaces by `minutes`. */
export function advanceMachines(sim: Sim, minutes: number): void {
  const season = seasonOf(sim.state.day);
  for (const id of PLAYER_SPACES) {
    if (!sim.hasLoc(id) || (!sim.world.has(id) && !sim.pendingLocs()[id])) continue;
    const loc = sim.loc(id);
    for (const [i, o] of loc.objs) {
      if (o.k !== 'machine' && o.k !== 'beehouse') continue;
      const m = MACHINE[o.id];
      if (!m) continue;
      if (o.out) continue;
      if (m.auto) {
        if (!m.auto.seasons.includes(season)) continue;
        if (o.t === undefined) o.t = m.auto.minutes;
      } else if (!o.inp) continue;
      o.t = (o.t ?? 0) - minutes;
      if (o.t <= 0) {
        finish(o);
        loc.touch(i % loc.w, Math.floor(i / loc.w));
      }
    }
  }
}

export function minutesLeft(o: WorldObject): number {
  return Math.max(0, o.t ?? 0);
}

interactHooks.push((sim, x, y) => {
  const loc = sim.here;
  const a = loc.objAnchor(x, y);
  if (!a) return null;
  const o = a.o;
  if (o.k !== 'machine' && o.k !== 'beehouse') return null;
  if (o.out) {
    collect(sim, loc, x, y, o);
    return { type: 'collect', ok: true };
  }
  return { type: 'object', o, x, y };
});

registerSystem({
  id: 'machines',
  tick(sim) {
    advanceMachines(sim, 10);
  },
  endDay(sim) {
    // machines keep working overnight until 6:00
    const left = 24 * 60 + TUNING.dayStartMin - sim.state.min;
    advanceMachines(sim, Math.max(0, left));
  },
});

export const ALL_MACHINES = MACHINES;
