// Mission engine: data-driven missions with event/state/deliver/talk objectives, triggers,
// effects and rewards. Pure simulation; the UI asks it what to say/offer.
import { CHAPTERS, MISSIONS, MISSION_BY_ID } from '../data/missions';
import type { DeliverObjective, Effect, MissionDef, Objective, TalkObjective } from '../data/questTypes';
import { FRUITS } from '../data/fruit';
import { item } from '../data/registry';
import { Region } from '../world/types';
import { learnRecipe } from './crafting';
import { plazaDecorCount } from './decor';
import type { Game } from './game';
import { countItem, give, money, removeAt, setPocketSize } from './inventory';
import { pitchTent } from './housing';
import { islandStars } from './rating';
import { plotsFor, scheduleMoveIn } from './placement';
import { addStructure, findStructure, startConstruction } from './structures';
import type { MissionProgress } from './state';
import { residents } from './villagers';
import { museumPercent } from './museum';

export interface QuestMessage {
  speaker: string;
  lines: string[];
  title?: string;
}

interface QuestRT {
  inbox: QuestMessage[];
  tick: number;
}

export function questRT(g: Game): QuestRT {
  let r = g.runtime.quests as QuestRT | undefined;
  if (!r) {
    r = { inbox: [], tick: 0 };
    g.runtime.quests = r;
  }
  return r;
}

// ---------------------------------------------------------------- state functions

export const STATE_FNS: Record<string, (g: Game, arg?: string) => number> = {
  homeLevel: (g) => g.state.home.level,
  hasStruct: (g, a) => (g.state.world.structures.some((s) => s.type === a) ? 1 : 0),
  residents: (g) => residents(g).length,
  resident: (g, a) => (g.state.villagers[a ?? '']?.movedIn ? 1 : 0),
  plot: (g, a) => (plotsFor(g, a ?? '') ? 1 : 0),
  museum: (g) => g.state.museum.donated.length,
  museumPct: (g) => museumPercent(g),
  rating: (g) => islandStars(g),
  plazaDecor: (g) => plazaDecorCount(g),
  plazaFlowers: (g) => plazaFlowerCount(g),
  bridges: (g) => g.state.world.structures.filter((s) => s.type === 'bridge').length,
  ramps: (g) => g.state.world.structures.filter((s) => s.type === 'ramp').length,
  visited: (g, a) => g.state.flags[`visited_${a}`] ?? 0,
  visitedEast: (g) => ((g.state.flags[`visited_${Region.NE}`] ?? 0) || (g.state.flags[`visited_${Region.SE}`] ?? 0) ? 1 : 0),
  flag: (g, a) => g.state.flags[a ?? ''] ?? 0,
  item: (g, a) => countItem(g, a ?? ''),
  stat: (g, a) => g.state.stats[a ?? ''] ?? 0,
  recipes: (g) => g.state.recipes.length,
};

export function plazaFlowerCount(g: Game): number {
  const lot = g.world.gen.lots.plaza;
  let n = 0;
  for (let z = lot.z - 3; z < lot.z + lot.d + 3; z++)
    for (let x = lot.x - 3; x < lot.x + lot.w + 3; x++) {
      if (!g.world.inb(x, z)) continue;
      const o = g.world.obj(g.world.idx(x, z));
      if (o && o.k === 'flower') n++;
    }
  return n;
}

// ---------------------------------------------------------------- item matching

export function deliverItemId(g: Game, o: DeliverObjective): string | null {
  if (o.item === '$nativeFruit') return FRUITS[g.world.gen.nativeFruit]!.id;
  return o.item ?? null;
}

export function itemMatches(g: Game, o: DeliverObjective, id: string): boolean {
  const want = deliverItemId(g, o);
  if (want) return id === want;
  if (o.cat === 'foreignFruit') return FRUITS.some((f, i) => f.id === id && i !== g.world.gen.nativeFruit);
  if (o.cat) return item(id).cat === o.cat;
  return false;
}

export function deliverableCount(g: Game, o: DeliverObjective): number {
  let n = 0;
  for (const s of g.state.player.inv) if (s && itemMatches(g, o, s.id)) n += s.qty;
  return n;
}

// ---------------------------------------------------------------- progress

export function active(g: Game): MissionDef[] {
  return Object.keys(g.state.quests.active)
    .map((id) => MISSION_BY_ID[id])
    .filter((m): m is MissionDef => !!m);
}

