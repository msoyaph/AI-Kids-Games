// Save slots (3), versioned save files with a migration chain, a compact on-disk format,
// and storage that never throws (and never corrupts an existing save when the quota is full).
import { SAVE_VERSION, type Appearance, type GameState, type TileObj } from './state';

export const SLOT_COUNT = 3;
export const PREFIX = 'lightcrossing.';
/** Storage budget per save slot (bytes, UTF-16 code units stored by localStorage ≈ string length). */
export const SLOT_BUDGET = 300 * 1024;
/** On-disk format: 1 = plain JSON state, 2 = compact world objects. */
export const SAVE_FORMAT = 2;

export type WriteResult = 'ok' | 'memory' | 'quota' | 'error';

/** Keys that hold optional data we may drop to make room for a real save. */
const EXPENDABLE = [/^playtest\./];

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
      const k = PREFIX + '__probe';
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
    return this.put(key, value) === 'ok';
  }

  /**
   * Write a value. localStorage.setItem is atomic, so a failed write leaves the previous value
   * untouched. Quota errors free expendable keys (playtest logs) and retry once; the write is
   * verified by reading it back.
   */
  put(key: string, value: string): WriteResult {
    this.mem.set(key, value);
    if (!this.backing) return 'memory';
    const attempt = (): WriteResult => {
      try {
        this.backing!.setItem(PREFIX + key, value);
        return this.backing!.getItem(PREFIX + key) === value ? 'ok' : 'error';
      } catch (e) {
        return isQuotaError(e) ? 'quota' : 'error';
      }
    };
    let r = attempt();
    if (r === 'quota' && this.freeExpendable(key) > 0) r = attempt();
    return r;
  }

  /** Remove optional data (never save slots or settings). Returns how many keys were removed. */
  freeExpendable(except = ''): number {
    let n = 0;
    for (const k of this.keys()) {
      if (k === except || !EXPENDABLE.some((re) => re.test(k))) continue;
      this.remove(k);
      n++;
    }
    return n;
  }

  /** Our own keys (without the prefix). */
  keys(): string[] {
    const out = new Set<string>(this.mem.keys());
    try {
      if (this.backing)
        for (let i = 0; i < this.backing.length; i++) {
          const k = this.backing.key(i);
          if (k && k.startsWith(PREFIX)) out.add(k.slice(PREFIX.length));
        }
    } catch {
      /* ignore */
    }
    return [...out];
  }

  /** Approximate bytes used by our keys (localStorage stores UTF-16; we report string length). */
  usage(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of this.keys()) out[k] = (this.get(k) ?? '').length + PREFIX.length + k.length;
    return out;
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
  /** on-disk format (absent = 1) */
  format?: number;
  meta: SaveMeta;
  state: GameState;
}

export function isQuotaError(e: unknown): boolean {
  const err = e as { name?: string; code?: number } | null;
  return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);
}

// ---------------------------------------------------------------- compact world objects
// world.objects is stored as { t: [strings], o: records } where records are
// "<tile delta base36>:<kind code>[,<field>=<value>...]" joined by ';' (tiles ascending).
// Numbers are written plain; strings are "'" + their index (base36) in the string table, so
// repeated item ids cost a few bytes and any future field round-trips without a schema.
export interface CompactObjects {
  t: string[];
  o: string;
}
const KIND_CODE: Record<string, string> = {
  tree: 't', pine: 'p', palm: 'm', fruitTree: 'f', sapling: 's', rock: 'r', flower: 'w', weed: 'e', item: 'i', dig: 'd', hole: 'h', deco: 'c',
};
const CODE_KIND: Record<string, string> = Object.fromEntries(Object.entries(KIND_CODE).map(([k, v]) => [v, k]));
/** Short names for multi-letter fields (single letters are stored as-is). */
const FIELD_CODE: Record<string, string> = { item: 'i', tag: 't', pd: 'p', nx: 'x', nz: 'z' };
const CODE_FIELD: Record<string, string> = Object.fromEntries(Object.entries(FIELD_CODE).map(([k, v]) => [v, k]));
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

