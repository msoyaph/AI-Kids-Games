import type { Difficulty } from '../data/difficulty';
import type { LocaleSetting } from '../i18n';
import type { QualitySetting } from '../render/quality';

/** The one main storage key (shared site: every key must start with `vanex-defense-`). */
export const SAVE_KEY = 'vanex-defense-save';
export const SAVE_VERSION = 4;
/** One-time copy of the last pre-upgrade save (written when an older save is migrated). */
export const BACKUP_KEY = 'vanex-defense-save-backup';
/** Hard budget for everything this game stores (the site shares ~5 MB between five games). */
export const STORAGE_BUDGET_BYTES = 200_000;
/** Daily-challenge results kept (oldest are dropped). */
export const DAILY_KEEP = 60;
/** Workshop map slots. */
export const WORKSHOP_SLOTS = 10;

export interface Settings {
  music: number;
  sfx: number;
  quality: QualitySetting;
  shake: boolean;
  speed: 1 | 2 | 3;
  damageNumbers: boolean;
  rotateHintSeen: boolean;
  // v4
  /** 'auto' follows the browser language. */
  language: LocaleSetting;
  /** UI text size multiplier (1 = default). */
  textScale: number;
  highContrast: boolean;
  /** 'auto' follows the system's prefers-reduced-motion. */
  reducedMotion: 'auto' | 'on' | 'off';
  /** Remapped keys: action id → KeyboardEvent.code (only changed ones are stored). */
  hotkeys: Record<string, string>;
}

export interface MapProgress {
  /** Best stars per difficulty (each difficulty counts separately). */
  stars: Partial<Record<Difficulty, number>>;
  /** Challenge-modifier medals earned on this map (modifier ids). */
  medals?: string[];
}

/** A saved Workshop map: its share code holds the whole map (grid + generated name). */
export interface WorkshopSave {
  code: string;
  /** Created / last edited (ms). */
  updated: number;
  /** Passed the validator (incl. the bot test) since its last edit. */
  validated: boolean;
}

export interface Lifetime {
  kills: number;
  bossKills: number;
  towersBuilt: number;
  wins: number;
  /** Combo tower ids ever built. */
  combos: string[];
}

export interface SaveData {
  version: number;
  settings: Settings;
  maps: Record<string, MapProgress>;
  endlessBest: Record<string, number>;
  tutorialDone: boolean;
  /** Achievement id → unlock time (ms). */
  achievements: Record<string, number>;
  lifetime: Lifetime;
  /** Remembered menu choices. */
  lastDifficulty: Difficulty;
  // v4
  /** Research node id → rank bought with stars (refundable). */
  research: Record<string, number>;
  /** Selected commander hero id ('' = the starting hero). */
  hero: string;
  /** Daily challenge: date (YYYY-MM-DD) → best score. */
  daily: Record<string, number>;
  workshop: WorkshopSave[];
  /** Codex entries already opened (to mark new ones). */
  codexSeen: string[];
  /** One-time tips already shown (e.g. 'hero'). */
  hints: string[];
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: {
      music: 0.55,
      sfx: 0.8,
      quality: 'auto',
      shake: true,
      speed: 1,
      damageNumbers: true,
      rotateHintSeen: false,
      language: 'auto',
      textScale: 1,
      highContrast: false,
      reducedMotion: 'auto',
      hotkeys: {},
    },
    maps: {},
    endlessBest: {},
    tutorialDone: false,
    achievements: {},
    lifetime: { kills: 0, bossKills: 0, towersBuilt: 0, wins: 0, combos: [] },
    lastDifficulty: 'normal',
    research: {},
    hero: '',
    daily: {},
    workshop: [],
    codexSeen: [],
    hints: [],
  };
}

type AnySave = Record<string, unknown> & { version?: number };

/**
 * Migrations: each step upgrades version N → N+1. Never edit an old step;
 * add a new one and bump SAVE_VERSION.
 */
export const MIGRATIONS: Record<number, (d: AnySave) => AnySave> = {
  // v1 (early prototype): { version:1, settings:{music,sfx,quality,shake}, stars:{ mapId: n }, tutorialDone }
  1: (d) => {
    const stars = (d.stars as Record<string, number> | undefined) ?? {};
    const maps: Record<string, MapProgress> = {};
    for (const [id, n] of Object.entries(stars)) maps[id] = { stars: { normal: Number(n) || 0 } };
    const { stars: _old, ...rest } = d;
    void _old;
    return { ...rest, version: 2, maps, endlessBest: {}, achievements: {} };
  },
  // v2 → v3: lifetime stats, more settings, last difficulty
  2: (d) => {
    const s = (d.settings as Partial<Settings> | undefined) ?? {};
    return {
      ...d,
      version: 3,
      settings: { ...defaultSave().settings, ...s },
      lifetime: (d.lifetime as Lifetime | undefined) ?? defaultSave().lifetime,
      lastDifficulty: (d.lastDifficulty as Difficulty | undefined) ?? 'normal',
    };
  },
  // v3 → v4 (the 10–14 upgrade): new settings + research, hero, daily, workshop, codex.
  // Progress (stars, unlocks, badges, records, lifetime stats) carries over untouched.
  3: (d) => {
    const s = (d.settings as Record<string, unknown> | undefined) ?? {};
    return {
      ...d,
      version: 4,
      settings: { ...s, language: 'auto', textScale: 1, highContrast: false, reducedMotion: 'auto', hotkeys: {} },
      research: {},
      hero: '',
      daily: {},
      workshop: [],
      codexSeen: [],
      hints: [],
    };
  },
};

