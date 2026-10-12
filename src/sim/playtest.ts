// Playtest mode: an on-device pacing log (enabled with ?playtest=1 or the hidden Settings toggle).
// It records only gameplay timings and counters — no names, no device info, no timestamps —
// and is never sent anywhere. Players export it themselves (download or copy).
import { CHAPTERS, MISSION_BY_ID } from '../data/missions';
import type { GameEvents } from './events';
import type { Game } from './game';
import { IDLE_SEC } from './hints';
import { SAVE_VERSION } from './state';

export const PLAYTEST_VERSION = 1;
/** Storage cap for one slot's log (bytes ≈ chars). */
export const PLAYTEST_CAP = 64 * 1024;
export const PLAYTEST_KIND = 'light-crossing-playtest';

/** Per-mission timings. Seconds are real time; days are in-game days. */
export interface MissionLog {
  ch: number;
  /** real seconds (log clock) when started / completed */
  s: number;
  e?: number;
  /** in-game day when started / completed */
  sd: number;
  ed?: number;
  /** real seconds while active, split by what the player was doing */
  play: number;
  menu: number;
  idle: number;
  stalls: number;
}

export interface PlaytestLog {
  kind: typeof PLAYTEST_KIND;
  v: number;
  save: number;
  /** play sessions recorded (page loads / slot loads) */
  sessions: number;
  /** real seconds recorded, split three ways (play + menu + idle = total) */
  total: number;
  play: number;
  menu: number;
  idle: number;
  firstDay: number;
  day: number;
  missions: Record<string, MissionLog>;
  chapters: Record<string, { s: number; sd: number; e?: number; ed?: number }>;
  /** real seconds spent in each menu / panel */
  menus: Record<string, number>;
  /** real seconds spent on each in-game day */
  days: Record<string, number>;
  stalls: { id: string; obj: number; t: number; day: number }[];
  glints: { earned: Record<string, number>; spent: Record<string, number> };
  lumens: { earned: Record<string, number>; spent: Record<string, number> };
  loans: { level: number; amount: number; day: number; t: number; paidDay?: number; paidT?: number }[];
  /** counts per activity (fish caught, trees shaken, items crafted...) */
  activity: Record<string, number>;
  storyDone?: { t: number; day: number };
}

export function emptyLog(day = 1): PlaytestLog {
  return {
    kind: PLAYTEST_KIND,
    v: PLAYTEST_VERSION,
    save: SAVE_VERSION,
    sessions: 0,
    total: 0,
    play: 0,
    menu: 0,
    idle: 0,
    firstDay: day,
    day,
    missions: {},
    chapters: {},
    menus: {},
    days: {},
    stalls: [],
    glints: { earned: {}, spent: {} },
    lumens: { earned: {}, spent: {} },
    loans: [],
    activity: {},
  };
}

/** Events counted as activities (payload-free counts; nothing identifying). */
const ACTIVITY_EVENTS = [
  'fishCaught', 'fishLost', 'bugCaught', 'bugScared', 'dug', 'fossilFound', 'treeShaken', 'woodChopped', 'rockHit', 'weedPulled',
  'fruitPicked', 'pickedUp', 'itemSold', 'itemBought', 'crafted', 'donated', 'fossilAssessed', 'planted', 'watered', 'flowerBred',
  'talked', 'gifted', 'requestDone', 'furniturePlaced', 'structureBuilt', 'challengeCompleted', 'achievement', 'eventStarted',
  'eventFinished', 'slept', 'climbed', 'toolBroke', 'recipeLearned', 'regionVisited', 'hintShown',
] as const;

const r1 = (n: number) => Math.round(n * 10) / 10;
const add = (rec: Record<string, number>, k: string, n: number) => (rec[k] = r1((rec[k] ?? 0) + n));

export interface PlaytestStore {
  load(): string | null;
  save(data: string): void;
}

export class PlaytestRecorder {
  log: PlaytestLog;
  private off: (() => void)[] = [];
  private g: Game | null = null;
  private dirty = false;