export function encodeObjects(objs: Record<number, TileObj>): CompactObjects {
  const table: string[] = [];
  const index = new Map<string, number>();
  const str = (v: string) => {
    let n = index.get(v);
    if (n === undefined) {
      n = table.length;
      table.push(v);
      index.set(v, n);
    }
    return "'" + n.toString(36);
  };
  const parts: string[] = [];
  let prev = 0;
  for (const tile of Object.keys(objs).map(Number).sort((a, b) => a - b)) {
    const o = objs[tile]! as unknown as Record<string, unknown>;
    const kind = String(o.k);
    let rec = `${(tile - prev).toString(36)}:${KIND_CODE[kind] ?? str(kind)}`;
    prev = tile;
    for (const f in o) {
      const v = o[f];
      if (f === 'k' || v === undefined || v === null || !SAFE_NAME.test(f)) continue;
      rec += `,${FIELD_CODE[f] ?? f}=${typeof v === 'number' ? v : str(String(v))}`;
    }
    parts.push(rec);
  }
  return { t: table, o: parts.join(';') };
}

export function decodeObjects(c: CompactObjects): Record<number, TileObj> {
  const out: Record<number, TileObj> = {};
  if (!c || !c.o) return out;
  const val = (raw: string): string | number => (raw[0] === "'" ? c.t[parseInt(raw.slice(1), 36)]! : Number(raw));
  let tile = 0;
  for (const rec of c.o.split(';')) {
    const colon = rec.indexOf(':');
    if (colon < 0) continue;
    tile += parseInt(rec.slice(0, colon), 36);
    const fields = rec.slice(colon + 1).split(',');
    const code = fields[0]!;
    const o: Record<string, unknown> = { k: code[0] === "'" ? val(code) : (CODE_KIND[code] ?? code) };
    for (let i = 1; i < fields.length; i++) {
      const eq = fields[i]!.indexOf('=');
      if (eq <= 0) continue;
      const name = fields[i]!.slice(0, eq);
      o[CODE_FIELD[name] ?? name] = val(fields[i]!.slice(eq + 1));
    }
    out[tile] = o as unknown as TileObj;
  }
  return out;
}

/** Serialize a state for storage (compact format). */
export function encodeSave(state: GameState, savedAt = Date.now()): string {
  const { world, ...rest } = state;
  const compactState = { ...rest, world: { ...world, objects: encodeObjects(world.objects) } };
  return JSON.stringify({ version: SAVE_VERSION, format: SAVE_FORMAT, savedAt, meta: { ...metaOf(state), savedAt }, state: compactState });
}

/** Parse a stored save (any format, any known version) into a current GameState. */
export function decodeSave(raw: string): GameState {
  const file = JSON.parse(raw);
  // Accept wrapped files and bare legacy states.
  const st = file && file.state ? { ...file.state, version: file.state.version ?? file.version } : file;
  const objs = st?.world?.objects;
  if (objs && typeof objs.o === 'string' && Array.isArray(objs.t)) st.world = { ...st.world, objects: decodeObjects(objs) };
  return migrate(st);
}

/** Bytes a state would take in its slot. */
export function measureSave(state: GameState): number {
  return encodeSave(state, 0).length;
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
  // v2 → v3 (upgrade release): new fields are added by fillDefaults; nothing existing changes shape.
  2: (s) => ({ ...s, version: 3 }),
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
  s.events ??= { best: {}, medals: {}, active: null };
  s.events.best ??= {};
  s.events.medals ??= {};
  s.events.active ??= null;
  s.challenges ??= { day: 0, list: [], completedTotal: 0 };
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

  /** Size (chars) of the last successful write per slot. */
  lastSize: Record<number, number> = {};

  write(slot: number, state: GameState): boolean {
    return this.writeResult(slot, state) === 'ok';
  }

  writeResult(slot: number, state: GameState): WriteResult {
    let data: string;
    try {
      data = encodeSave(state);
    } catch {
      return 'error';
    }
    const r = this.storage.put(this.key(slot), data);
    if (r === 'ok' || r === 'memory') this.lastSize[slot] = data.length;
    return r;
  }

  read(slot: number): { ok: true; state: GameState } | { ok: false; error: string } {
    const raw = this.storage.get(this.key(slot));
    if (!raw) return { ok: false, error: 'empty' };
    try {
      return { ok: true, state: decodeSave(raw) };
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
      return file?.player || file?.state?.player ? metaOf(decodeSave(raw)) : null;
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

  saveSettings(s: object): WriteResult {
    return this.storage.put('settings', JSON.stringify(s));
  }
}