/** Bring any older save up to date. Unknown/broken data falls back to defaults. */
export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return defaultSave();
  let d = raw as AnySave;
  let v = typeof d.version === 'number' ? d.version : 1;
  if (v > SAVE_VERSION) return defaultSave(); // from a newer build: don't guess
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) return defaultSave();
    d = step(d);
    v = d.version ?? v + 1;
  }
  const def = defaultSave();
  const out = d as unknown as SaveData;
  // fill any holes so older/corrupt fields never crash the game
  return {
    ...def,
    ...out,
    lifetime: { ...def.lifetime, ...(out.lifetime ?? {}) },
    maps: out.maps ?? {},
    endlessBest: out.endlessBest ?? {},
    achievements: out.achievements ?? {},
    settings: { ...def.settings, ...(out.settings ?? {}), hotkeys: { ...(out.settings?.hotkeys ?? {}) } },
    research: obj(out.research),
    daily: obj(out.daily),
    workshop: Array.isArray(out.workshop) ? out.workshop.slice(0, WORKSHOP_SLOTS) : [],
    codexSeen: Array.isArray(out.codexSeen) ? out.codexSeen : [],
    hints: Array.isArray(out.hints) ? out.hints : [],
    hero: typeof out.hero === 'string' ? out.hero : '',
  };
}

function obj<T>(v: Record<string, T> | undefined): Record<string, T> {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/** Keep the save inside its budget: trims old daily results first. */
export function trimSave(d: SaveData): void {
  const days = Object.keys(d.daily).sort();
  for (let i = 0; i < days.length - DAILY_KEEP; i++) delete d.daily[days[i]!];
  d.workshop.length = Math.min(d.workshop.length, WORKSHOP_SLOTS);
}

/** Minimal storage interface so tests can inject a fake. */
export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function safeStorage(): KV | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__vanex_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/**
 * Persistent save with an in-memory fallback. Every storage call is wrapped
 * in try/catch: private mode, sandboxed iframes and full disks must never
 * crash the game.
 */
export class SaveStore {
  data: SaveData;
  readonly persistent: boolean;
  private storage: KV | null;
  private timer = 0;

  constructor(storage: KV | null = safeStorage()) {
    this.storage = storage;
    this.persistent = !!storage;
    this.data = this.load();
  }

  private load(): SaveData {
    if (!this.storage) return defaultSave();
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as { version?: unknown };
      if (typeof parsed?.version === 'number' && parsed.version < SAVE_VERSION && !this.storage.getItem(BACKUP_KEY)) {
        try {
          this.storage.setItem(BACKUP_KEY, raw);
        } catch {
          /* no room for a backup — the migration still runs */
        }
      }
      return migrate(parsed);
    } catch {
      return defaultSave();
    }
  }

  /** Write now. */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = 0;
    if (!this.storage) return;
    try {
      trimSave(this.data);
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* quota or blocked — keep playing from memory */
    }
  }

  /** Debounced write (settings sliders etc.). */
  save(): void {
    if (!this.storage) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 250) as unknown as number;
  }

  reset(): void {
    const keepSettings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = { ...keepSettings };
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.flush();
  }

  // ---- progress helpers ----

  stars(mapId: string, diff?: Difficulty): number {
    const m = this.data.maps[mapId];
    if (!m) return 0;
    if (diff) return m.stars[diff] ?? 0;
    return Math.max(0, ...Object.values(m.stars).map((n) => n ?? 0));
  }

  totalStars(): number {
    let n = 0;
    for (const id of Object.keys(this.data.maps)) n += this.stars(id);
    return n;
  }

  recordWin(mapId: string, diff: Difficulty, stars: number): boolean {
    const m = (this.data.maps[mapId] ??= { stars: {} });
    const prev = m.stars[diff] ?? 0;
    if (stars > prev) m.stars[diff] = stars;
    this.flush();
    return stars > prev;
  }

  isCompleted(mapId: string): boolean {
    return this.stars(mapId) > 0;
  }
}
