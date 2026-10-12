// Pocket inventory (20 -> 40 slots) with stacking, tool durability and overflow to home storage.
import { item } from '../data/registry';
import type { Game } from './game';
import type { InvSlot } from './state';

export const INV_MAX = 40;

export function slotCapacity(id: string): number {
  return Math.max(1, item(id).stack);
}

/** Simulate adding: how many of `qty` would fit in the pockets. */
export function roomFor(g: Game, id: string, qty = 1): number {
  const p = g.state.player;
  const cap = slotCapacity(id);
  let room = 0;
  for (let i = 0; i < p.invSize; i++) {
    const s = p.inv[i];
    if (!s) room += cap;
    else if (s.id === id && s.dur === undefined && cap > 1) room += Math.max(0, cap - s.qty);
    if (room >= qty) return qty;
  }
  return room;
}

/**
 * Add items to pockets. Returns how many did NOT fit.
 * Tools are created with full durability unless `dur` is given.
 */
export function addToPockets(g: Game, id: string, qty: number, dur?: number): number {
  const p = g.state.player;
  const def = item(id);
  const cap = slotCapacity(id);
  let left = qty;
  const isTool = !!def.tool && def.tool.durability > 0;
  if (!isTool && cap > 1) {
    for (let i = 0; i < p.invSize && left > 0; i++) {
      const s = p.inv[i];
      if (s && s.id === id && s.qty < cap) {
        const n = Math.min(cap - s.qty, left);
        s.qty += n;
        left -= n;
      }
    }
  }
  for (let i = 0; i < p.invSize && left > 0; i++) {
    if (p.inv[i]) continue;
    const n = isTool ? 1 : Math.min(cap, left);
    const slot: InvSlot = { id, qty: n };
    if (isTool) slot.dur = dur ?? def.tool!.durability;
    p.inv[i] = slot;
    left -= n;
  }
  if (left !== qty) g.emit('inventoryChanged', {});
  return left;
}

/** Add to home storage (unlimited). */
export function addToStorage(g: Game, id: string, qty: number): void {
  const st = g.state.home.storage;
  const def = item(id);
  if (def.tool && def.tool.durability > 0) {
    for (let k = 0; k < qty; k++) st.push({ id, qty: 1, dur: def.tool.durability });
    return;
  }
  const ex = st.find((s) => s.id === id && s.dur === undefined);
  if (ex) ex.qty += qty;
  else st.push({ id, qty });
}

/**
 * Give an item to the player (pockets first, overflow to storage). Never loses items.
 * Emits itemGained + catalog updates.
 */
export function give(g: Game, id: string, qty = 1, source = 'misc'): { pockets: number; storage: number } {
  if (qty <= 0) return { pockets: 0, storage: 0 };
  const left = addToPockets(g, id, qty);
  if (left > 0) {
    addToStorage(g, id, left);
    g.toast(`Pockets full — ${item(id).name} sent to home storage.`, 'warn', id);
  }
  markOwned(g, id);
  g.emit('itemGained', { id, qty, source });
  return { pockets: qty - left, storage: left };
}

export function markOwned(g: Game, id: string): void {
  const c = g.state.catalog;
  if (!c.owned[id]) {
    c.owned[id] = g.state.clock.day;
    if (!c.seen[id]) c.seen[id] = g.state.clock.day;
    g.emit('catalogNew', { id });
  }
}

export function markSeen(g: Game, id: string): void {
  const c = g.state.catalog;
  if (!c.seen[id]) c.seen[id] = g.state.clock.day;
}

export function countItem(g: Game, id: string): number {
  let n = 0;
  for (const s of g.state.player.inv) if (s && s.id === id) n += s.qty;
  return n;
}

export function hasItem(g: Game, id: string, qty = 1): boolean {
  return countItem(g, id) >= qty;
}

/** Remove qty of id from pockets (last slots first). Returns false (and removes nothing) if not enough. */
export function removeItem(g: Game, id: string, qty = 1, reason = 'use'): boolean {
  if (countItem(g, id) < qty) return false;
  const p = g.state.player;
  let left = qty;
  for (let i = p.inv.length - 1; i >= 0 && left > 0; i--) {
    const s = p.inv[i];
    if (!s || s.id !== id) continue;
    const n = Math.min(s.qty, left);
    s.qty -= n;
    left -= n;
    if (s.qty <= 0) {
      p.inv[i] = null;
      if (p.equipped === i) p.equipped = -1;
    }
  }
  g.emit('itemRemoved', { id, qty, reason });
  g.emit('inventoryChanged', {});
  return true;
}

