/**
 * The Farm Ledger: a chart of coins in and out for each season, what was grown and made, and
 * "profit per crop" (coins a minute and coins a harvest), which teaches planning. Bars are labelled
 * with their numbers and the two kinds differ in pattern as well as colour.
 */
import { itemDef } from '../data/items';
import { seasonCount } from '../sim/clock';
import { cropLines, pageLabel, pages, topOf } from '../sim/ledger';
import type { Farm, LedgerSeason } from '../sim/state';
import { fill, h } from './h';
import { icon } from './icons';
import { itemIcon } from './itemIcons';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag: string, attrs: Record<string, string | number>, text?: string) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Coins earned (solid green) and spent (striped gold) for each season, side by side. */
export function seasonChart(list: LedgerSeason[]): SVGSVGElement {
  const W = 340, H = 180, top = 22, bottom = 30, left = 8;
  const max = Math.max(10, ...list.flatMap(p => [p.earned, p.spent]));
  const slot = (W - left * 2) / Math.max(list.length, 4);
  const bw = Math.min(22, slot * 0.34);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': list.map(p => `${pageLabel(p.season)}: earned ${p.earned}, spent ${p.spent}`).join('. ') }) as SVGSVGElement;
  const defs = svgEl('defs', {});
  const pat = svgEl('pattern', { id: 'stripes', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.appendChild(svgEl('rect', { width: 6, height: 6, fill: '#ffd166' }));
  pat.appendChild(svgEl('rect', { width: 2.4, height: 6, fill: '#e0a92e' }));
  defs.appendChild(pat);
  svg.appendChild(defs);
  svg.appendChild(svgEl('line', { x1: left, x2: W - left, y1: H - bottom, y2: H - bottom, stroke: '#e7dfc9', 'stroke-width': 2 }));
  list.forEach((p, i) => {
    const cx = left + slot * (i + 0.5);
    const bar = (v: number, x: number, fillWith: string) => {
      const hgt = ((H - top - bottom) * v) / max;
      svg.appendChild(svgEl('rect', { x, y: H - bottom - hgt, width: bw, height: Math.max(hgt, v > 0 ? 2 : 0), rx: 4, fill: fillWith }));
      if (v > 0) svg.appendChild(svgEl('text', { x: x + bw / 2, y: H - bottom - hgt - 5, 'text-anchor': 'middle', class: 'chart-num' }, v >= 10000 ? `${Math.round(v / 1000)}k` : String(v)));
    };
    bar(p.earned, cx - bw - 1, '#6fbf73');
    bar(p.spent, cx + 1, 'url(#stripes)');
    svg.appendChild(svgEl('text', { x: cx, y: H - 10, 'text-anchor': 'middle', class: 'chart-label' }, pageLabel(p.season, true)));
  });
  return svg;
}

function countList(title: string, counts: Record<string, number>, empty: string) {
  const top = topOf(counts);
  return h('div.ledger-box', null, h('b', null, title),
    top.length ? h('ul.ledger-top', null, ...top.map(([id, n]) => h('li', null, itemIcon(id, 28), h('span', null, itemDef(id).name), h('b', null, `× ${n}`))))
      : h('p.note', null, empty));
}

export function ledgerPanel(farm: Farm): HTMLElement {
  const root = h('div.ledger');
  let tab: 'seasons' | 'crops' = 'seasons';
  let sortBy: 'minute' | 'harvest' = 'minute';
  const render = () => {
    const list = pages(farm, seasonCount(farm.t));
    const now = list.at(-1)!;
    const tabs = h('div.tabs', { role: 'tablist' },
      h('button', { role: 'tab', 'aria-selected': String(tab === 'seasons'), onclick: () => { tab = 'seasons'; render(); } }, icon('ledger', 22), 'Seasons'),
      h('button', { role: 'tab', 'aria-selected': String(tab === 'crops'), onclick: () => { tab = 'crops'; render(); } }, icon('seeds', 22), 'Profit per crop'));
    if (tab === 'seasons') {
      const net = now.earned - now.spent;
      fill(root, tabs,
        h('p', null, `${pageLabel(now.season)}: you earned ${now.earned} coins and spent ${now.spent}. `,
          net >= 0 ? `That is ${net} more coming in than going out.` : `You spent ${-net} more than you earned. Spending on the farm helps it grow!`),
        seasonChart(list),
        h('div.legend', null, h('span.key.earned', null, 'Earned'), h('span.key.spent', null, 'Spent')),
        h('div.ledger-boxes', null,
          countList('Grown this season', now.grown, 'Nothing picked yet this season.'),
          countList('Made this season', now.made, 'Nothing made yet this season.')));
      return;
    }
    const lines = cropLines(farm).sort((a, b) => sortBy === 'minute' ? b.perMinute - a.perMinute : b.perHarvest - a.perHarvest);
    const max = Math.max(1, ...lines.map(l => sortBy === 'minute' ? l.perMinute : l.perHarvest));
    fill(root, tabs,
      h('p', null, 'Quick crops pay a little, often. Slow crops pay more each time, and you can do other jobs while they grow.'),
      h('div.tabs.small', { role: 'tablist', 'aria-label': 'Sort by' },
        h('button', { role: 'tab', 'aria-selected': String(sortBy === 'minute'), onclick: () => { sortBy = 'minute'; render(); } }, 'Coins a minute'),
        h('button', { role: 'tab', 'aria-selected': String(sortBy === 'harvest'), onclick: () => { sortBy = 'harvest'; render(); } }, 'Coins a harvest')),
      h('ul.profit-list', null, ...lines.map(l => {
        const v = sortBy === 'minute' ? l.perMinute : l.perHarvest;
        const own = l.earned - l.spent;
        return h('li', null,
          itemIcon(l.crop.id, 32),
          h('div.profit-body', null,
            h('div.profit-head', null, h('b', null, l.crop.name), h('span', null, sortBy === 'minute' ? `${v.toFixed(1)} a minute` : `${Math.round(v)} a harvest`)),
            h('span.bar', null, h('i.bar-fill', { style: `width:${Math.round((v / max) * 100)}%` })),
            h('small', null, `Grows in ${l.crop.growMin} min · `, l.grown ? `You grew ${l.grown}` : 'Not grown yet', l.earned || l.spent ? ` · your fields: ${own >= 0 ? '+' : ''}${own} coins` : '')));
      })),
      h('p.note', null, 'Numbers are for one star at an ordinary price, after paying for the seeds. Stars, good prices and orders pay more.'));
  };
  render();
  return root;
}
