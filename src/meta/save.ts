import { ACHIEVEMENTS } from '../config/achievements';
import { CHARACTERS } from '../config/characters';
import { isDifficultyId, MAX_TIER, type DifficultyId } from '../config/difficulty';
import { MAPS } from '../config/maps';
import { SHOP } from '../config/meta';
import { WEAPONS } from '../config/weapons';
import type { KeyValueStore } from '../core/storage';
import { defaultBindings, sanitizeBindings, type Bindings } from '../input/actions';

/** 'auto' picks per device (Tablet on touch devices, High elsewhere). */
export type Quality = 'auto' | 'low' | 'medium' | 'high' | 'tablet';
export type MouseMode = 'auto' | 'lock' | 'drag';

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  sensitivity: number;
  invertY: boolean;
  quality: Quality;
  showFps: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  mouseMode: MouseMode;
  /** Remapping and control options (kept when progress is reset). */
  controls: ControlSettings;
  access: AccessSettings;
  /** On-screen glass controls (phones, tablets, touchscreens). */
  touch: TouchSettings;
}

/** Glass touch controls: look, behaviour and the player's own layout. */
export interface TouchSettings {
  size: 's' | 'm' | 'l';
  /** 0.4–1 */
  opacity: number;
  /** Stick on the right, buttons on the left. */
  leftHanded: boolean;
  /** The stick stays put instead of appearing under the thumb. */
  fixedStick: boolean;
  /** The camera swings in behind Thea's movement. */
  autoCamera: boolean;
  /** Camera drag speed (separate from the mouse). */
  lookSensitivity: number;
  /** Short vibrations (Android). */
  haptics: boolean;
  /** Solid, high-contrast controls. */
  highContrast: boolean;
  /** Edit layout: moved / resized controls (right-handed; mirrored for left-handed). */
  layout: TouchLayout;
}

export type TouchControlId = 'stick' | 'jump' | 'slide' | 'pause';
export const TOUCH_CONTROL_IDS: readonly TouchControlId[] = ['stick', 'jump', 'slide', 'pause'];

/**
 * One moved control: anchored to the nearest screen corner (ax / ay: 0 = left / top,
 * 1 = right / bottom) with an offset from that corner of the safe area in units of the
 * screen's short side (so it survives resolution and rotation), plus a size scale.
 */
export interface TouchLayoutItem {
  ax: 0 | 1;
  ay: 0 | 1;
  dx: number;
  dy: number;
  /** 0.8–1.25 */
  s: number;
}

export type TouchLayout = Partial<Record<TouchControlId, TouchLayoutItem>>;

export function defaultTouch(): TouchSettings {
  return { size: 'm', opacity: 1, leftHanded: false, fixedStick: false, autoCamera: true, lookSensitivity: 1, haptics: true, highContrast: false, layout: {} };
}

export interface ControlSettings {
  bindings: Bindings;
  /** Slide key toggles instead of hold (switches off when the slide ends). */
  slideToggle: boolean;
  /** Hold jump to keep hopping (no bunny-hop speed bonus for automatic hops). */
  autoHop: boolean;
  /** Controller rumble. */
  rumble: boolean;
}

export type ReducedMotion = 'auto' | 'on' | 'off';

export interface AccessSettings {
  /** Auto follows the system "reduce motion" preference. */
  reducedMotion: ReducedMotion;
  /** Okabe-Ito warning / pickup colours and shape-coded gems. */
  colorblind: boolean;
  /** 125% interface size. */
  largeText: boolean;
  /** Solid, high-contrast HUD. */
  highContrast: boolean;
}

export function defaultControls(): ControlSettings {
  return { bindings: defaultBindings(), slideToggle: false, autoHop: false, rumble: true };
}

export function defaultAccess(): AccessSettings {
  return { reducedMotion: 'auto', colorblind: false, largeText: false, highContrast: false };
}

