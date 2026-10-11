import type { CupId, KartConfig, SpeedClass, UnlockRef } from '../data/types';
import { RACERS } from '../data/racers';
import { BODIES, DECALS, GLIDERS, PAINTS, WHEELS } from '../data/parts';
import { CUPS } from '../data/cups';
import { ARENAS } from '../data/arenas';
import type { QualitySetting } from '../render/quality';
import type { KeyBindings, KeyScheme, PadBindings } from '../input/bindings';
import { readKey, removeKey, writeKeyStatus, ourKeys, type WriteStatus } from './storage';
import { GhostData } from '../sim/ghost';
import type { AssistSetting } from '../tuning/balance';

export const SAVE_VERSION = 2;
export const SETTINGS_VERSION = 2;
export const SLOT_COUNT = 3;
const PREFIX = 'calexcart';

export type Medal = 'gold' | 'silver' | 'bronze';
export type ClassKey = SpeedClass | 'mirror';

export interface TrackRecord {
  bestTime: number;
  bestLap: number;
  racer: string;
  kart: KartConfig;
  hasGhost: boolean;
  beatStaff: boolean;
}

export interface SaveStats {
  races: number;
  wins: number;
  podiums: number;
  itemHits: number;
  tricks: number;
  driftSeconds: number;
  miniTurbos: number;
  battleWins: number;
  battlePops: number;
  shortcuts: number;
  boostPads: number;
  dodges: number;
  perfectStarts: number;
  timeTrials: number;
}

export interface SaveData {
  v: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  playSeconds: number;
  racer: string;
  kart: KartConfig;
  unlocks: {
    racers: string[];
    bodies: string[];
    wheels: string[];
    gliders: string[];
    paints: string[];
    decals: string[];
    cups: CupId[];
    classes: ClassKey[];
    arenas: string[];
  };
  /** Best trophy per cup and class: key `${cup}:${class}`. */
  trophies: Record<string, Medal>;
  records: Record<string, TrackRecord>;
  challenges: Record<string, { done: boolean; progress: number }>;
  stats: SaveStats;
  /** Unlocks earned but not yet celebrated in the UI. */
  newUnlocks: UnlockRef[];
}

export interface Settings {
  v: number;
  master: number;
  music: number;
  sfx: number;
  quality: QualitySetting;
  showFps: boolean;
  /** Steering assist: Auto = Light for touch, Off for keyboard/gamepad (BALANCE.assist.defaults). */
  assist: AssistSetting;
  autoAccel: boolean;
  touchSteer: 'buttons' | 'tilt';
  cameraDistance: number;
  splitMode: 'horizontal' | 'vertical';
  screenShake: boolean;
  /** Playtest mode: record anonymous per-race numbers on this device (`calexcart.playtest`). */
  playtest: boolean;
  /** Calmer view: no camera shake/kick, speed blur, speed lines, hit pauses or flashing (default: OS reduced motion). */
  reduceEffects: boolean;
  /** Gamepad rumble / phone vibration. */
  rumble: boolean;
  keyBindings?: Record<KeyScheme, KeyBindings>;
  padBindings?: PadBindings;
}

export function emptyStats(): SaveStats {
  return {
    races: 0,
    wins: 0,
    podiums: 0,
    itemHits: 0,
    tricks: 0,
    driftSeconds: 0,
    miniTurbos: 0,
    battleWins: 0,
    battlePops: 0,
    shortcuts: 0,
    boostPads: 0,
    dodges: 0,
    perfectStarts: 0,
    timeTrials: 0,
  };
}

export function newSave(name: string, now = Date.now()): SaveData {
  const first = RACERS.find((r) => r.unlocked) ?? RACERS[0];
  return {
    v: SAVE_VERSION,
    name: name.slice(0, 14) || 'Racer',
    createdAt: now,
    updatedAt: now,
    playSeconds: 0,
    racer: first.id,
    kart: { ...first.defaultKart, paint: PAINTS[0].id, decal: 'none' },
    unlocks: {
      racers: RACERS.filter((r) => r.unlocked).map((r) => r.id),
      bodies: BODIES.filter((b) => b.unlocked).map((b) => b.id),
      wheels: WHEELS.filter((b) => b.unlocked).map((b) => b.id),
      gliders: GLIDERS.filter((b) => b.unlocked).map((b) => b.id),
      paints: PAINTS.filter((b) => b.unlocked).map((b) => b.id),
      decals: DECALS.filter((b) => b.unlocked).map((b) => b.id),
      cups: CUPS.filter((c) => c.unlocked).map((c) => c.id),
      classes: ['rookie', 'pro'],
      arenas: ARENAS.filter((a) => a.unlocked).map((a) => a.id),
    },
    trophies: {},
    records: {},
    challenges: {},
    stats: emptyStats(),
    newUnlocks: [],
  };
}

