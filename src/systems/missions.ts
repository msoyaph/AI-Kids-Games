import type { MissionDef, ObjectiveDef } from '../data/missionTypes';
import type { Medal } from '../data/races';
import { grant } from './economy';
import type { GameEvent } from './events';
import type { MissionProgress } from './save/schema';
import type { GameState } from './state';

/**
 * Mission engine. Missions are data (data/missions.ts). Every GameEvent is offered to every
 * active mission's current objective; matching objectives count up, advance, and finally
 * grant rewards. Main missions start automatically when their requirements are met, so a
 * player can never get stuck without something to do.
 */

const MEDAL_RANK: Record<Medal, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };

export class MissionEngine {
  readonly byId: Record<string, MissionDef>;

  constructor(
    readonly state: GameState,
    readonly defs: MissionDef[],
  ) {
    this.byId = Object.fromEntries(defs.map((d) => [d.id, d]));
  }

  progress(id: string): MissionProgress | undefined {
    return this.state.data.missions[id];
  }

  isDone(id: string): boolean {
    return this.progress(id)?.status === 'done';
  }

  isActive(id: string): boolean {
    return this.progress(id)?.status === 'active';
  }

  /** Requirements met (previous missions done, flags set, chapter reached). */
  requirementsMet(def: MissionDef): boolean {
    const d = this.state.data;
    if (def.chapter > d.chapter) return false;
    for (const r of def.requires) if (!this.isDone(r)) return false;
    for (const f of def.requiresFlags ?? []) if (!d.flags[f]) return false;
    return true;
  }

  /** Missions you could start now (not started, requirements met). */
  available(): MissionDef[] {
    return this.defs.filter((d) => !this.progress(d.id) && this.requirementsMet(d));
  }

  active(): MissionDef[] {
    return this.defs.filter((d) => this.isActive(d.id));
  }

  tracked(): MissionDef | null {
    const id = this.state.data.activeMission;
    if (id && this.isActive(id)) return this.byId[id] ?? null;
    return null;
  }

  objective(id: string): ObjectiveDef | null {
    const def = this.byId[id];
    const p = this.progress(id);
    if (!def || !p || p.status !== 'active') return null;
    return def.objectives[p.step] ?? null;
  }

  /** The objective the HUD should show. */
  currentObjective(): { mission: MissionDef; obj: ObjectiveDef; prog: MissionProgress } | null {
    const m = this.tracked();
    if (!m) return null;
    const prog = this.progress(m.id)!;
    const obj = m.objectives[prog.step];
    return obj ? { mission: m, obj, prog } : null;
  }

  start(id: string, track = true): boolean {
    const def = this.byId[id];
    if (!def || this.progress(id) || !this.requirementsMet(def)) return false;
    this.state.data.missions[id] = { status: 'active', step: 0, count: 0, seen: [] };
    if (track) this.state.data.activeMission = id;
    this.state.post({ kind: 'dialogue', id: def.briefing });
    this.beginStep(def);
    this.state.markDirty();
    return true;
  }

  track(id: string): void {
    if (this.isActive(id)) {
      this.state.data.activeMission = id;
      this.state.markDirty();
    }
  }

  /** Start any main missions whose turn has come. Returns the ids started. */
  autoStart(): string[] {
    const started: string[] = [];
    for (const def of this.available()) {
      if (def.kind !== 'main') continue;
      const trackIt = !this.tracked() || this.tracked()!.kind === 'side';
      if (this.start(def.id, trackIt)) started.push(def.id);
    }
    if (!this.tracked()) {
      const next = this.active()[0];
      if (next) this.state.data.activeMission = next.id;
    }
    return started;
  }

  /** Feed one event to all active missions. */
  handle(e: GameEvent): void {
    for (const def of this.active()) {
      // A single event can finish several objectives in a row (rare), but never loops forever.
      for (let guard = 0; guard < 4; guard++) {
        const p = this.progress(def.id);
        if (!p || p.status !== 'active') break;
        const obj = def.objectives[p.step];
        if (!obj) break;
        const add = this.match(obj, e, p);
        if (add <= 0) break;
        p.count += add;
        const need = obj.count ?? 1;
        if (p.count < need) {
          this.state.post({ kind: 'objective', mission: def.id, step: p.step });
          this.state.markDirty();
          break;
        }
        this.advance(def);
        // Only events like 'land' can satisfy the next step instantly (e.g. deliver on landing).
        if (e.type !== 'land') break;
      }
    }
  }

