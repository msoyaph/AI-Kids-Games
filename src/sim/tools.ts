// Tool equipping and durability.
import { item } from '../data/registry';
import type { ToolKind } from '../data/types';
import type { Game } from './game';
import type { InvSlot } from './state';

export const TOOL_ORDER: ToolKind[] = ['net', 'rod', 'shovel', 'axe', 'can', 'ladder'];
export const TOOL_LABEL: Record<ToolKind, string> = {
  net: 'Net',
  rod: 'Fishing Rod',
  shovel: 'Shovel',
  axe: 'Axe',
  can: 'Sprinkler',
  ladder: 'Ladder',
};

export interface EquippedTool {
  slot: number;
  s: InvSlot;
  kind: ToolKind;
  sturdy: boolean;
}

export function equippedTool(g: Game): EquippedTool | null {
  const p = g.state.player;
  if (p.equipped < 0) return null;
  const s = p.inv[p.equipped];
  if (!s) {
    p.equipped = -1;
    return null;
  }
  const t = item(s.id).tool;
  if (!t) {
    p.equipped = -1;
    return null;
  }
  return { slot: p.equipped, s, kind: t.kind, sturdy: t.sturdy };
}

export function equipSlot(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s || !item(s.id).tool) return false;
  g.state.player.equipped = slot;
  g.emit('inventoryChanged', {});
  g.emit('sfx', { name: 'equip' });
  return true;
}

/** Equip the best tool of a kind from the pockets (sturdy first, then most durable). */
export function equipKind(g: Game, kind: ToolKind): boolean {
  const p = g.state.player;
  let best = -1;
  let bestScore = -1;
  p.inv.forEach((s, i) => {
    if (!s || i >= p.invSize) return;
    const t = item(s.id).tool;
    if (!t || t.kind !== kind) return;
    const score = (t.sturdy ? 1000 : 0) + (s.dur ?? 999);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  if (best < 0) return false;
  return equipSlot(g, best);
}

export function putAway(g: Game): void {
  if (g.state.player.equipped >= 0) {
    g.state.player.equipped = -1;
    g.emit('inventoryChanged', {});
  }
}

/** Cycle to the next/previous tool kind available in the pockets. */
export function cycleTool(g: Game, dir: 1 | -1): void {
  const cur = equippedTool(g);
  const start = cur ? TOOL_ORDER.indexOf(cur.kind) : dir > 0 ? -1 : 0;
  for (let k = 1; k <= TOOL_ORDER.length; k++) {
    const idx = (start + dir * k + TOOL_ORDER.length * 2) % TOOL_ORDER.length;
    if (equipKind(g, TOOL_ORDER[idx]!)) return;
  }
}

export function ownedToolKinds(g: Game): ToolKind[] {
  const set = new Set<ToolKind>();
  for (const s of g.state.player.inv) {
    if (!s) continue;
    const t = item(s.id).tool;
    if (t) set.add(t.kind);
  }
  return TOOL_ORDER.filter((k) => set.has(k));
}

/** Use up one point of durability on the equipped tool. */
export function wearTool(g: Game): void {
  const t = equippedTool(g);
  if (!t || t.s.dur === undefined) return;
  t.s.dur -= 1;
  if (t.s.dur <= 0) {
    const name = item(t.s.id).name;
    g.state.player.inv[t.slot] = null;
    g.state.player.equipped = -1;
    g.state.stats.toolsBroken = (g.state.stats.toolsBroken ?? 0) + 1;
    g.emit('toolBroke', { id: t.s.id });
    g.emit('sfx', { name: 'break' });
    g.toast(`Your ${name} broke!`, 'warn');
    // seamlessly switch to a spare of the same kind
    equipKind(g, t.kind);
    g.emit('inventoryChanged', {});
  }
}
