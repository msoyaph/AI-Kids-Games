/**
 * City Hall: the town's numbers and its budget in friendly SVG charts (money in and out each day, and
 * coins over the last days), town projects to fund, the eco rating with a real reason for each part,
 * and the districts that have grown. Mistakes only slow growth; the lesson line says why services
 * are worth their upkeep.
 */
import { PROJECTS, type ProjectId } from '../data/chapters';
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import { feesPerMin, bubblePerMin, netPerDay } from '../sim/budget';
import type { Census } from '../sim/census';
import { DAY_SEC } from '../sim/clock';
import { districts } from '../sim/districts';
import { eco } from '../sim/eco';
import { fundProject } from '../sim/story';
import type { Town } from '../sim/state';
import type { Traffic } from '../sim/traffic';
import { chapterOf } from '../sim/unlocks';
import { sfx } from '../audio/engine';
import { h } from './h';
import { icon } from './icons';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

/** Horizontal bars: label, value, colour. */
function bars(rows: { label: string; value: number; color: string }[], unit: string): Element {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.value)));
  const W = 320, rowH = 30, labelW = 120;
  const el = svg('svg', { viewBox: `0 0 ${W} ${rows.length * rowH + 4}`, role: 'img', 'aria-label': rows.map(r => `${r.label} ${Math.round(r.value)} ${unit}`).join(', '), class: 'chart' });
  rows.forEach((r, i) => {
    const y = i * rowH + 4;
    const w = Math.max(2, (Math.abs(r.value) / max) * (W - labelW - 56));
    const label = svg('text', { x: 0, y: y + 17, class: 'chart-label' }); label.textContent = r.label; el.appendChild(label);
    el.appendChild(svg('rect', { x: labelW, y: y + 4, width: w, height: 18, rx: 6, fill: r.color }));
    const v = svg('text', { x: labelW + w + 6, y: y + 18, class: 'chart-value' }); v.textContent = `${Math.round(r.value)}`; el.appendChild(v);
  });
  return el;
}

/** A small line of coins over the last days, the newest point marked. */
function line(values: number[]): Element {
  const W = 320, H = 90, pad = 8;
  const el = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Coins over the last ${values.length} days: ${values.map(v => Math.round(v)).join(', ')}`, class: 'chart' });
  if (values.length < 2) return el;
  const max = Math.max(1, ...values), min = Math.min(0, ...values);
  const x = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  el.appendChild(svg('path', { d: `${d}L${x(values.length - 1)},${H - pad}L${x(0)},${H - pad}Z`, class: 'chart-area' }));
  el.appendChild(svg('path', { d, class: 'chart-line' }));
  el.appendChild(svg('circle', { cx: x(values.length - 1), cy: y(values.at(-1)!), r: 4.5, class: 'chart-dot' }));
  return el;
}

/** Which projects show from which chapter. */
const PROJECT_CHAPTER: Record<ProjectId, number> = { lighthouse: 1, clocktower: 3, pier: 6 };

export function cityHallPanel(town: Town, c: Census, trips: Traffic | null, d: { say(t: string): void; changed(): void }): HTMLElement {
  const perDay = DAY_SEC / 60;
  const shops = c.shops.reduce((n, t) => n + bubblePerMin(t, c), 0) * perDay;
  const works = c.works.reduce((n, t) => n + bubblePerMin(t, c), 0) * perDay;
  const fees = feesPerMin(c) * perDay;
  const net = netPerDay(town, c);
  const svc = new Map<string, number>();
  for (const t of town.things) { const s = THING[t.def]?.service; if (s) svc.set(THING[t.def]!.name, (svc.get(THING[t.def]!.name) ?? 0) + TUNING.services.upkeep[s] * perDay); }
  if (town.routes.length) svc.set('Buses', town.routes.length * TUNING.services.upkeep.bus * perDay);
  const ch = chapterOf(town);
  const root = h('div.cityhall');
  const projects = (Object.keys(PROJECTS) as ProjectId[]).filter(id => ch >= PROJECT_CHAPTER[id]);
  const e = ch >= 5 ? eco(town, c, trips) : null;
  const dist = districts(town);
  root.append(
    h('div.stats', null,
      h('div.stat', null, h('b', null, c.population.toLocaleString('en-US')), h('span', null, 'people')),
      h('div.stat', null, h('b', null, c.happy === null ? '–' : `${c.happy}%`), h('span', null, 'happy')),
      h('div.stat', null, h('b', null, `${Math.round(c.employed)}/${Math.round(c.workers)}`), h('span', null, 'workers with jobs')),
      h('div.stat', null, h('b', null, town.mode === 'creative' ? '∞' : Math.floor(town.coins).toLocaleString('en-US')), h('span', null, 'coins'))),
    projects.length ? h('h3', null, 'Town projects') : '',
    ...projects.map(id => {
      const p = PROJECTS[id], done = !!town.flags[`project-${id}`];
      return h('div.project', { class: done ? 'done' : '' }, h('div', null, h('b', null, p.name), h('small', null, p.text)),
        done ? h('span.owned', null, icon('check', 22), 'Done') : h('button.go', { onclick: () => { const r = fundProject(town, id); if (r.ok) { sfx.cheer(); d.say(`${p.name}: done! Thank you, Mayor.`); d.changed(); root.replaceWith(cityHallPanel(town, c, trips, d)); } else { sfx.nope(); d.say(r.why); } } }, town.mode === 'creative' ? 'Do it' : `Fund · ${p.cost}`));
    }),
    h('h3', null, 'Money coming in each day'),
    bars([{ label: 'Town fees', value: fees, color: '#2fa3b0' }, { label: 'Shops', value: shops, color: '#8fc8f2' }, { label: 'Workplaces', value: works, color: '#f6d27a' }], 'coins'),
    h('h3', null, 'Money going out each day'),
    svc.size ? bars([...svc].map(([label, value]) => ({ label, value, color: '#ef6a55' })), 'coins') : h('p.note', null, 'Nothing yet. Services like a school or a clinic cost a little every day.'),
    h('p', { class: net >= 0 ? 'net good' : 'net' }, net >= 0 ? `The town earns about ${Math.round(net)} coins a day.` : `The town spends about ${Math.round(-net)} coins a day more than it earns.`),
    h('h3', null, 'Coins, day by day'),
    line(town.history.map(r => r.coins).concat(Math.round(town.coins))),
    h('p.note', null, 'Services cost money, but they make people happy, and happy towns grow. Homes pay a small town fee; shops and workplaces earn when people shop and work there.'),
  );
  if (e) {
    root.append(h('h3', null, `Eco rating: ${e.leaves} of 5 leaves`),
      h('div.leaves', { role: 'img', 'aria-label': `${e.leaves} of 5 leaves` }, ...Array.from({ length: 5 }, (_, i) => h('span.leaf', { class: i < e.leaves ? 'on' : '' }, icon('park', 26)))),
      ...e.parts.map(p => h('div.eco-part', null, h('div', null, h('b', null, p.label), h('small', null, p.why)), h('span.bar.mini', null, h('i.bar-fill', { style: `width:${Math.round(p.score * 100)}%` })))));
  }
  if (dist.length) {
    root.append(h('h3', null, 'Districts'), h('ul.districts', null, ...dist.map(x => h('li', null, h('b', null, x.kind), ` · ${x.homes} homes, ${x.shops} shops, ${x.works} workplaces`))));
  }
  return root;
}
