import type { Game } from '../sim/Game';
import { safeStorage, type KV } from './save';
import { GAME_VERSION } from './version';

/**
 * Playtest mode (`?playtest=1` turns it on, `?playtest=0` off): records game
 * stats on this device so designers can tune the game. Nothing personal is
 * recorded (no names, ids, locations or free text), and nothing is ever sent
 * anywhere — players export the JSON themselves (download or copy).
 */
export const PLAYTEST_KEY = 'vanex-defense-playtest';
/** Stored JSON stays under this many characters (≈ 60 KB as UTF-16). */
export const PLAYTEST_MAX_CHARS = 30_000;
export const PLAYTEST_VERSION = 1;

export interface PlaytestRun {
  /** Game version. */
  build: string;
  /** Calendar day only (YYYY-MM-DD) — no clock time. */
  day: string;
  map: string;
  diff: string;
  mode: string;
  modifiers: string[];
  result: 'won' | 'lost' | 'quit';
  wave: number;
  /** null in endless. */
  totalWaves: number | null;
  lives: number;
  maxLives: number;
  /** Simulated seconds played. */
  gameSeconds: number;
  /** Wall-clock seconds (incl. pauses and fast-forward). */
  realSeconds: number;
  /** Share of unpaused real time at 1×, 2×, 3× speed. */
  speed: [number, number, number];
  pauses: number;
  /** Towers standing at the end + sold ones, by type. */
  towers: Record<string, number>;
  specs: string[];
  upgrades: number;
  sold: number;
  abilities: number;
  heroSpecials: number;
  hero: { id: string; level: number } | null;
  leaksByWave: number[];
  coinsEarned: number;
  coinsSpent: number;
  wavesSentEarly: number;
  fps: { avg: number; low1: number };
  quality: string;
  device: { w: number; h: number; dpr: number; touch: boolean; renderer: string };
  locale: string;
}

export interface PlaytestData {
  v: number;
  enabled: boolean;
  runs: PlaytestRun[];
}

const empty = (): PlaytestData => ({ v: PLAYTEST_VERSION, enabled: false, runs: [] });

export class PlaytestStore {
  data: PlaytestData;

  constructor(private readonly kv: KV | null = safeStorage()) {
    this.data = this.load();
  }

  private load(): PlaytestData {
    try {
      const raw = this.kv?.getItem(PLAYTEST_KEY);
      if (!raw) return empty();
      const d = JSON.parse(raw) as Partial<PlaytestData>;
      if (d?.v !== PLAYTEST_VERSION || !Array.isArray(d.runs)) return empty();
      return { v: PLAYTEST_VERSION, enabled: !!d.enabled, runs: d.runs };
    } catch {
      return empty();
    }
  }

  get enabled(): boolean {
    return this.data.enabled;
  }

  setEnabled(on: boolean): void {
    this.data.enabled = on;
    this.write();
  }

  add(run: PlaytestRun): void {
    this.data.runs.push(run);
    this.write();
  }

  clear(): void {
    this.data.runs = [];
    this.write();
  }

  /** The export players share (pretty JSON). */
  exportJson(): string {
    return JSON.stringify({ format: 'vanex-defense-playtest', v: PLAYTEST_VERSION, build: GAME_VERSION, runs: this.data.runs }, null, 1);
  }

  /** Oldest runs are dropped to stay under the size cap. */
  private write(): void {
    let json = JSON.stringify(this.data);
    while (json.length > PLAYTEST_MAX_CHARS && this.data.runs.length > 0) {
      this.data.runs.shift();
      json = JSON.stringify(this.data);
    }
    try {
      if (!this.data.enabled && this.data.runs.length === 0) this.kv?.removeItem(PLAYTEST_KEY);
      else this.kv?.setItem(PLAYTEST_KEY, json);
    } catch {
      /* storage full or blocked: keep it in memory */
    }
  }
}