function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function defaultSettings(touch = false): Settings {
  return {
    v: SETTINGS_VERSION,
    master: 0.8,
    music: 0.6,
    sfx: 0.8,
    quality: 'auto',
    showFps: false,
    assist: 'auto',
    autoAccel: touch,
    touchSteer: 'buttons',
    cameraDistance: 1,
    splitMode: 'horizontal',
    screenShake: true,
    playtest: false,
    reduceEffects: prefersReducedMotion(),
    rumble: true,
  };
}

// ---------------------------------------------------------------------------
// Migrations: each entry upgrades from version N to N+1. Never edit old entries; add new ones.
// ---------------------------------------------------------------------------
type Raw = Record<string, unknown>;

export const MIGRATIONS: Record<number, (d: Raw) => Raw> = {
  // v1 → v2: trophies were a list of "cup:class:medal" strings; challenges/stats/newUnlocks were added.
  1: (d) => {
    const trophies: Record<string, Medal> = {};
    const list = Array.isArray(d.trophies) ? (d.trophies as string[]) : [];
    for (const t of list) {
      const [cup, cls, medal] = t.split(':');
      if (cup && cls && (medal === 'gold' || medal === 'silver' || medal === 'bronze')) trophies[`${cup}:${cls}`] = medal;
    }
    return { ...d, v: 2, trophies, challenges: d.challenges ?? {}, stats: { ...emptyStats(), ...((d.stats as object) ?? {}) }, newUnlocks: [] };
  },
};

/** Bring any older save up to date and fill in missing fields with defaults (forward-compatible). */
export function migrate(raw: Raw): SaveData {
  let d: Raw = { ...raw };
  let v = typeof d.v === 'number' ? d.v : 1;
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) break;
    d = step(d);
    v = typeof d.v === 'number' ? d.v : v + 1;
  }
  const base = newSave(typeof d.name === 'string' ? d.name : 'Racer', typeof d.createdAt === 'number' ? d.createdAt : Date.now());
  const merged: SaveData = {
    ...base,
    ...(d as Partial<SaveData>),
    v: SAVE_VERSION,
    unlocks: { ...base.unlocks, ...((d.unlocks as Partial<SaveData['unlocks']>) ?? {}) },
    stats: { ...base.stats, ...((d.stats as Partial<SaveStats>) ?? {}) },
    kart: { ...base.kart, ...((d.kart as Partial<KartConfig>) ?? {}) },
    trophies: (d.trophies as Record<string, Medal>) ?? {},
    records: (d.records as Record<string, TrackRecord>) ?? {},
    challenges: (d.challenges as SaveData['challenges']) ?? {},
    newUnlocks: (d.newUnlocks as UnlockRef[]) ?? [],
  };
  // Newly added default-unlocked content always appears in old saves too.
  for (const key of Object.keys(base.unlocks) as Array<keyof SaveData['unlocks']>) {
    const set = new Set<string>(merged.unlocks[key] as string[]);
    for (const id of base.unlocks[key] as string[]) set.add(id);
    (merged.unlocks[key] as string[]) = [...set];
  }
  return merged;
}

/** Settings migrations: each entry upgrades from version N to N+1. Never edit old entries; add new ones. */
export const SETTINGS_MIGRATIONS: Record<number, (d: Raw) => Raw> = {
  // v1 → v2: on/off steering assist became Auto/Off/Light/Full. "On" keeps today's behaviour (Light);
  // "Off" was the old default for everyone, so it becomes Auto (Light on touch, Off on keyboard/gamepad).
  1: (d) => {
    const { steeringAssist, ...rest } = d as Raw & { steeringAssist?: unknown };
    return { ...rest, v: 2, assist: steeringAssist === true ? 'light' : 'auto' };
  },
};

export function migrateSettings(raw: Raw, touch = false): Settings {
  let d: Raw = { ...raw };
  let v = typeof d.v === 'number' ? d.v : 1;
  while (v < SETTINGS_VERSION) {
    const step = SETTINGS_MIGRATIONS[v];
    if (!step) break;
    d = step(d);
    v = typeof d.v === 'number' ? d.v : v + 1;
  }
  const out = { ...defaultSettings(touch), ...(d as Partial<Settings>), v: SETTINGS_VERSION };
  if (!['auto', 'off', 'light', 'full'].includes(out.assist)) out.assist = 'auto';
  return out;
}

export interface SlotSummary {
  slot: number;
  name: string;
  updatedAt: number;
  trophies: number;
  racer: string;
  playSeconds: number;
}