export function isDone(g: Game, id: string): boolean {
  return g.state.quests.done.includes(id);
}

export function progressOf(g: Game, m: MissionDef): MissionProgress | undefined {
  return g.state.quests.active[m.id];
}

export function objectiveValue(g: Game, m: MissionDef, i: number): { value: number; target: number; done: boolean } {
  const o = m.objectives[i]!;
  const p = progressOf(g, m);
  const counted = p?.counts[i] ?? 0;
  switch (o.kind) {
    case 'state': {
      const v = STATE_FNS[o.fn]?.(g, o.arg) ?? 0;
      // once satisfied, stays satisfied
      const value = Math.max(v, counted >= o.n ? o.n : 0);
      return { value: Math.min(value, o.n), target: o.n, done: value >= o.n };
    }
    case 'event':
      return { value: Math.min(counted, o.count), target: o.count, done: counted >= o.count };
    case 'deliver':
      return { value: Math.min(counted, o.qty), target: o.qty, done: counted >= o.qty };
    case 'talk':
      return { value: counted, target: 1, done: counted >= 1 };
  }
}

/** In sequential missions only the first unfinished objective is live. */
export function objectiveLive(g: Game, m: MissionDef, i: number): boolean {
  if (!m.sequential) return true;
  for (let k = 0; k < i; k++) if (!objectiveValue(g, m, k).done) return false;
  return true;
}

export function allDone(g: Game, m: MissionDef): boolean {
  return m.objectives.every((_, i) => objectiveValue(g, m, i).done);
}

/** Missions waiting for the player to talk to their giver to start. */
export function available(g: Game): MissionDef[] {
  const q = g.state.quests;
  return MISSIONS.filter((m) => m.startTalk && !q.active[m.id] && !q.done.includes(m.id) && prereqsMet(g, m));
}

function prereqsMet(g: Game, m: MissionDef): boolean {
  return m.requires.every((r) => g.state.quests.done.includes(r)) && g.state.clock.day >= (m.minDay ?? 0);
}

// ---------------------------------------------------------------- lifecycle

function say(g: Game, speaker: string, lines: string[], title?: string): void {
  if (lines.length) questRT(g).inbox.push({ speaker, lines, title });
}

export function startMission(g: Game, m: MissionDef, withIntro = true): void {
  const q = g.state.quests;
  if (q.active[m.id] || q.done.includes(m.id)) return;
  q.active[m.id] = { startedDay: g.state.clock.day, counts: m.objectives.map(() => 0) };
  if (!q.tracked || !q.active[q.tracked]) q.tracked = m.id;
  if (m.chapter > q.chapter) {
    q.chapter = m.chapter;
    const ch = CHAPTERS.find((c) => c.n === m.chapter);
    g.emit('chapterStarted', { chapter: m.chapter });
    if (ch) questRT(g).inbox.push({ speaker: '', lines: [], title: `Chapter ${ch.n} — ${ch.title}` });
  }
  for (const e of m.onStart ?? []) applyEffect(g, e);
  if (withIntro) say(g, m.giver, m.intro);
  g.emit('missionStarted', { id: m.id });
  // count deliveries/talks that may already be satisfied by state
  evaluate(g);
}

export function completeMission(g: Game, m: MissionDef, withOutro = true): void {
  const q = g.state.quests;
  if (!q.active[m.id]) return;
  delete q.active[m.id];
  q.done.push(m.id);
  if (q.tracked === m.id) q.tracked = Object.keys(q.active)[0] ?? '';
  if (withOutro) say(g, m.turnIn ?? m.giver, m.outro);
  for (const e of m.onComplete ?? []) applyEffect(g, e);
  g.emit('missionCompleted', { id: m.id });
  g.emit('sfx', { name: 'quest' });
  g.toast(`Mission complete: ${m.title}`, 'good');
  tryStart(g);
}