export interface LifetimeStats {
  runsPlayed: number;
  wins: number;
  totalKills: number;
  bestTime: number;
  bestTimeByChar: Record<string, number>;
  highestLevel: number;
  bossKills: Record<string, number>;
  evolutions: number;
  shrinesBroken: number;
  topSpeed: number;
  totalGold: number;
  playtime: number;
  /** Wins / best survival per map id. */
  winsByMap: Record<string, number>;
  bestTimeByMap: Record<string, number>;
  winsByDifficulty: Record<string, number>;
  /** Highest Hard tier won (-1 = never won on Hard; 0 = Hard without a tier). */
  bestHardTier: number;
  /** Boss kills on Normal or harder (some unlocks need them). */
  bossKillsNormalPlus: Record<string, number>;
  slideDistance: number;
  banishes: number;
  dailyRuns: number;
}

/** A finished daily run (best per UTC date is kept, newest 30 dates). */
export interface DailyRecord {
  date: string;
  map: string;
  hero: string;
  time: number;
  won: boolean;
  kills: number;
  level: number;
}

/**
 * Everything discovered so far. Unknown ids are kept (a newer build may know them), but
 * every list / map is capped so the save stays small.
 */
export interface Collection {
  /** Enemy id → lifetime defeats (discovered on the first). */
  kills: Record<string, number>;
  /** Weapon ids ever held (evolutions included). */
  weapons: string[];
  /** Passive item ids ever held. */
  passives: string[];
}

export interface SaveData {
  version: number;
  gold: number;
  shop: Record<string, number>;
  unlockedCharacters: string[];
  unlockedWeapons: string[];
  achievements: string[];
  stats: LifetimeStats;
  settings: Settings;
  lastCharacter: string;
  unlockedMaps: string[];
  lastMap: string;
  lastDifficulty: DifficultyId;
  lastTier: number;
  /** Highest Hard tier selectable (0 until Hard is won). */
  unlockedTier: number;
  daily: DailyRecord[];
  collection: Collection;
}

export const DAILY_KEEP = 30;
const COLLECTION_CAP = 300;

export const SAVE_KEY = 'theabonk.save';
/** Copy of the save as it was before the first upgrade to a newer format (written once). */
export const SAVE_BACKUP_KEY = 'theabonk.save.bak';
/**
 * 1: original release.
 * 2: maps (unlockedMaps, lastMap, per-map wins / best times), difficulty + Hard tiers, daily
 *    records, collection, skips / banishes / slide distance.
 * Older saves are migrated in sanitizeSave; nothing is ever dropped from a valid old save.
 */
export const SAVE_VERSION = 2;

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    sensitivity: 1,
    invertY: false,
    quality: 'auto',
    showFps: false,
    screenShake: true,
    damageNumbers: true,
    mouseMode: 'auto',
    controls: defaultControls(),
    access: defaultAccess(),
    touch: defaultTouch(),
  };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    gold: 0,
    shop: {},
    unlockedCharacters: CHARACTERS.filter((c) => !c.unlock).map((c) => c.id),
    unlockedWeapons: [],
    achievements: [],
    stats: {
      runsPlayed: 0,
      wins: 0,
      totalKills: 0,
      bestTime: 0,
      bestTimeByChar: {},
      highestLevel: 0,
      bossKills: {},
      evolutions: 0,
      shrinesBroken: 0,
      topSpeed: 0,
      totalGold: 0,
      playtime: 0,
      winsByMap: {},
      bestTimeByMap: {},
      winsByDifficulty: {},
      bestHardTier: -1,
      bossKillsNormalPlus: {},
      slideDistance: 0,
      banishes: 0,
      dailyRuns: 0,
    },
    settings: defaultSettings(),
    lastCharacter: 'thea',
    unlockedMaps: MAPS.filter((m) => !m.unlock).map((m) => m.id),
    lastMap: 'meadow',
    lastDifficulty: 'normal',
    lastTier: 0,
    unlockedTier: 0,
    daily: [],
    collection: { kills: {}, weapons: [], passives: [] },
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep the best record per date, newest DAILY_KEEP dates. */
export function trimDaily(list: DailyRecord[]): DailyRecord[] {
  const best = new Map<string, DailyRecord>();
  for (const r of list) {
    const cur = best.get(r.date);
    if (!cur || (r.won && !cur.won) || (r.won === cur.won && r.time > cur.time)) best.set(r.date, r);
  }
  return [...best.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, DAILY_KEEP);
}

