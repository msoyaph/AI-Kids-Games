/** Shared item presentation helpers (names, icons, quality stars). */
import { isTool, toolKind, tryItem } from '../data/items';
import type { ItemStack } from '../sim/types';
import { TIER_NAMES } from '../data/items';
import { h } from './dom';
import { icon } from './icons';

export function iconName(id: string, tools?: Record<string, number>): string {
  if (isTool(id)) {
    const k = toolKind(id);
    return `item.tool.${k}.${Math.max(0, tools?.[k] ?? 0)}`;
  }
  return tryItem(id)?.icon ?? `item.${id}`;
}

export function itemName(id: string, tools?: Record<string, number>): string {
  const d = tryItem(id);
  if (!d) return id;
  if (isTool(id) && tools) {
    const tier = tools[toolKind(id)] ?? 0;
    return tier > 0 ? `${TIER_NAMES[tier]} ${d.name}` : d.name;
  }
  return d.name;
}

export const QUALITY_NAMES = ['', 'Silver', 'Gold', 'Sparkle'];

/** A slot-sized icon with count + quality star. */
export function stackView(s: ItemStack | null, tools?: Record<string, number>, size = 32): HTMLElement {
  const wrap = h('span', { class: 'stack', style: `position:relative;display:inline-flex;width:${size}px;height:${size}px` });
  if (!s) return wrap;
  wrap.appendChild(icon(iconName(s.id, tools), size));
  if (s.q > 0) {
    const q = icon(`ui.star${s.q}`, Math.round(size / 2));
    q.style.position = 'absolute';
    q.style.left = '-4px';
    q.style.bottom = '-4px';
    wrap.appendChild(q);
  }
  if (s.n > 1) wrap.appendChild(h('span', { class: 'n', style: 'position:absolute;right:-3px;bottom:-5px;font-size:12px;font-weight:800;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 2px #fff' }, String(s.n)));
  return wrap;
}