/** Slot-based save manager with debounced autosave. */
export class SaveManager {
  slot: number | null = null;
  data: SaveData | null = null;
  settings: Settings;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Set when the last write failed because storage is full. */
  lastWriteFailed = false;
  /** Called when a write can't be stored ('full') or storage is unavailable ('memory'). */
  onStorageProblem?: (kind: 'full' | 'memory') => void;
  /** Frees space from expendable data of OUR OWN (the playtest log). Returns true if anything was freed. */
  freeSpace?: () => boolean;

  constructor(touch = false) {
    this.settings = this.loadSettings(touch);
    this.migrateGhosts();
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flush());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.flush();
      });
    }
  }

  private key(slot: number): string {
    return `${PREFIX}.slot.${slot}`;
  }

  private loadSettings(touch: boolean): Settings {
    const raw = readKey(`${PREFIX}.settings`);
    if (!raw) return defaultSettings(touch);
    try {
      const parsed = JSON.parse(raw) as Raw;
      return migrateSettings(parsed, touch);
    } catch {
      return defaultSettings(touch);
    }
  }

  /**
   * The one write path for saves: `setItem` is atomic, so a failed write leaves the previous value intact.
   * When storage is full we first shrink our own playtest log and retry; other games' keys are never touched.
   */
  private write(key: string, value: string): WriteStatus {
    let st = writeKeyStatus(key, value);
    for (let i = 0; st === 'full' && i < 4 && this.freeSpace?.(); i++) st = writeKeyStatus(key, value);
    this.lastWriteFailed = st === 'full';
    if (st !== 'ok') this.onStorageProblem?.(st);
    return st;
  }

  /** Re-encode ghosts saved in the old (5× larger) format. Safe: a failed write keeps the old, still-readable ghost. */
  private migrateGhosts(): void {
    for (const k of ourKeys(`${PREFIX}.ghost.`)) {
      const v = readKey(k);
      if (!v || !GhostData.isLegacy(v)) continue;
      const enc = GhostData.reencode(v);
      if (enc) writeKeyStatus(k, enc);
    }
  }

  saveSettings(): void {
    this.write(`${PREFIX}.settings`, JSON.stringify(this.settings));
  }

  readSlot(slot: number): SaveData | null {
    const raw = readKey(this.key(slot));
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw) as Raw);
    } catch {
      return null;
    }
  }

  listSlots(): Array<SlotSummary | null> {
    const out: Array<SlotSummary | null> = [];
    for (let s = 1; s <= SLOT_COUNT; s++) {
      const d = this.readSlot(s);
      out.push(
        d
          ? { slot: s, name: d.name, updatedAt: d.updatedAt, trophies: Object.keys(d.trophies).length, racer: d.racer, playSeconds: d.playSeconds }
          : null,
      );
    }
    return out;
  }

  create(slot: number, name: string): SaveData {
    this.slot = slot;
    this.data = newSave(name);
    this.save();
    this.write(`${PREFIX}.lastSlot`, String(slot));
    return this.data;
  }

  load(slot: number): SaveData | null {
    const d = this.readSlot(slot);
    if (!d) return null;
    this.slot = slot;
    this.data = d;
    this.write(`${PREFIX}.lastSlot`, String(slot));
    return d;
  }

  lastSlot(): number | null {
    const v = Number(readKey(`${PREFIX}.lastSlot`));
    return v >= 1 && v <= SLOT_COUNT ? v : null;
  }

  deleteSlot(slot: number): void {
    removeKey(this.key(slot));
    for (const k of this.ghostKeys(slot)) removeKey(k);
    if (this.slot === slot) {
      this.slot = null;
      this.data = null;
    }
  }

  /** Mark data changed; it will be written within a second (autosave). */
  markDirty(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 800);
  }

  flush(): void {
    if (this.dirty) this.save();
  }

  save(): void {
    this.dirty = false;
    if (this.slot === null || !this.data) return;
    this.data.updatedAt = Date.now();
    this.write(this.key(this.slot), JSON.stringify(this.data));
  }

  // ---- ghosts are stored separately so slot JSON stays small
  private ghostKey(slot: number, track: string): string {
    return `${PREFIX}.ghost.${slot}.${track}`;
  }

  private ghostKeys(slot: number): string[] {
    return ourKeys(`${PREFIX}.ghost.${slot}.`);
  }

  saveGhost(track: string, encoded: string): boolean {
    if (this.slot === null) return false;
    return this.write(this.ghostKey(this.slot, track), encoded) !== 'full';
  }

  /** Remove this slot's ghost for a track (e.g. a new best time whose ghost couldn't be stored). */
  removeGhost(track: string): void {
    if (this.slot !== null) removeKey(this.ghostKey(this.slot, track));
  }

  loadGhost(track: string): string | null {
    if (this.slot === null) return null;
    return readKey(this.ghostKey(this.slot, track));
  }
}