/** Frame-time histogram (1 ms buckets) for average and 1 %-low FPS without storing every frame. */
export class FrameStats {
  private readonly buckets = new Uint32Array(251);
  frames = 0;
  seconds = 0;

  add(dt: number): void {
    this.frames++;
    this.seconds += dt;
    this.buckets[Math.min(250, Math.round(dt * 1000))]!++;
  }

  get avgFps(): number {
    return this.seconds > 0 ? this.frames / this.seconds : 0;
  }

  /** FPS of the slowest 1 % of frames. */
  get low1Fps(): number {
    const want = Math.max(1, Math.ceil(this.frames * 0.01));
    let n = 0;
    let sum = 0;
    for (let ms = 250; ms >= 0 && n < want; ms--) {
      const take = Math.min(this.buckets[ms]!, want - n);
      n += take;
      sum += take * Math.max(1, ms);
    }
    return n ? 1000 / (sum / n) : 0;
  }
}

/** What the recorder needs from the game screen. */
export interface RecordedScreen {
  readonly game: Game;
  readonly speed: number;
  readonly paused: boolean;
  readonly opts: { map: { id: string }; difficulty: string; mode: string; modifiers?: readonly string[] };
}

/** Collects the per-frame bits (speed, pauses, frame rate) during one run. */
export class PlaytestRecorder {
  readonly frames = new FrameStats();
  private speedTime: [number, number, number] = [0, 0, 0];
  private real = 0;
  private pauses = 0;
  private wasPaused = false;

  constructor(private readonly screen: RecordedScreen) {}

  frame(dt: number): void {
    const s = this.screen;
    this.real += dt;
    this.frames.add(dt);
    if (s.paused && !this.wasPaused) this.pauses++;
    this.wasPaused = s.paused;
    if (!s.paused && s.game.state === 'playing') this.speedTime[Math.min(2, Math.max(0, s.speed - 1))]! += dt;
  }

  finish(result: PlaytestRun['result'], env: { quality: string; renderer: string; locale: string }): PlaytestRun {
    const g = this.screen.game;
    const st = g.stats;
    const towers: Record<string, number> = {};
    for (const t of g.towers) towers[t.def.id] = (towers[t.def.id] ?? 0) + 1;
    for (const t of st.soldTowers) towers[t.type] = (towers[t.type] ?? 0) + 1;
    const active = this.speedTime[0] + this.speedTime[1] + this.speedTime[2] || 1;
    const r2 = (x: number): number => Math.round(x * 100) / 100;
    const now = new Date();
    const o = this.screen.opts;
    return {
      build: GAME_VERSION,
      day: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      map: o.map.id,
      diff: o.difficulty,
      mode: o.mode,
      modifiers: [...(o.modifiers ?? [])],
      result,
      wave: g.waveNum,
      totalWaves: Number.isFinite(g.totalWaves) ? g.totalWaves : null,
      lives: g.lives,
      maxLives: g.maxLives,
      gameSeconds: Math.round(g.time),
      realSeconds: Math.round(this.real),
      speed: [r2(this.speedTime[0] / active), r2(this.speedTime[1] / active), r2(this.speedTime[2] / active)],
      pauses: this.pauses,
      towers,
      specs: [...st.specsChosen],
      upgrades: st.upgrades,
      sold: st.sold,
      abilities: st.abilitiesUsed,
      heroSpecials: st.heroSpecials,
      hero: g.hero ? { id: g.hero.def.id, level: g.hero.level } : null,
      leaksByWave: st.leaksByWave.map((n) => n ?? 0),
      coinsEarned: st.coinsEarned,
      coinsSpent: st.coinsSpent,
      wavesSentEarly: st.wavesSentEarly,
      fps: { avg: Math.round(this.frames.avgFps), low1: Math.round(this.frames.low1Fps) },
      quality: env.quality,
      device: { w: innerWidth, h: innerHeight, dpr: Math.round(devicePixelRatio * 100) / 100, touch: navigator.maxTouchPoints > 0, renderer: env.renderer },
      locale: env.locale,
    };
  }
}