export function applyEffect(g: Game, e: Effect): void {
  switch (e.type) {
    case 'give':
      give(g, e.item, e.qty ?? 1, 'quest');
      break;
    case 'recipe':
      learnRecipe(g, e.id, 'quest');
      break;
    case 'money':
      money(g, e.glints ?? 0, e.lumens ?? 0);
      if (e.glints) g.toast(`+${e.glints.toLocaleString()} Glints`, 'good');
      if (e.lumens) g.toast(`+${e.lumens.toLocaleString()} Lumens`, 'good');
      break;
    case 'flag':
      g.state.flags[e.flag] = e.value ?? 1;
      break;
    case 'pitchTent':
      pitchTent(g);
      break;
    case 'spawn': {
      if (findStructure(g, e.struct)) break;
      const lot = e.struct === 'shopCart' ? g.world.gen.lots.shop : g.world.gen.lots.museum;
      if (e.struct === 'shopCart') addStructure(g, { type: 'shopCart', x: lot.x + 1, z: lot.z + 1, w: 2, d: 2, level: 0 });
      else addStructure(g, { type: 'museumTent', x: lot.x + 1, z: lot.z + 1, w: 4, d: 3, level: 0 });
      break;
    }
    case 'construct': {
      const s = findStructure(g, e.from);
      if (!s) break;
      const lot = e.to === 'shop' ? g.world.gen.lots.shop : g.world.gen.lots.museum;
      // grow to the full lot
      s.x = lot.x;
      s.z = lot.z;
      s.w = lot.w;
      s.d = lot.d;
      for (let z = lot.z; z < lot.z + lot.d; z++) for (let x = lot.x; x < lot.x + lot.w; x++) g.world.setObj(g.world.idx(x, z), undefined);
      startConstruction(g, s, e.to, 1);
      g.emit('objectsChanged', {});
      break;
    }
    case 'moveIn':
      scheduleMoveIn(g, e.owners);
      break;
    case 'pockets':
      if (g.state.player.invSize < e.size) setPocketSize(g, e.size);
      break;
    case 'finale':
      g.state.flags.lighthouseLit = 1;
      g.state.quests.finished = true;
      g.emit('structuresChanged', {});
      g.emit('finale', {});
      break;
    case 'toast':
      g.toast(e.text, 'good');
      break;
  }
}

/** Start auto missions whose prerequisites are met. */
export function tryStart(g: Game): void {
  for (const m of MISSIONS) {
    if (m.startTalk) continue;
    if (g.state.quests.active[m.id] || isDone(g, m.id)) continue;
    if (prereqsMet(g, m)) startMission(g, m);
  }
}

/** Evaluate state objectives + auto-complete. Cheap; runs a few times per second. */
export function evaluate(g: Game): void {
  for (const m of active(g)) {
    const p = progressOf(g, m)!;
    m.objectives.forEach((o, i) => {
      if (o.kind === 'state' && objectiveLive(g, m, i)) {
        const v = STATE_FNS[o.fn]?.(g, o.arg) ?? 0;
        if (v >= o.n) p.counts[i] = o.n;
      }
    });
    if (!m.turnIn && allDone(g, m)) completeMission(g, m);
  }
}

export function matchFilter(filter: Record<string, string | number | boolean> | undefined, payload: Record<string, unknown>): boolean {
  if (!filter) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith('min:')) {
      if (!((payload[k.slice(4)] as number) >= (v as number))) return false;
    } else if (k.startsWith('prefix:')) {
      if (!String(payload[k.slice(7)] ?? '').startsWith(String(v))) return false;
    } else if (payload[k] !== v) return false;
  }
  return true;
}

export function onEvent(g: Game, type: string, payload: unknown): void {
  const pl = (payload ?? {}) as Record<string, unknown>;
  let touched = false;
  for (const m of active(g)) {
    const p = progressOf(g, m)!;
    m.objectives.forEach((o, i) => {
      if (o.kind !== 'event' || o.event !== type || !objectiveLive(g, m, i)) return;
      if (p.counts[i]! >= o.count) return;
      if (!matchFilter(o.filter, pl)) return;
      p.counts[i] = Math.min(o.count, p.counts[i]! + (o.sum ? Number(pl[o.sum] ?? 0) : 1));
      touched = true;
    });
  }
  if (touched) evaluate(g);
}

// ---------------------------------------------------------------- talking

export interface TalkScene {
  lines: string[];
  speaker: string;
  apply: () => void;
  label?: string;
}

