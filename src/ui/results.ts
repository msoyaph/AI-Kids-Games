import { TOWERS, type TowerId } from '../data/towers';
import { formatNumber, t } from '../i18n';
import { towerIconUrl } from '../render/atlas/bake';
import type { Game } from '../sim/Game';
import { h, img } from './dom';

interface Row {
  type: TowerId;
  level: number;
  spec: number;
  damage: number;
  kills: number;
  sold: boolean;
}

function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return t('results.time', { m: Math.floor(s / 60), s: String(s % 60).padStart(2, '0') });
}

/**
 * After-match report: key numbers, damage per tower and lives lost per wave.
 * (Hero contribution joins this once commanders arrive.)
 */
export function resultsReport(g: Game): HTMLElement {
  const st = g.stats;
  const cleared = g.state === 'won' ? g.waveNum : Math.max(0, g.waveNum - 1);
  const totalWaves = g.totalWaves === Infinity ? null : g.totalWaves;
  const kv = (label: string, value: string): HTMLElement => h('div.kv', null, h('span', null, label), h('b', null, value));
  const summary = h(
    'div.kv-grid.results-summary',
    null,
    kv(t('results.waves'), totalWaves ? t('hud.waveOf', { n: cleared, total: totalWaves }) : formatNumber(cleared)),
    kv(t('results.lives'), t('hud.waveOf', { n: g.lives, total: g.maxLives })),
    kv(t('results.destroyed'), formatNumber(st.kills)),
    kv(t('results.earned'), formatNumber(st.coinsEarned)),
    kv(t('results.spent'), formatNumber(st.coinsSpent)),
    kv(t('results.duration'), mmss(g.time)),
  );

  // damage per tower (alive and sold), biggest first
  const rows: Row[] = [
    ...g.towers.map((tw) => ({ type: tw.def.id, level: tw.level, spec: tw.spec, damage: tw.damageDone, kills: tw.kills, sold: false })),
    ...st.soldTowers.map((r) => ({ ...r, sold: true })),
  ]
    .filter((r) => r.damage > 0)
    .sort((a, b) => b.damage - a.damage);
  const total = rows.reduce((s, r) => s + r.damage, 0) || 1;
  const top = rows.slice(0, 8);
  const max = top[0]?.damage || 1;
  const dmgTable = h(
    'div.dmg-table',
    { role: 'list', 'aria-label': t('results.damageTitle') },
    ...top.map((r) => {
      const def = TOWERS[r.type];
      const spec = r.spec >= 0 ? def.specs?.[r.spec] : undefined;
      return h(
        'div.dmg-row',
        { role: 'listitem' },
        img(towerIconUrl(r.type, r.level, 64, r.spec), def.name, 'icon'),
        h(
          'div.dmg-main',
          null,
          h('div.dmg-name', null, def.name, spec ? h('span.chip.spec', null, spec.name) : null, r.sold ? h('span.chip.dim', null, t('results.sold')) : null),
          h('div.dmg-bar', null, h('i', { style: `width:${Math.max(3, (r.damage / max) * 100).toFixed(1)}%` })),
        ),
        h('div.dmg-num', null, h('b', null, formatNumber(Math.round(r.damage))), h('small', null, t('results.share', { pct: Math.round((r.damage / total) * 100), kills: r.kills }))),
      );
    }),
  );
  if (!top.length) dmgTable.append(h('p.dim', null, t('results.noDamage')));

  // lives lost per wave
  const leakWaves: [number, number][] = [];
  st.leaksByWave.forEach((n, i) => n > 0 && leakWaves.push([i + 1, n]));
  const maxLeak = Math.max(1, ...leakWaves.map((l) => l[1]));
  const leaks = leakWaves.length
    ? h(
        'div.leak-chart',
        { role: 'list', 'aria-label': t('results.leaksTitle') },
        ...leakWaves.slice(-12).map(([w, n]) =>
          h('div.leak', { role: 'listitem', title: t('results.leakTip', { n: w, count: n }) }, h('i', { style: `height:${Math.round((n / maxLeak) * 100)}%` }), h('span', null, formatNumber(w))),
        ),
      )
    : h('p.dim', null, t('results.noLeaks'));

  return h(
    'div.results',
    null,
    h('div.results-col', null, h('h3.section', null, t('results.summaryTitle')), summary, h('h3.section', null, t('results.leaksTitle')), leaks),
    h('div.results-col', null, h('h3.section', null, t('results.damageTitle')), dmgTable),
  );
}
