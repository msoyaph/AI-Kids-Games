/**
 * Three town slots, a backup and a kept broken copy, all under the game's own prefix:
 * - `slot1`–`slot3`: the towns (save/codec.ts, at most CAP characters each);
 * - `bak`: a copy of the slot saved last, written every few minutes of play and only after that
 *   slot's own save worked, so one of the two is always whole;
 * - `broken`: an unreadable save is copied here before anything else happens; if even that copy
 *   can't be made, the slot is never written over (the town plays from memory instead).
 * A full storage area keeps the last good save and says so once; play goes on.
 */
import { CAP, decodeTown, encodeTown, readSummary } from './codec';
import { read, remove, write } from './storage';
import type { Town } from '../sim/state';

export const SLOTS = [1, 2, 3] as const;
export type SlotNo = (typeof SLOTS)[number];
const key = (n: SlotNo) => `slot${n}`;
/** Seconds of play between backup copies. */
export const BACKUP_EVERY = 300;

export interface SlotCard { n: SlotNo; empty: boolean; name?: string; mode?: 'story' | 'creative'; chapter?: number; pop?: number; t?: number; unreadable?: boolean }

export function slotCards(): SlotCard[] {
  return SLOTS.map(n => {
    const text = read(key(n));
    if (!text) return { n, empty: true };
    const sum = readSummary(text);
    if (!sum) return { n, empty: false, unreadable: true };
    return { n, empty: false, name: sum.name, mode: sum.mode === 'c' ? 'creative' : 'story', chapter: sum.chapter, pop: sum.pop, t: sum.t };
  });
}

export interface Loaded {
  town: Town | null;
  status: 'ok' | 'repaired' | 'future' | 'broken' | 'empty';
  /** The slot couldn't be read and this is the backup from a few minutes before. */
  fromBackup?: boolean;
  /** For a broken save: was a copy kept safe? (If not, the slot must never be written.) */
  kept?: boolean;
}

export function loadSlot(n: SlotNo): Loaded {
  const text = read(key(n));
  if (!text) return { town: null, status: 'empty' };
  const r = decodeTown(text);
  if (r.status === 'ok' || r.status === 'repaired') return { town: r.town, status: r.status };
  if (r.status === 'future') return { town: null, status: 'future' };
  // unreadable: keep a copy first, then try the backup
  const kept = write('broken', text);
  const bak = readBackup();
  if (bak && bak.slot === n) {
    const b = decodeTown(bak.data);
    if (b.status === 'ok' || b.status === 'repaired') return { town: b.town, status: 'repaired', fromBackup: true, kept };
  }
  return { town: null, status: 'broken', kept };
}

/** The backup is the slot's number, a line break, then the save exactly as the slot holds it. */
function readBackup(): { slot: number; data: string } | null {
  const raw = read('bak');
  const m = raw ? /^([1-3])\n/.exec(raw) : null;
  return m ? { slot: Number(m[1]), data: raw!.slice(2) } : null;
}

export type SaveResult = 'ok' | 'full' | 'toobig';

/** Save a town into a slot (and now and then its backup). The old save stays if the write fails. */
export function saveSlot(n: SlotNo, town: Town, pop: number, backup = false): SaveResult {
  const text = encodeTown(town, pop);
  if (text.length > CAP) return 'toobig';
  if (!write(key(n), text)) return 'full';
  if (backup) write('bak', `${n}\n${text}`);
  return 'ok';
}

export function deleteSlot(n: SlotNo) {
  remove(key(n));
  const bak = readBackup();
  if (bak?.slot === n) remove('bak');
}