export function removeAt(g: Game, slot: number, qty: number, reason = 'use'): InvSlot | null {
  const p = g.state.player;
  const s = p.inv[slot];
  if (!s) return null;
  const n = Math.min(qty, s.qty);
  s.qty -= n;
  const taken: InvSlot = { id: s.id, qty: n, dur: s.dur };
  if (s.qty <= 0) {
    p.inv[slot] = null;
    if (p.equipped === slot) p.equipped = -1;
  }
  g.emit('itemRemoved', { id: s.id, qty: n, reason });
  g.emit('inventoryChanged', {});
  return taken;
}

export function freeSlots(g: Game): number {
  const p = g.state.player;
  let n = 0;
  for (let i = 0; i < p.invSize; i++) if (!p.inv[i]) n++;
  return n;
}

export function setPocketSize(g: Game, size: number): void {
  const p = g.state.player;
  p.invSize = Math.min(INV_MAX, size);
  while (p.inv.length < p.invSize) p.inv.push(null);
  g.emit('inventoryChanged', {});
}

/** Swap two pocket slots (inventory UI drag/move). */
export function swapSlots(g: Game, a: number, b: number): void {
  const p = g.state.player;
  const t = p.inv[a] ?? null;
  p.inv[a] = p.inv[b] ?? null;
  p.inv[b] = t;
  if (p.equipped === a) p.equipped = b;
  else if (p.equipped === b) p.equipped = a;
  g.emit('inventoryChanged', {});
}

/** Move storage stack into pockets. */
export function takeFromStorage(g: Game, index: number, qty?: number): number {
  const st = g.state.home.storage;
  const s = st[index];
  if (!s) return 0;
  const want = qty ?? s.qty;
  const fits = roomFor(g, s.id, want);
  if (fits <= 0) return 0;
  const left = addToPockets(g, s.id, fits, s.dur);
  const moved = fits - left;
  s.qty -= moved;
  if (s.qty <= 0) st.splice(index, 1);
  return moved;
}

export function putInStorage(g: Game, slot: number, qty?: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s) return false;
  const taken = removeAt(g, slot, qty ?? s.qty, 'storage');
  if (!taken) return false;
  if (taken.dur !== undefined) g.state.home.storage.push(taken);
  else addToStorage(g, taken.id, taken.qty);
  return true;
}

/** Change the player's Glints / Lumens. `reason` labels the flow for stats and playtest logs. */
export function money(g: Game, dGlints: number, dLumens = 0, reason = 'other'): void {
  const p = g.state.player;
  p.glints = Math.max(0, p.glints + dGlints);
  p.lumens = Math.max(0, p.lumens + dLumens);
  if (dGlints > 0) g.state.stats.glintsEarned = (g.state.stats.glintsEarned ?? 0) + dGlints;
  if (dLumens > 0) g.state.stats.lumensEarned = (g.state.stats.lumensEarned ?? 0) + dLumens;
  g.emit('money', { glints: p.glints, lumens: p.lumens, dg: dGlints, dl: dLumens, reason });
}

export function stat(g: Game, key: string, inc = 1): void {
  g.state.stats[key] = (g.state.stats[key] ?? 0) + inc;
}

const SORT_ORDER = ['tool', 'material', 'fruit', 'flower', 'seed', 'sapling', 'fish', 'bug', 'fossilUnknown', 'fossil', 'shell', 'furniture', 'wallpaper', 'flooring', 'clothing', 'recipe', 'misc', 'key'];

/** Tidy the pockets: by kind, then name (empty slots go last). The equipped tool stays equipped. */
export function sortPockets(g: Game): void {
  const p = g.state.player;
  const equipped = p.equipped >= 0 ? p.inv[p.equipped] : null;
  const rank = (id: string) => {
    const k = SORT_ORDER.indexOf(item(id).cat);
    return k < 0 ? SORT_ORDER.length : k;
  };
  const filled = p.inv.filter((s): s is InvSlot => !!s).sort((a, b) => rank(a.id) - rank(b.id) || item(a.id).name.localeCompare(item(b.id).name));
  p.inv = [...filled, ...Array.from({ length: p.invSize - filled.length }, () => null)];
  p.equipped = equipped ? p.inv.indexOf(equipped) : -1;
  g.emit('inventoryChanged', {});
}
