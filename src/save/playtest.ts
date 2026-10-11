// Playtest log: anonymous per-race numbers kept ONLY in this browser (`calexcart.playtest`), never sent anywhere.
// Stored as a rolling buffer capped at PLAYTEST_MAX_CHARS (≈ 100 KB as UTF-16): the oldest races are dropped first.
// No names, slot data, timestamps or device ids are recorded.
import type { AssistLevel } from '../tuning/balance';
import { readKey, removeKey, writeKey } from './storage';

export const PLAYTEST_KEY = 'calexcart.playtest';
/** ≈ 100 KB of localStorage (browsers count 2 bytes per UTF-16 char). */
export const PLAYTEST_MAX_CHARS = 50_000;
export const PLAYTEST_FORMAT = 1;

export type PlaytestInput = 'keyboard' | 'gamepad' | 'touch' | 'tilt';

export interface PlaytestPlayer {
  racer: string;
  weight: string;
  body: string;
  wheels: string;
  glider: string;
  input: PlaytestInput;
  assist: AssistLevel;
  autoAccel: boolean;
  /** Finish position and field size. */
  pos: number;
  of: number;
  /** Finish time in seconds (−1 if the race was left early). */
  time: number;
  /** Finish time was estimated (still racing when the grace period ended). */
  projected: boolean;
  laps: number[];
  falls: number;
  /** Seconds spent drifting. */
  drift: number;
  /** Mini-turbos by spark tier [blue, orange, pink]. */
  mt: [number, number, number];
  items: number;
  hitsTaken: number;
  hitsGiven: number;
  dodges: number;
  /** Times each shortcut was taken, by shortcut index. */
  shortcuts: number[];
  /** 'perfect' | 'boost' | 'early' | 'none'. */
  start: 'perfect' | 'boost' | 'early' | 'none';
  tricks: number;
  pads: number;
  walls: number;
  offroad: number;
  /** Battle score / balloons popped. */
  score: number;
}

export interface PlaytestRecord {
  /** Sequence number within this log. */
  n: number;
  build: string;
  mode: string;
  track: string;
  cls: string;
  mirror: boolean;
  laps: number;
  items: boolean;
  itemSet: string;
  ai: number;
  /** Left before the finish (quit / restart). */
  quit: boolean;
  /** Seconds of racing. */
  dur: number;
  fps: number;
  tier: string;
  touchDevice: boolean;
  p: PlaytestPlayer[];
}

export interface PlaytestExport {
  game: 'calex-cart';
  format: number;
  build: string;
  races: PlaytestRecord[];
}

/** Drop the oldest races until the JSON fits in `maxChars`. Pure (tested). */
export function trimToBudget(races: PlaytestRecord[], maxChars = PLAYTEST_MAX_CHARS): PlaytestRecord[] {
  let out = races;
  let json = JSON.stringify(out);
  while (out.length > 0 && json.length > maxChars) {
    // drop ~10 % at a time so huge logs trim quickly, at least one
    const drop = Math.max(1, Math.floor(out.length / 10));
    out = out.slice(drop);
    json = JSON.stringify(out);
  }
  return out;
}

export class PlaytestStore {
  private races: PlaytestRecord[] | null = null;

  private load(): PlaytestRecord[] {
    if (this.races) return this.races;
    const raw = readKey(PLAYTEST_KEY);
    let list: PlaytestRecord[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) list = parsed as PlaytestRecord[];
      } catch {
        list = [];
      }
    }
    this.races = list;
    return list;
  }

  get count(): number {
    return this.load().length;
  }

  /** Characters used in storage (≈ bytes / 2). */
  get chars(): number {
    return this.races ? JSON.stringify(this.races).length : (readKey(PLAYTEST_KEY)?.length ?? 0);
  }

  all(): PlaytestRecord[] {
    return this.load().slice();
  }

  add(rec: Omit<PlaytestRecord, 'n'>): PlaytestRecord {
    const list = this.load();
    const n = (list.length ? list[list.length - 1].n : 0) + 1;
    const full: PlaytestRecord = { ...rec, n };
    this.races = trimToBudget([...list, full]);
    this.persist();
    return full;
  }

  /** Write the log; if storage is full, shrink the log (never anything else) and retry. */
  private persist(): boolean {
    let list = this.races ?? [];
    for (let attempt = 0; attempt < 6; attempt++) {
      if (writeKey(PLAYTEST_KEY, JSON.stringify(list))) {
        this.races = list;
        return true;
      }
      if (list.length === 0) break;
      list = list.slice(Math.max(1, Math.ceil(list.length / 2)));
    }
    this.races = list;
    return false;
  }

  /** Free the log's storage (used when a save needs the room). Returns chars freed. */
  shrink(fraction = 0.5): number {
    const before = this.chars;
    const list = this.load();
    if (!list.length) return 0;
    this.races = list.slice(Math.max(1, Math.ceil(list.length * fraction)));
    this.persist();
    return before - this.chars;
  }

  clear(): void {
    this.races = [];
    removeKey(PLAYTEST_KEY);
  }

  exportData(build: string): PlaytestExport {
    return { game: 'calex-cart', format: PLAYTEST_FORMAT, build, races: this.all() };
  }
}