/** Add every map whose unlock rule is met; returns the newly unlocked ids. */
export function refreshMapUnlocks(d: SaveData): string[] {
  const added: string[] = [];
  for (const m of MAPS) {
    if (d.unlockedMaps.includes(m.id) || !m.unlock) continue;
    if ((d.stats.winsByMap[m.unlock.winOn] ?? 0) > 0) {
      d.unlockedMaps.push(m.id);
      added.push(m.id);
    }
  }
  return added;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, def: number, min = -Infinity, max = Infinity): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);
const strList = (v: unknown, allowed: Set<string>): string[] => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && allowed.has(x)))) : []);
const numMap = (v: unknown, allowed: Set<string> | null, max = Infinity): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (allowed && !allowed.has(k)) continue;
    const n = num(val, 0, 0, max);
    if (n > 0) out[k] = n;
  }
  return out;
};

/**
 * Turn anything (old versions, corrupted JSON, hand-edited data) into a valid SaveData.
 * Unknown ids are dropped, numbers are clamped, missing fields get defaults.
 */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isObj(raw)) return d;
  const charIds = new Set(CHARACTERS.map((c) => c.id));
  const weaponIds = new Set(WEAPONS.map((w) => w.id));
  const achIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const mapIds = new Set(MAPS.map((m) => m.id));
  const shopMax = new Map(SHOP.map((s) => [s.id, s.maxRank]));
  const version = Math.floor(num(raw.version, 1, 1, 1e6));

  d.gold = Math.floor(num(raw.gold, 0, 0, 1e9));
  if (isObj(raw.shop)) {
    for (const [k, v] of Object.entries(raw.shop)) {
      const max = shopMax.get(k);
      if (max === undefined) continue;
      const r = Math.floor(num(v, 0, 0, max));
      if (r > 0) d.shop[k] = r;
    }
  }
  d.unlockedCharacters = Array.from(new Set([...d.unlockedCharacters, ...strList(raw.unlockedCharacters, charIds)]));
  d.unlockedWeapons = strList(raw.unlockedWeapons, weaponIds);
  d.achievements = strList(raw.achievements, achIds);

  const s = isObj(raw.stats) ? raw.stats : {};
  d.stats = {
    runsPlayed: Math.floor(num(s.runsPlayed, 0, 0)),
    wins: Math.floor(num(s.wins, 0, 0)),
    totalKills: Math.floor(num(s.totalKills, 0, 0)),
    bestTime: num(s.bestTime, 0, 0, 1e6),
    bestTimeByChar: numMap(s.bestTimeByChar, charIds, 1e6),
    highestLevel: Math.floor(num(s.highestLevel, 0, 0, 1e4)),
    bossKills: numMap(s.bossKills, null),
    evolutions: Math.floor(num(s.evolutions, 0, 0)),
    shrinesBroken: Math.floor(num(s.shrinesBroken, 0, 0)),
    topSpeed: num(s.topSpeed, 0, 0, 1000),
    totalGold: Math.floor(num(s.totalGold, 0, 0)),
    playtime: num(s.playtime, 0, 0),
    winsByMap: numMap(s.winsByMap, mapIds),
    bestTimeByMap: numMap(s.bestTimeByMap, mapIds, 1e6),
    winsByDifficulty: numMap(s.winsByDifficulty, new Set(['relaxed', 'normal', 'hard'])),
    bestHardTier: Math.floor(num(s.bestHardTier, -1, -1, MAX_TIER)),
    bossKillsNormalPlus: numMap(s.bossKillsNormalPlus, null),
    slideDistance: num(s.slideDistance, 0, 0, 1e9),
    banishes: Math.floor(num(s.banishes, 0, 0)),
    dailyRuns: Math.floor(num(s.dailyRuns, 0, 0)),
  };
  if (version < 2) {
    // v1 had one map and one difficulty: every win, best time and boss kill so far
    // happened on Gloam Meadow, on Normal
    if (d.stats.wins > 0) {
      d.stats.winsByMap.meadow = d.stats.wins;
      d.stats.winsByDifficulty.normal = d.stats.wins;
    }
    if (d.stats.bestTime > 0) d.stats.bestTimeByMap.meadow = d.stats.bestTime;
    d.stats.bossKillsNormalPlus = { ...d.stats.bossKills };
  }
  d.unlockedMaps = Array.from(new Set([...d.unlockedMaps, ...strList(raw.unlockedMaps, mapIds)]));
  refreshMapUnlocks(d);
  d.lastMap = typeof raw.lastMap === 'string' && d.unlockedMaps.includes(raw.lastMap) ? raw.lastMap : 'meadow';
  d.unlockedTier = Math.floor(num(raw.unlockedTier, 0, 0, MAX_TIER));
  d.lastDifficulty = isDifficultyId(raw.lastDifficulty) ? raw.lastDifficulty : 'normal';
  d.lastTier = Math.floor(num(raw.lastTier, 0, 0, d.unlockedTier));
  d.daily = trimDaily(
    (Array.isArray(raw.daily) ? raw.daily : []).filter(isObj).flatMap((r): DailyRecord[] =>
      typeof r.date === 'string' && DATE_RE.test(r.date)
        ? [{ date: r.date, map: typeof r.map === 'string' ? r.map.slice(0, 24) : 'meadow', hero: typeof r.hero === 'string' ? r.hero.slice(0, 24) : 'thea', time: num(r.time, 0, 0, 1e6), won: bool(r.won, false), kills: Math.floor(num(r.kills, 0, 0)), level: Math.floor(num(r.level, 0, 0, 1e4)) }]
        : [],
    ),
  );
  const col = isObj(raw.collection) ? raw.collection : {};
  // collection keeps ids this build doesn't know (forward compatible), within caps
  const anyIds = (v: unknown): string[] => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && x.length <= 32))).slice(0, COLLECTION_CAP) : []);
  const kills = numMap(col.kills, null, 1e12);
  d.collection = {
    kills: Object.fromEntries(Object.entries(kills).filter(([k]) => k.length <= 32).slice(0, COLLECTION_CAP)),
    weapons: anyIds(col.weapons),
    passives: anyIds(col.passives),
  };
  if (version < 2) {
    // bosses beaten before the bestiary existed are already discovered
    for (const [id, n] of Object.entries(d.stats.bossKills)) d.collection.kills[id] = Math.max(d.collection.kills[id] ?? 0, n);
  }

  const st = isObj(raw.settings) ? raw.settings : {};
  const def = defaultSettings();
  d.settings = {
    masterVolume: num(st.masterVolume, def.masterVolume, 0, 1),
    musicVolume: num(st.musicVolume, def.musicVolume, 0, 1),
    sfxVolume: num(st.sfxVolume, def.sfxVolume, 0, 1),
    sensitivity: num(st.sensitivity, def.sensitivity, 0.1, 4),
    invertY: bool(st.invertY, def.invertY),
    quality: st.quality === 'low' || st.quality === 'medium' || st.quality === 'high' || st.quality === 'tablet' || st.quality === 'auto' ? st.quality : def.quality,
    showFps: bool(st.showFps, def.showFps),
    screenShake: bool(st.screenShake, def.screenShake),
    damageNumbers: bool(st.damageNumbers, def.damageNumbers),
    mouseMode: st.mouseMode === 'lock' || st.mouseMode === 'drag' || st.mouseMode === 'auto' ? st.mouseMode : def.mouseMode,
    controls: sanitizeControls(st.controls),
    access: sanitizeAccess(st.access),
    touch: sanitizeTouch(st.touch),
  };
  d.lastCharacter = typeof raw.lastCharacter === 'string' && charIds.has(raw.lastCharacter) ? raw.lastCharacter : 'thea';
  d.version = SAVE_VERSION;
  return d;
}

