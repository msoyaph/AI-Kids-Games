/**
 * Playtest log (only with `?playtest=1`): local-only stats about how long things take, so the
 * pacing model can be checked against real kids. Pure data + logic (no DOM) so it can be
 * unit-tested. Never stores names or anything personal; never leaves the device unless the
 * player exports it by hand. Summarized by `npm run analyze-playtests`.
 */
import { read, write } from '../core/storage';

export const PLAYTEST_KEY = 'playtest';
export const PLAYTEST_VERSION = 1;
const MAX_EVENTS = 1500;
const MAX_DAYS = 400;

export interface PlaytestDevice {
  w: number;
  h: number;
  dpr: number;
  touch: boolean;
  renderer: string;
  lowq: boolean;
}

export interface PlaytestSession {
  /** session start, date only (yyyy-mm-dd) */
  date: string;
  /** real seconds with the clock running / paused (menus, dialogue, cutscenes, festivals) / on the title */
  playSec: number;
  pausedSec: number;
  titleSec: number;
  fpsAvg: number;
  fpsLow: number;
  slowSec: number;
}

export interface PlaytestDay {
  /** session index and save slot */
  s: number;
  slot: number;
  /** in-game day index (0 = Spring 1) */
  day: number;
  playSec: number;
  pausedSec: number;
  /** clock minute when the day ended (1440 = midnight), and whether they dozed off at 2am */
  bed: number;
  passedOut: boolean;
  coins: number;
  boards: number;
  bundles: number;
  deepest: number;
  menus: number;
}

export interface PlaytestEvent {
  /** session index, seconds into the session, in-game day + minute */
  s: number;
  t: number;
  day: number;
  min: number;
  kind: string;
  data?: string | number;
}

export interface PlaytestLog {
  v: number;
  game: string;
  /** random id so several exports from one device can be grouped (not linked to a person) */
  id: string;
  device: PlaytestDevice;
  sessions: PlaytestSession[];
  days: PlaytestDay[];
  events: PlaytestEvent[];
}

export function emptyLog(device: PlaytestDevice, id: string): PlaytestLog {
  return { v: PLAYTEST_VERSION, game: 'cliff-valley', id, device, sessions: [], days: [], events: [] };
}

/** Accumulates one session's numbers; `flush()` stores the whole log. */
export class PlaytestRecorder {
  log: PlaytestLog;
  readonly s: number;
  private sess: PlaytestSession;
  private t = 0;
  private dayPlay = 0;
  private dayPaused = 0;
  private menus = 0;
  private fpsSum = 0;
  private fpsN = 0;
  private fpsMin = 999;
  private sinceFlush = 0;
  /** precise running totals (the stored session gets rounded copies) */
  private play = 0;
  private paused = 0;
  private title = 0;
  private slow = 0;

  constructor(log: PlaytestLog, date: string) {
    this.log = log;
    this.sess = { date, playSec: 0, pausedSec: 0, titleSec: 0, fpsAvg: 0, fpsLow: 0, slowSec: 0 };
    this.s = log.sessions.push(this.sess) - 1;
  }

  /** Call every frame. `where`: on the title, playing with the clock running, or paused. */
  tick(dt: number, where: 'title' | 'play' | 'paused', fps: number): boolean {
    this.t += dt;
    if (where === 'title') this.title += dt;
    else if (where === 'play') {
      this.play += dt;
      this.dayPlay += dt;
    } else {
      this.paused += dt;
      this.dayPaused += dt;
    }
    if (fps > 0) {
      this.fpsSum += fps * dt;
      this.fpsN += dt;
      if (fps < 45) this.slow += dt;
    }
    this.sinceFlush += dt;
    return this.sinceFlush > 30;
  }
  /** One fps sample per second (for the 1% low-ish minimum). */
  sampleFps(fps: number): void {
    if (fps > 0) this.fpsMin = Math.min(this.fpsMin, fps);
  }
  menuOpened(): void {
    this.menus++;
  }
  event(day: number, min: number, kind: string, data?: string | number): void {
    this.log.events.push({ s: this.s, t: Math.round(this.t), day, min: Math.round(min), kind, ...(data !== undefined ? { data } : {}) });
    if (this.log.events.length > MAX_EVENTS) this.log.events.splice(0, this.log.events.length - MAX_EVENTS);
  }
  endDay(d: Omit<PlaytestDay, 's' | 'playSec' | 'pausedSec' | 'menus'>): void {
    this.log.days.push({ s: this.s, ...d, playSec: Math.round(this.dayPlay), pausedSec: Math.round(this.dayPaused), menus: this.menus });
    if (this.log.days.length > MAX_DAYS) this.log.days.splice(0, this.log.days.length - MAX_DAYS);
    this.dayPlay = 0;
    this.dayPaused = 0;
    this.menus = 0;
  }
  /** Loading another farm mid-session starts the day counters fresh. */
  resetDay(): void {
    this.dayPlay = 0;
    this.dayPaused = 0;
    this.menus = 0;
  }
  snapshot(): PlaytestLog {
    const s = this.sess;
    s.playSec = Math.round(this.play);
    s.pausedSec = Math.round(this.paused);
    s.titleSec = Math.round(this.title);
    s.slowSec = Math.round(this.slow);
    s.fpsAvg = this.fpsN ? Math.round(this.fpsSum / this.fpsN) : 0;
    s.fpsLow = this.fpsMin < 999 ? Math.round(this.fpsMin) : 0;
    return this.log;
  }
  flush(): boolean {
    this.sinceFlush = 0;
    return write(PLAYTEST_KEY, JSON.stringify(this.snapshot())).ok;
  }
}

export function loadLog(device: PlaytestDevice, newId: () => string): PlaytestLog {
  try {
    const raw = read(PLAYTEST_KEY);
    if (raw) {
      const log = JSON.parse(raw) as PlaytestLog;
      if (log && log.v === PLAYTEST_VERSION && Array.isArray(log.sessions)) {
        log.device = device;
        return log;
      }
    }
  } catch {
    /* start fresh */
  }
  return emptyLog(device, newId());
}

/** Small human summary for the export screen. */
export function quickSummary(log: PlaytestLog): { minutes: number; days: number; perDay: number } {
  const sec = log.sessions.reduce((t, s) => t + s.playSec + s.pausedSec, 0);
  const days = log.days.length;
  const daySec = log.days.reduce((t, d) => t + d.playSec + d.pausedSec, 0);
  return { minutes: Math.round(sec / 60), days, perDay: days ? Math.round((daySec / days / 60) * 10) / 10 : 0 };
}
