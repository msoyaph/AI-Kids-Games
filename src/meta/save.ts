import { ACHIEVEMENTS } from '../config/achievements';
import { CHARACTERS } from '../config/characters';
import { SHOP } from '../config/meta';
import { WEAPONS } from '../config/weapons';
import type { KeyValueStore } from '../core/storage';

export type Quality = 'low' | 'medium' | 'high';
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
}

export const SAVE_KEY = 'theabonk.save';
export const SAVE_VERSION = 1;

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    sensitivity: 1,
    invertY: false,
    quality: 'high',
    showFps: false,
    screenShake: true,
    damageNumbers: true,
    mouseMode: 'auto',
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
    },
    settings: defaultSettings(),
    lastCharacter: 'thea',
  };
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
  const shopMax = new Map(SHOP.map((s) => [s.id, s.maxRank]));

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
  };

  const st = isObj(raw.settings) ? raw.settings : {};
  const def = defaultSettings();
  d.settings = {
    masterVolume: num(st.masterVolume, def.masterVolume, 0, 1),
    musicVolume: num(st.musicVolume, def.musicVolume, 0, 1),
    sfxVolume: num(st.sfxVolume, def.sfxVolume, 0, 1),
    sensitivity: num(st.sensitivity, def.sensitivity, 0.1, 4),
    invertY: bool(st.invertY, def.invertY),
    quality: st.quality === 'low' || st.quality === 'medium' || st.quality === 'high' ? st.quality : def.quality,
    showFps: bool(st.showFps, def.showFps),
    screenShake: bool(st.screenShake, def.screenShake),
    damageNumbers: bool(st.damageNumbers, def.damageNumbers),
    mouseMode: st.mouseMode === 'lock' || st.mouseMode === 'drag' || st.mouseMode === 'auto' ? st.mouseMode : def.mouseMode,
  };
  d.lastCharacter = typeof raw.lastCharacter === 'string' && charIds.has(raw.lastCharacter) ? raw.lastCharacter : 'thea';
  d.version = SAVE_VERSION;
  return d;
}

/** Loads/saves SaveData through a never-throwing KeyValueStore. */
export class SaveManager {
  data: SaveData;

  constructor(private store: KeyValueStore) {
    this.data = this.load();
  }

  get persistent(): boolean {
    return this.store.persistent;
  }


  load(): SaveData {
    try {
      const raw = this.store.get(SAVE_KEY);
      return raw ? sanitizeSave(JSON.parse(raw)) : defaultSave();
    } catch {
      return defaultSave();
    }
  }

  save(): boolean {
    try {
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
