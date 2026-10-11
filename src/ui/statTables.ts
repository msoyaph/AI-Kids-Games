import { ENEMIES, type EnemyDef } from '../data/enemies';
import { statLines } from '../data/stats';
import type { TowerDef } from '../data/towers';
import { formatNumber, t, type MessageKey } from '../i18n';
import { h } from './dom';

/** Rows that every tower shows first (the rest are its special stats). */
const CORE = ['damage', 'rate', 'range', 'dps'];

/** Level 1–4 table: cost, the core stats, then this tower's special stats. */
export function towerLevelTable(d: TowerDef): HTMLElement {
  const lines = d.levels.map((st) => statLines(d, st));
  const keys = lines[0]!.map((l) => l.key);
  const specials = keys.filter((k) => !CORE.includes(k));
  const row = (label: string, cells: string[], cls = ''): HTMLElement => h('tr', { class: cls }, h('td', null, label), ...cells.map((c) => h('td', null, c)));
  const rows: HTMLElement[] = [row(t('codex.cost'), d.levels.map((st) => formatNumber(st.cost)), 'cost-row')];
  for (const k of [...CORE, ...specials]) {
    const first = lines[0]!.find((l) => l.key === k);
    if (!first) continue;
    rows.push(row(first.label, lines.map((ls) => ls.find((l) => l.key === k)?.text ?? '—'), k === 'dps' ? 'dps-row' : ''));
  }
  return h(
    'table.stats-table.codex-table',
    { 'aria-label': t('codex.levelsOf', { name: d.name }) },
    h('thead', null, h('tr', null, h('th', null, ''), ...[1, 2, 3, 4].map((n) => h('th', null, t('codex.lv', { n }))))),
    h('tbody', null, ...rows),
  );
}

/**
 * Key numbers for a construct type. Pass `live` health to show a creature on
 * the field (current / max) instead of the wave-1 value.
 */
export function enemyStatGrid(d: EnemyDef, live?: { hp: number; maxHp: number; armor: number }): HTMLElement {
  const stat = (label: MessageKey, value: string): HTMLElement => h('div.kv', null, h('span', null, t(label)), h('b', null, value));
  return h(
    'div.kv-grid',
    null,
    stat('codex.hp', live ? t('hud.waveOf', { n: Math.ceil(live.hp), total: Math.ceil(live.maxHp) }) : formatNumber(d.hp)),
    stat('codex.armor', t('fmt.pct', { n: Math.round((live?.armor ?? d.armor) * 100) })),
    stat('codex.speed', t('codex.tilesPerSec', { n: d.speed })),
    stat('codex.livesCost', formatNumber(d.lives)),
    stat('codex.gold', formatNumber(d.coins)),
    d.split ? stat('codex.splitInto', t('codex.splitCount', { count: d.split.count, name: ENEMIES[d.split.into].name })) : null,
  );
}