function sanitizeControls(raw: unknown): ControlSettings {
  const d = defaultControls();
  if (!isObj(raw)) return d;
  return { bindings: sanitizeBindings(raw.bindings), slideToggle: bool(raw.slideToggle, d.slideToggle), autoHop: bool(raw.autoHop, d.autoHop), rumble: bool(raw.rumble, d.rumble) };
}

function sanitizeTouch(raw: unknown): TouchSettings {
  const d = defaultTouch();
  if (!isObj(raw)) return d;
  const layout: TouchLayout = {};
  if (isObj(raw.layout)) {
    for (const id of TOUCH_CONTROL_IDS) {
      const it = raw.layout[id];
      if (!isObj(it)) continue;
      layout[id] = {
        ax: it.ax === 1 ? 1 : 0,
        ay: it.ay === 1 ? 1 : 0,
        dx: num(it.dx, 0.2, 0, 2),
        dy: num(it.dy, 0.2, 0, 2),
        s: num(it.s, 1, 0.8, 1.25),
      };
    }
  }
  return {
    size: raw.size === 's' || raw.size === 'm' || raw.size === 'l' ? raw.size : d.size,
    opacity: num(raw.opacity, d.opacity, 0.4, 1),
    leftHanded: bool(raw.leftHanded, d.leftHanded),
    fixedStick: bool(raw.fixedStick, d.fixedStick),
    autoCamera: bool(raw.autoCamera, d.autoCamera),
    lookSensitivity: num(raw.lookSensitivity, d.lookSensitivity, 0.3, 3),
    haptics: bool(raw.haptics, d.haptics),
    highContrast: bool(raw.highContrast, d.highContrast),
    layout,
  };
}