  constructor(private store: PlaytestStore) {
    this.log = emptyLog();
    const raw = store.load();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PlaytestLog;
        if (parsed && parsed.kind === PLAYTEST_KIND) this.log = { ...emptyLog(), ...parsed };
      } catch {
        /* start fresh */
      }
    }
  }

  /** Start recording a game session. */
  attach(g: Game): void {
    this.detach();
    this.g = g;
    const L = this.log;
    if (!L.sessions) L.firstDay = g.state.clock.day;
    L.sessions++;
    L.day = g.state.clock.day;
    // missions already active when recording starts (first enable mid-game)
    for (const id of Object.keys(g.state.quests.active)) this.missionStart(id);
    const chapter = g.state.quests.chapter;
    if (!L.chapters[chapter]) L.chapters[chapter] = { s: L.total, sd: g.state.clock.day };
    const on = <K extends keyof GameEvents>(k: K, f: (p: GameEvents[K]) => void) => {
      this.off.push(g.bus.on(k, f));
    };
    on('missionStarted', (e) => this.missionStart(e.id));
    on('missionCompleted', (e) => {
      const m = L.missions[e.id];
      if (m && m.e === undefined) {
        m.e = r1(L.total);
        m.ed = g.state.clock.day;
      }
      // a chapter ends when its last mission completes
      const def = MISSION_BY_ID[e.id];
      if (def) {
        const ch = L.chapters[def.chapter];
        const left = Object.keys(g.state.quests.active).some((id) => MISSION_BY_ID[id]?.chapter === def.chapter);
        if (ch && !left && ch.e === undefined && def.chapter < g.state.quests.chapter + (g.state.quests.finished ? 1 : 0)) {
          ch.e = r1(L.total);
          ch.ed = g.state.clock.day;
        }
      }
      this.dirty = true;
    });
    on('chapterStarted', (e) => {
      for (const c of CHAPTERS) {
        const prev = L.chapters[c.n];
        if (c.n < e.chapter && prev && prev.e === undefined) {
          prev.e = r1(L.total);
          prev.ed = g.state.clock.day;
        }
      }
      L.chapters[e.chapter] ??= { s: r1(L.total), sd: g.state.clock.day };
    });
    on('finale', () => {
      L.storyDone ??= { t: r1(L.total), day: g.state.clock.day };
    });
    on('missionStalled', (e) => {
      if (L.stalls.length < 200) L.stalls.push({ id: e.id, obj: e.obj, t: r1(L.total), day: g.state.clock.day });
      const m = L.missions[e.id];
      if (m) m.stalls++;
    });
    on('money', (e) => {
      const r = e.reason ?? 'other';
      if (e.dg > 0) add(L.glints.earned, r, e.dg);
      if (e.dg < 0) add(L.glints.spent, r, -e.dg);
      if (e.dl > 0) add(L.lumens.earned, r, e.dl);
      if (e.dl < 0) add(L.lumens.spent, r, -e.dl);
    });
    on('loanTaken', (e) => {
      L.loans.push({ level: e.level, amount: e.amount, day: g.state.clock.day, t: r1(L.total) });
    });
    on('loanPaid', (e) => {
      const loan = L.loans[L.loans.length - 1];
      if (loan && e.remaining === 0 && loan.paidDay === undefined) {
        loan.paidDay = g.state.clock.day;
        loan.paidT = r1(L.total);
      }
    });
    on('dayStarted', (e) => {
      L.day = e.day;
    });
    for (const k of ACTIVITY_EVENTS) on(k, () => add(L.activity, k, 1));
  }

  detach(): void {
    for (const f of this.off) f();
    this.off = [];
    this.g = null;
  }

  private missionStart(id: string): void {
    const g = this.g;
    if (!g || this.log.missions[id]) return;
    this.log.missions[id] = { ch: MISSION_BY_ID[id]?.chapter ?? 0, s: r1(this.log.total), sd: g.state.clock.day, play: 0, menu: 0, idle: 0, stalls: 0 };
  }

  /**
   * Advance the log by `dt` real seconds. `menu` is the open panel's name (null when playing).
   * Idle = no input for a while (the player stepped away), whatever is on screen.
   */
  tick(dt: number, menu: string | null): void {
    const g = this.g;
    if (!g || dt <= 0) return;
    const L = this.log;
    const bucket: 'idle' | 'menu' | 'play' = g.idleSec >= IDLE_SEC ? 'idle' : menu ? 'menu' : 'play';
    L.total += dt;
    L[bucket] += dt;
    if (bucket === 'menu') L.menus[menu ?? 'other'] = (L.menus[menu ?? 'other'] ?? 0) + dt;
    const d = String(g.state.clock.day);
    L.days[d] = (L.days[d] ?? 0) + dt;
    for (const id in g.state.quests.active) {
      const m = L.missions[id];
      if (m && m.e === undefined) m[bucket] += dt;
    }
    this.dirty = true;
  }

  /** Serialize (rounded, capped). */
  serialize(): string {
    const L = this.log;
    const round = (rec: Record<string, number>) => {
      for (const k in rec) rec[k] = r1(rec[k]!);
    };
    L.total = r1(L.total);
    L.play = r1(L.play);
    L.menu = r1(L.menu);
    L.idle = r1(L.idle);
    round(L.menus);
    round(L.days);
    for (const m of Object.values(L.missions)) {
      m.play = r1(m.play);
      m.menu = r1(m.menu);
      m.idle = r1(m.idle);
    }
    let json = JSON.stringify(L);
    // stay under the cap: drop the oldest per-day rows and stall entries first
    while (json.length > PLAYTEST_CAP) {
      const days = Object.keys(L.days);
      if (L.stalls.length > 20) L.stalls.splice(0, L.stalls.length - 20);
      else if (days.length > 30) for (const k of days.slice(0, days.length - 30)) delete L.days[k];
      else if (L.loans.length > 10) L.loans.splice(0, L.loans.length - 10);
      else break;
      json = JSON.stringify(L);
    }
    return json;
  }

  /** Persist if anything changed. */
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.store.save(this.serialize());
  }

  /** Export payload (pretty JSON). */
  exportJSON(): string {
    return JSON.stringify(JSON.parse(this.serialize()), null, 1);
  }

  reset(): void {
    const g = this.g;
    this.log = emptyLog(g?.state.clock.day ?? 1);
    if (g) {
      this.log.sessions = 1;
      for (const id of Object.keys(g.state.quests.active)) this.missionStart(id);
      this.log.chapters[g.state.quests.chapter] = { s: 0, sd: g.state.clock.day };
    }
    this.dirty = true;
    this.flush();
  }
}
