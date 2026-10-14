/**
 * Safe, namespaced localStorage for Agentmon. The game shares the website's origin with other
 * games, so every key starts with `agentmon.` and nothing else is ever read, written or removed
 * (no localStorage.clear(), no looping over other keys). Every call is wrapped in try/catch: when
 * storage is blocked the game keeps working from memory, and when it is full the old save stays
 * exactly as it was and the player gets a friendly note.
 *
 * Keys: agentmon.slot1–3, agentmon.slotN.bak (a copy made just before migrating an old save),
 * agentmon.settings, agentmon.records, and the probe agentmon.__probe (written and removed at once).
 */
import type { CodecTables } from '../core/save/codec';
import { deserialize, serialize, SAVE_VERSION, type LoadResult } from '../core/save/save';
import type { GameState } from '../core/state';

export const PREFIX = 'agentmon.';
export const SLOTS = [1, 2, 3] as const;
/** The brief's hard limit per slot. */
export const SLOT_LIMIT = 300 * 1024;

export type WriteResult = 'ok' | 'full' | 'blocked' | 'too-big';

const memory = new Map<string, string>();
let backing: Storage | null | undefined;

function storage(): Storage | null {
  if (backing !== undefined) return backing;
  try {
    const s = globalThis.localStorage;
    const probe = `${PREFIX}__probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    backing = s;
  } catch {
    backing = null;
  }
  return backing;
}

/** True when progress is kept between visits (false: memory only, for this visit). */
export const persistent = () => storage() !== null;

export function readKey(name: string): string | null {
  const k = PREFIX + name;
  try {
    const s = storage();
    return s ? s.getItem(k) : memory.get(k) ?? null;
  } catch {
    return memory.get(k) ?? null;
  }
}

/** Writes one key. On failure the previous value is untouched (setItem is all-or-nothing). */
export function writeKey(name: string, value: string): WriteResult {
  const k = PREFIX + name;
  const s = storage();
  if (!s) { memory.set(k, value); return 'blocked'; }
  try {
    s.setItem(k, value);
    return 'ok';
  } catch {
    return 'full';
  }
}

export function removeKey(name: string): void {
  const k = PREFIX + name;
  memory.delete(k);
  try { storage()?.removeItem(k); } catch { /* blocked: nothing stored anyway */ }
}

/** Bytes a key's value takes (UTF-16 in most browsers, counted as 2 per character). */
export const storedBytes = (value: string) => value.length * 2;

export function saveSlot(t: CodecTables, state: GameState): { result: WriteResult; bytes: number } {
  const text = serialize(t, state);
  const bytes = storedBytes(text);
  if (bytes > SLOT_LIMIT) return { result: 'too-big', bytes };
  return { result: writeKey(`slot${state.slot}`, text), bytes };
}

export type SlotLoad =
  | { kind: 'empty' }
  | { kind: 'ok'; load: LoadResult }
  | { kind: 'newer' }
  | { kind: 'unreadable' };

/** Loads a slot. An older save is copied to slotN.bak before it is migrated. */
export function loadSlot(t: CodecTables, slot: number): SlotLoad {
  const text = readKey(`slot${slot}`);
  if (!text) return { kind: 'empty' };
  const r = deserialize(t, text, slot);
  if (!r.ok) return { kind: r.reason };
  if (r.migratedFrom !== undefined && r.migratedFrom < SAVE_VERSION) writeKey(`slot${slot}.bak`, text);
  return { kind: 'ok', load: r };
}

export function deleteSlot(slot: number): void {
  removeKey(`slot${slot}`);
  removeKey(`slot${slot}.bak`);
}

export function readJson<T>(name: string): T | null {
  const text = readKey(name);
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

export const writeJson = (name: string, value: unknown) => writeKey(name, JSON.stringify(value));

/** Test helper: forget the cached storage check (tests swap globalThis.localStorage). */
export function resetStoreForTests() {
  backing = undefined;
  memory.clear();
}