  /** How much an event moves an objective forward (0 = not at all). */
  match(obj: ObjectiveDef, e: GameEvent, p: MissionProgress): number {
    switch (obj.kind) {
      case 'visit':
        return e.type === 'visit' && e.place === obj.place ? 1 : 0;
      case 'arrive':
        return e.type === 'arrive' && e.system === obj.system ? 1 : 0;
      case 'near':
        return (e.type === 'near' && e.body === obj.body) || (e.type === 'land' && e.body === obj.body) ? 1 : 0;
      case 'land':
        return e.type === 'land' && e.body === obj.body ? 1 : 0;
      case 'home':
        return e.type === 'home' ? 1 : 0;
      case 'enterArea':
        return e.type === 'enterArea' && e.area === obj.area ? 1 : 0;
      case 'collect':
        return e.type === 'collect' && e.item === obj.item && (!obj.area || e.area === obj.area) ? e.count : 0;
      case 'scan': {
        if (e.type !== 'scan' || !obj.target) return 0;
        const hit = obj.target.endsWith(':') ? e.target.startsWith(obj.target) : e.target === obj.target;
        if (!hit || p.seen.includes(e.target)) return 0;
        p.seen.push(e.target);
        return 1;
      }
      case 'talk':
        return e.type === 'talk' && e.npc === obj.npc && (!obj.area || e.area === obj.area) ? 1 : 0;
      case 'reach':
        return e.type === 'reach' && e.marker === obj.marker ? 1 : 0;
      case 'solve':
        return e.type === 'solve' && e.puzzle === obj.puzzle ? 1 : 0;
      case 'gates':
        return e.type === 'gates' && e.course === obj.course ? 1 : 0;
      case 'race':
        return e.type === 'race' && e.course === obj.course && MEDAL_RANK[e.medal] >= MEDAL_RANK[obj.medal ?? 'none'] ? 1 : 0;
      case 'equip':
        return e.type === 'equip' && (!obj.part || obj.part === 'any' || e.part === obj.part) ? 1 : 0;
      case 'coins':
        return e.type === 'coins' && (!obj.system || e.system === obj.system) ? e.amount : 0;
      case 'fuel':
        return e.type === 'fuel' ? 1 : 0;
      case 'boost':
        return e.type === 'boost' ? 1 : 0;
      case 'slingshot':
        return e.type === 'slingshot' ? 1 : 0;
      case 'haul':
        return e.type === 'haul' && e.item === obj.item ? 1 : 0;
      case 'glimmer':
        return e.type === 'glimmer' ? 1 : 0;
      case 'deliver': {
        if (e.type !== 'land' || e.body !== obj.body || !obj.item) return 0;
        const have = this.state.data.cargo[obj.item] ?? 0;
        if (have <= 0) return 0;
        const need = (obj.count ?? 1) - p.count;
        const give = Math.min(have, need);
        this.state.data.cargo[obj.item] = have - give;
        return give;
      }
    }
  }

  /** Objectives that are already true when they start (e.g. "equip the twin engine" when it is on). */
  private alreadySatisfied(obj: ObjectiveDef): boolean {
    if (obj.kind === 'equip' && obj.part && obj.part !== 'any') {
      return Object.values(this.state.data.loadout).includes(obj.part);
    }
    return false;
  }

  private beginStep(def: MissionDef): void {
    const p = this.progress(def.id)!;
    const obj = def.objectives[p.step];
    if (!obj) return;
    if (obj.onStart) this.state.post({ kind: 'dialogue', id: obj.onStart });
    if (this.alreadySatisfied(obj)) this.advance(def);
  }

  private advance(def: MissionDef): void {
    const p = this.progress(def.id)!;
    const obj = def.objectives[p.step];
    if (obj?.onDone) this.state.post({ kind: 'dialogue', id: obj.onDone });
    p.step++;
    p.count = 0;
    p.seen = [];
    this.state.markDirty();
    if (p.step >= def.objectives.length) {
      this.complete(def);
      return;
    }
    this.state.post({ kind: 'objective', mission: def.id, step: p.step });
    this.beginStep(def);
  }

  private complete(def: MissionDef): void {
    const st = this.state;
    const p = this.progress(def.id)!;
    p.status = 'done';
    const r = def.rewards;
    st.addCoins(r.coins);
    for (const id of r.parts ?? []) grant(st, id);
    for (const id of r.items ?? []) grant(st, id);
    for (const f of r.flags ?? []) st.setFlag(f);
    for (const c of r.codex ?? []) st.emit({ type: 'codex', id: c });
    for (const s of r.stickers ?? []) {
      if (st.addUnique(st.data.stickers, s)) st.post({ kind: 'sticker', id: s });
    }
    if (def.kind === 'side') st.bump('sideDone');
    st.post({ kind: 'dialogue', id: def.done });
    st.post({ kind: 'missionDone', id: def.id });
    if (r.chapter && r.chapter > st.data.chapter) {
      st.data.chapter = r.chapter;
      st.post({ kind: 'chapter', chapter: r.chapter });
    }
    if (r.cutscene) st.post({ kind: 'cutscene', id: r.cutscene });
    if (st.data.activeMission === def.id) st.data.activeMission = null;
    st.markDirty();
    this.autoStart();
  }

  /** Total main missions and how many are done (for the completion screen). */
  counts(): { main: number; mainDone: number; side: number; sideDone: number } {
    let main = 0;
    let mainDone = 0;
    let side = 0;
    let sideDone = 0;
    for (const d of this.defs) {
      if (d.kind === 'main') {
        main++;
        if (this.isDone(d.id)) mainDone++;
      } else {
        side++;
        if (this.isDone(d.id)) sideDone++;
      }
    }
    return { main, mainDone, side, sideDone };
  }
}
