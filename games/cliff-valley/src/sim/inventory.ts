/** Inventory helpers operating on slot arrays (player bag, chests). */
import { isTool, maxStack } from '../data/items';
import type { ItemStack } from './types';

export type Slots = (ItemStack | null)[];

/** Add items, stacking first; returns the number that didn't fit. */
export function addItem(inv: Slots, id: string, n = 1, q = 0): number {
  const cap = maxStack(id);
  for (let i = 0; i < inv.length && n > 0; i++) {
    const s = inv[i];
    if (s && s.id === id && s.q === q && s.n < cap) {
      const take = Math.min(n, cap - s.n);
      s.n += take;
      n -= take;
    }
  }
  for (let i = 0; i < inv.length && n > 0; i++) {
    if (!inv[i]) {
      const take = Math.min(n, cap);
      inv[i] = { id, n: take, q };
      n -= take;
    }
  }
  return n;
}

export function canFit(inv: Slots, id: string, n = 1, q = 0): boolean {
  const cap = maxStack(id);
  let room = 0;
  for (const s of inv) {
    if (!s) room += cap;
    else if (s.id === id && s.q === q) room += cap - s.n;
    if (room >= n) return true;
  }
  return room >= n;
}

export function count(inv: Slots, id: string, minQ = 0): number {
  let c = 0;
  for (const s of inv) if (s && s.id === id && s.q >= minQ) c += s.n;
  return c;
}

/** Remove n items (lowest quality first); returns false (and removes nothing) if not enough. */
export function remove(inv: Slots, id: string, n = 1, minQ = 0): boolean {
  if (count(inv, id, minQ) < n) return false;
  const order = inv
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s && x.s.id === id && x.s.q >= minQ)
    .sort((a, b) => a.s!.q - b.s!.q);
  for (const { s, i } of order) {
    if (n <= 0) break;
    const take = Math.min(n, s!.n);
    s!.n -= take;
    n -= take;
    if (s!.n <= 0) inv[i] = null;
  }
  return true;
}

/** Take n from a specific slot. */
export function takeFromSlot(inv: Slots, i: number, n = 1): ItemStack | null {
  const s = inv[i];
  if (!s) return null;
  const take = Math.min(n, s.n);
  s.n -= take;
  const out = { id: s.id, n: take, q: s.q };
  if (s.n <= 0) inv[i] = null;
  return out;
}

const CAT_ORDER = ['tool', 'seed', 'sapling', 'fertilizer', 'crop', 'fruit', 'flower', 'forage', 'animal', 'artisan', 'food', 'ingredient', 'fish', 'crab', 'bait', 'ore', 'bar', 'mineral', 'gem', 'geode', 'artifact', 'resource', 'machine', 'placeable', 'ammo', 'junk', 'special'];

/** Sort: keeps tools first, then by category, name and quality. Merges stacks. */
export function sortSlots(inv: Slots, catOf: (id: string) => string, keepFirst = 0): void {
  const head = inv.slice(0, keepFirst);
  const items = inv.slice(keepFirst).filter((s): s is ItemStack => !!s);
  const merged: ItemStack[] = [];
  for (const s of items) {
    const m = merged.find((x) => x.id === s.id && x.q === s.q && x.n < maxStack(s.id) && !isTool(s.id));
    if (m) {
      const room = maxStack(s.id) - m.n;
      const take = Math.min(room, s.n);
      m.n += take;
      if (s.n - take > 0) merged.push({ ...s, n: s.n - take });
    } else merged.push({ ...s });
  }
  merged.sort((a, b) => {
    const ca = CAT_ORDER.indexOf(catOf(a.id)), cb = CAT_ORDER.indexOf(catOf(b.id));
    if (ca !== cb) return ca - cb;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return b.q - a.q;
  });
  const out: Slots = [...head, ...merged];
  while (out.length < inv.length) out.push(null);
  for (let i = 0; i < inv.length; i++) inv[i] = out[i];
}