/** What should happen when the player talks to `npc` (story-wise), in priority order. */
export function talkScene(g: Game, npc: string): TalkScene | null {
  // 1. turn-ins
  for (const m of active(g)) {
    if (m.turnIn === npc && allDone(g, m)) return { speaker: npc, lines: [], apply: () => completeMission(g, m) };
  }
  // 2. live talk objectives
  for (const m of active(g)) {
    for (let i = 0; i < m.objectives.length; i++) {
      const o = m.objectives[i]!;
      if (o.kind !== 'talk' || o.npc !== npc || objectiveValue(g, m, i).done || !objectiveLive(g, m, i)) continue;
      const t = o as TalkObjective;
      if (t.afterHour !== undefined && g.state.clock.minute / 60 < t.afterHour) return { speaker: npc, lines: t.tooEarly ?? ['[neutral]Not yet — come back later.'], apply: () => {} };
      return {
        speaker: npc,
        lines: t.lines,
        apply: () => {
          progressOf(g, m)!.counts[i] = 1;
          g.emit('talked', { npc });
          evaluate(g);
        },
      };
    }
  }
  // 3. missions waiting to be started by talking
  for (const m of available(g)) {
    if (m.giver === npc) return { speaker: npc, lines: m.intro, apply: () => startMission(g, m, false) };
  }
  return null;
}

export interface QuestOption {
  label: string;
  run: () => string[] | null;
  /** start plot placement for this owner */
  plot?: string;
}

/** Deliveries + plot placements available while talking to `npc`. */
export function questOptions(g: Game, npc: string): QuestOption[] {
  const out: QuestOption[] = [];
  for (const m of active(g)) {
    m.objectives.forEach((o, i) => {
      if (o.kind !== 'deliver' || o.npc !== npc || objectiveValue(g, m, i).done || !objectiveLive(g, m, i)) return;
      const d = o as DeliverObjective;
      const p = progressOf(g, m)!;
      const need = d.qty - p.counts[i]!;
      const have = deliverableCount(g, d);
      if (have <= 0) return;
      const giveN = Math.min(need, have);
      const name = deliverItemId(g, d) ? item(deliverItemId(g, d)!).name : d.cat === 'foreignFruit' ? 'foreign fruit' : d.cat ?? 'items';
      out.push({
        label: `Hand over ${giveN} ${name}`,
        run: () => {
          let left = giveN;
          const inv = g.state.player.inv;
          for (let k = inv.length - 1; k >= 0 && left > 0; k--) {
            const s = inv[k];
            if (!s || !itemMatches(g, d, s.id)) continue;
            const n = Math.min(left, s.qty);
            removeAt(g, k, n, 'quest');
            left -= n;
          }
          p.counts[i] = Math.min(d.qty, p.counts[i]! + giveN);
          g.emit('sfx', { name: 'deliver' });
          evaluate(g);
          // the pie chain: Tansy bakes once both fruits are in
          if (m.id === 'm4_tansy' && i === 1 && p.counts[i]! >= d.qty) give(g, 'pie', 1, 'quest');
          return objectiveValue(g, m, i).done ? (d.thanks ?? ['[happy]Thank you! That is exactly what I needed.']) : ['[happy]Thanks! Bring the rest when you can.'];
        },
      });
    });
    if (m.giver === npc && m.plots) {
      for (const owner of m.plots) if (!plotsFor(g, owner)) out.push({ label: `Place ${owner[0]!.toUpperCase() + owner.slice(1)}'s home plot`, plot: owner, run: () => null });
    }
  }
  return out;
}

/** World/UI target for the tracked mission's current step. */
export function markerTarget(g: Game, m: MissionDef): { npc?: string; struct?: string; lot?: string; region?: number } | null {
  if (m.turnIn && allDone(g, m)) return { npc: m.turnIn };
  for (let i = 0; i < m.objectives.length; i++) {
    if (objectiveValue(g, m, i).done || !objectiveLive(g, m, i)) continue;
    const o: Objective = m.objectives[i]!;
    if (o.kind === 'talk' || o.kind === 'deliver') return { npc: o.npc };
    if (o.kind === 'state' && o.fn === 'plot') return { npc: m.giver };
    if (o.kind === 'state' && o.fn === 'visited') return { region: Number(o.arg) };
    if (o.kind === 'state' && o.fn === 'flag' && o.arg === 'lighthouseSeen') return { struct: 'lighthouse' };
    break;
  }
  return m.marker ?? null;
}

export function installQuests(g: Game): void {
  g.bus.onAny((type, payload) => onEvent(g, type as string, payload));
  g.onDay((game) => {
    tryStart(game);
    evaluate(game);
  });
  g.onUpdate((game, dt) => {
    const rt = questRT(game);
    rt.tick += dt;
    if (rt.tick > 0.5) {
      rt.tick = 0;
      tryStart(game);
      evaluate(game);
    }
  });
}
