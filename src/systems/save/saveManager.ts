import { migrate } from './migrations';
import type { SaveData } from './schema';
import { readJson, removeKey, writeKey } from './storage';

/** Three save slots in localStorage (or memory when storage is blocked). */
export const SLOT_COUNT = 3;
const KEY = (slot: number) => `spacesky.slot.${slot}`;

export interface SlotSummary {
  slot: number;
  empty: boolean;
  data: SaveData | null;
}

export function loadSlot(slot: number): SaveData | null {
  const raw = readJson<unknown>(KEY(slot));
  if (!raw) return null;
  try {
    const data = migrate(raw);
    if (data) data.slot = slot;
    return data;
  } catch {
    return null;
  }
}

export function writeSlot(data: SaveData): boolean {
  data.updatedAt = Date.now();
  try {
    return writeKey(KEY(data.slot), JSON.stringify(data));
  } catch {
    return false;
  }
}

export function deleteSlot(slot: number): void {
  removeKey(KEY(slot));
}

export function listSlots(): SlotSummary[] {
  const out: SlotSummary[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const data = loadSlot(i);
    out.push({ slot: i, empty: !data, data });
  }
  return out;
}
