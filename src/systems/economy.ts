import { PART_BY_ID } from '../data/parts';
import { DECOR_BY_ID, OUTFIT_BY_ID } from '../data/shop';
import { STICKER_BY_ID } from '../data/stickers';
import type { PartSlot, Unlock } from '../data/types';
import type { SaveData } from './save/schema';
import type { GameState } from './state';

/**
 * Star-coin economy: what is unlocked, what you can afford, buying and equipping.
 * Pure logic on save data so it can be unit tested.
 */

export interface ShopEntry {
  id: string;
  name: string;
  price: number;
  unlock: Unlock;
  kind: 'part' | 'outfit' | 'decor';
}

export function shopEntry(id: string): ShopEntry | null {
  const p = PART_BY_ID[id];
  if (p) return { id, name: p.name, price: p.price, unlock: p.unlock, kind: 'part' };
  const o = OUTFIT_BY_ID[id];
  if (o) return { id, name: o.name, price: o.price, unlock: o.unlock, kind: 'outfit' };
  const d = DECOR_BY_ID[id];
  if (d) return { id, name: d.name, price: d.price, unlock: d.unlock, kind: 'decor' };
  return null;
}

export function isUnlocked(u: Unlock, save: SaveData): boolean {
  switch (u.kind) {
    case 'start':
      return true;
    case 'chapter':
      return save.chapter >= u.chapter;
    case 'mission':
      return save.missions[u.mission]?.status === 'done';
    case 'badge':
      return save.badges.includes(u.badge);
  }
}

/** Short kid-friendly text for why something is still locked. */
export function unlockHint(u: Unlock): string {
  switch (u.kind) {
    case 'chapter':
      return `Unlocks in Chapter ${u.chapter}`;
    case 'mission':
      return 'Unlocks with a mission';
    case 'badge':
      return 'Unlocks with a badge';
    default:
      return '';
  }
}

export type BuyCheck = { ok: true } | { ok: false; reason: 'owned' | 'locked' | 'coins' | 'unknown'; need?: number };

export function canBuy(save: SaveData, id: string): BuyCheck {
  const e = shopEntry(id);
  if (!e) return { ok: false, reason: 'unknown' };
  if (save.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (!isUnlocked(e.unlock, save)) return { ok: false, reason: 'locked' };
  if (save.coins < e.price) return { ok: false, reason: 'coins', need: e.price - save.coins };
  return { ok: true };
}

export function buy(state: GameState, id: string): BuyCheck {
  const check = canBuy(state.data, id);
  if (!check.ok) return check;
  const e = shopEntry(id)!;
  state.spend(e.price);
  state.data.owned.push(id);
  state.emit({ type: 'buy', item: id });
  return check;
}

/** Give an item for free (mission rewards). Returns false if already owned. */
export function grant(state: GameState, id: string): boolean {
  if (!shopEntry(id) || state.data.owned.includes(id)) return false;
  state.data.owned.push(id);
  state.markDirty();
  return true;
}

export function equipPart(state: GameState, id: string): boolean {
  const part = PART_BY_ID[id];
  if (!part || !state.data.owned.includes(id)) return false;
  const slot = part.slot as PartSlot;
  (state.data.loadout as unknown as Record<string, string>)[slot] = id;
  state.addUnique(state.data.stats.partsEquipped, id);
  state.emit({ type: 'equip', part: id });
  return true;
}

/** Put a sticker from your sticker book on the rocket (slot 0 or 1). null clears the slot. */
export function equipSticker(state: GameState, slot: 0 | 1, stickerId: string | null): boolean {
  const st = state.data.loadout.stickers;
  if (stickerId !== null) {
    if (!STICKER_BY_ID[stickerId] || !state.data.stickers.includes(stickerId)) return false;
    const other = st.indexOf(stickerId);
    if (other >= 0) st.splice(other, 1);
  }
  const next = st.slice(0, 2);
  if (stickerId === null) next.splice(slot, 1);
  else if (slot < next.length) next[slot] = stickerId;
  else next.push(stickerId);
  state.data.loadout.stickers = next.filter(Boolean).slice(0, 2);
  state.markDirty();
  return true;
}

export function equipOutfit(state: GameState, id: string): boolean {
  const o = OUTFIT_BY_ID[id];
  if (!o || (!state.data.owned.includes(id) && o.price > 0)) return false;
  state.data.profile.outfit = o.style;
  state.markDirty();
  return true;
}

export function toggleDecor(state: GameState, id: string): boolean {
  if (!DECOR_BY_ID[id] || !state.data.owned.includes(id)) return false;
  const list = state.data.decorPlaced;
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  state.markDirty();
  return true;
}
