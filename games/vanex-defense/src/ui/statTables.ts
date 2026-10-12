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

/** Codex block: both level-3 paths with what they change at level 4. */
export function specSummary(d: TowerDef): HTMLElement {
  const base = statLines(d, d.levels[3]!);
  return h(
    'div.spec-summary',
    null,
    h('h5', null, t('codex.specs')),
    ...d.specs!.map((sp) => {
      const lines = statLines(d, sp.levels[1]);
      const changed = lines.filter((l) => l.key === 'dps' || base.find((b) => b.key === l.key)?.text !== l.text).slice(0, 4);
      return h(
        'div.spec-row',
        null,
        h('b', null, t('spec.path', { n: sp.index + 1 }), ' · ', sp.name),
        h('p', null, sp.desc),
        h('p.dim', null, t('codex.lv', { n: 4 }), ': ', changed.map((l) => `${l.label} ${l.text}`).join(' · ')),
      );
    }),
  );
}

/** Codex block for bosses: each phase, when it starts and what it does. */
export function bossPhaseList(d: EnemyDef): HTMLElement | null {
  if (!d.phases?.length) return null;
  return h(
    'div.spec-summary',
    null,
    h('h5', null, t('boss.phasesTitle')),
    ...d.phases.map((p, i) =>
      h(
        'div.spec-row.boss-row',
        null,
        h('b', null, t(`boss.${d.id}.${p.key}` as MessageKey)),
        h('p.dim', null, t('boss.phaseAt', { n: i + 2, pct: Math.round(p.at * 100) })),
        h('p', null, t(`boss.${d.id}.${p.key}.desc` as MessageKey)),
      ),
    ),
  );
}
