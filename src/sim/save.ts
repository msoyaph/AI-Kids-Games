// Save slots (3), versioned save files with a migration chain, and storage that never throws.
import { SAVE_VERSION, type Appearance, type GameState } from './state';

export const SLOT_COUNT = 3;
const PREFIX = 'lightcrossing.';

/** localStorage wrapper: every access is guarded; falls back to memory (e.g. sandboxed iframes). */
export class SafeStorage {
  private mem = new Map<string, string>();
  readonly persistent: boolean;
  constructor(private backing: Storage | null = SafeStorage.detect()) {
    this.persistent = !!this.backing;
  }
  static detect(): Storage | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const k = '__lc_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return localStorage;
    } catch {
      return null;
    }
  }
  get(key: string): string | null {
    try {
      if (this.backing) return this.backing.getItem(PREFIX + key);
    } catch {
      /* fall through */
    }
    return this.mem.get(key) ?? null;
  }
  set(key: string, value: string): boolean {
    this.mem.set(key, value);
    try {
      if (this.backing) {
        this.backing.setItem(PREFIX + key, value);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
  remove(key: string): void {
    this.mem.delete(key);
    try {
      this.backing?.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}

export interface SaveMeta {
  name: string;
  day: number;
  playSeconds: number;
  chapter: number;
  glints: number;
  finished: boolean;
  savedAt: number;
  look: Appearance;
}

export interface SaveFile {
  version: number;
  savedAt: number;
  meta: SaveMeta;
  state: GameState;
}

/**
 * Migrations keyed by the version they upgrade FROM. Each takes the raw state object of
 * version v and returns a state object of version v+1.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MIGRATIONS: Record<number, (s: any) => any> = {
  // v1 (early prototype): single `money` field, no lumens/tips/events, flat `quests.done` only.
  1: (s) => {
    const player = { ...s.player };
    player.glints = player.money ?? 0;
    player.lumens = 0;
    delete player.money;
    if (!player.invSize) player.invSize = player.inv?.length ?? 20;
    return {
      ...s,
      version: 2,
      player,
      tips: s.tips ?? {},
      events: s.events ?? { best: {}, medals: {}, active: null },
      challenges: s.challenges ?? { day: 0, list: [], completedTotal: 0 },
      quests: {
        active: s.quests?.active ?? {},
        done: s.quests?.done ?? [],
        tracked: s.quests?.tracked ?? '',
        chapter: s.quests?.chapter ?? 1,
        finished: s.quests?.finished ?? false,
        creditsSeen: s.quests?.creditsSeen ?? false,
      },
    };
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Save data is not an object');
  let s = raw;
  let v: number = typeof s.version === 'number' ? s.version : 1;
  if (v > SAVE_VERSION) throw new Error(`Save is from a newer version (${v})`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No migration from version ${v}`);
    s = m(s);
    v += 1;
    s.version = v;
  }
  return fillDefaults(s as GameState);
}

/** Defensive defaults for fields that may be missing in hand-edited or partial saves. */
function fillDefaults(s: GameState): GameState {
  s.stats ??= {};
  s.flags ??= {};
  s.tips ??= {};
  s.achievements ??= {};
  s.recipes ??= [];
  s.villagers ??= {};
  s.catalog ??= { seen: {}, owned: {} };
  s.museum ??= { donated: [] };
  s.shop ??= { day: 0, sold: [] };
  s.home.storage ??= [];
  s.home.furniture ??= [];
  s.world.objects ??= {};
  s.world.structures ??= [];
  while (s.player.inv.length < s.player.invSize) s.player.inv.push(null);
  return s;
}

export function metaOf(s: GameState): SaveMeta {
  return {
    name: s.player.name,
    day: s.clock.day,
    playSeconds: s.playSeconds,
    chapter: s.quests.chapter,
    glints: s.player.glints,
    finished: s.quests.finished,
    savedAt: Date.now(),
    look: s.player.look,
  };
}

export class SaveManager {
  constructor(readonly storage = new SafeStorage()) {}

  key(slot: number): string {
    return `slot${slot}`;
  }

  write(slot: number, state: GameState): boolean {
    const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), meta: metaOf(state), state };
    try {
      return this.storage.set(this.key(slot), JSON.stringify(file));
    } catch {
      return false;
    }
  }

  read(slot: number): { ok: true; state: GameState } | { ok: false; error: string } {
    const raw = this.storage.get(this.key(slot));
    if (!raw) return { ok: false, error: 'empty' };
    try {
      const file = JSON.parse(raw);
      // Accept both wrapped files and bare legacy states.
      const state = file && file.state ? { ...file.state, version: file.state.version ?? file.version } : file;
      return { ok: true, state: migrate(state) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  meta(slot: number): SaveMeta | null {
    const raw = this.storage.get(this.key(slot));
    if (!raw) return null;
    try {
      const file = JSON.parse(raw);
      if (file?.meta) return file.meta as SaveMeta;
      const st = file?.state ?? file;
      return st?.player ? metaOf(migrate(st)) : null;
    } catch {
      return null;
    }
  }

  list(): (SaveMeta | null)[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => this.meta(i));
  }

  remove(slot: number): void {
    this.storage.remove(this.key(slot));
  }

  /** Global settings (not per save). */
  loadSettings<T extends object>(defaults: T): T {
    const raw = this.storage.get('settings');
    if (!raw) return { ...defaults };
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return { ...defaults };
    }
  }

  saveSettings(s: object): void {
    this.storage.set('settings', JSON.stringify(s));
  }
}