function sanitizeAccess(raw: unknown): AccessSettings {
  const d = defaultAccess();
  if (!isObj(raw)) return d;
  const rm = raw.reducedMotion;
  return {
    reducedMotion: rm === 'on' || rm === 'off' || rm === 'auto' ? rm : d.reducedMotion,
    colorblind: bool(raw.colorblind, d.colorblind),
    largeText: bool(raw.largeText, d.largeText),
    highContrast: bool(raw.highContrast, d.highContrast),
  };
}

/** Loads/saves SaveData through a never-throwing KeyValueStore. */
export class SaveManager {
  data: SaveData;
  /** The raw older-format save, backed up just before the first write in the new format. */
  private pendingBackup: string | null = null;

  constructor(private store: KeyValueStore) {
    this.data = this.load();
  }

  get persistent(): boolean {
    return this.store.persistent;
  }


  load(): SaveData {
    try {
      const raw = this.store.get(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed: unknown = JSON.parse(raw);
      const v = typeof parsed === 'object' && parsed !== null ? (parsed as { version?: unknown }).version : undefined;
      if (typeof v !== 'number' || v < SAVE_VERSION) this.pendingBackup = raw;
      return sanitizeSave(parsed);
    } catch {
      return defaultSave();
    }
  }

  save(): boolean {
    try {
      if (this.pendingBackup !== null) {
        // keep the very first pre-upgrade copy if one already exists
        if (!this.store.get(SAVE_BACKUP_KEY)) this.store.set(SAVE_BACKUP_KEY, this.pendingBackup);
        this.pendingBackup = null;
      }
      return this.store.set(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      return false;
    }
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = settings;
    this.save();
  }
}
