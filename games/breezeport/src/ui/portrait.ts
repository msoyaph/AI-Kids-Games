/**
 * Portraits of the townsfolk, drawn in code as small SVGs from their colours (data/cast.ts): a round
 * face, hair, a shirt collar, rosy cheeks and a smile, plus their little extra (glasses, a cap, a
 * captain's hat, a helmet, a bun, a bow, a beard or a scarf). All original.
 */
import { PERSON } from '../data/cast';

const NS = 'http://www.w3.org/2000/svg';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function portrait(id: string, size = 64): SVGSVGElement {
  const p = PERSON[id];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait');
  if (!p) return svg;
  const add = (tag: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); svg.appendChild(e); return e; };
  const skin = hex(p.skin), hair = hex(p.hair), shirt = hex(p.shirt);
  add('circle', { cx: 32, cy: 32, r: 31, fill: '#e6f4f2' });
  add('path', { d: 'M10 64c2-12 10-18 22-18s20 6 22 18z', fill: shirt });
  add('path', { d: 'M26 47l6 6 6-6', fill: 'none', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
  if (p.extra === 'bun') add('circle', { cx: 32, cy: 10, r: 6.5, fill: hair });
  add('circle', { cx: 32, cy: 29, r: 15, fill: skin });
  // hair: a cap over the top
  add('path', { d: 'M17 29c0-11 7-16 15-16s15 5 15 16c-3-4-8-7-15-7s-12 3-15 7z', fill: hair });
  add('circle', { cx: 26, cy: 30, r: 1.9, fill: '#2e2a28' });
  add('circle', { cx: 38, cy: 30, r: 1.9, fill: '#2e2a28' });
  add('circle', { cx: 23.5, cy: 35, r: 2.6, fill: '#f29a9a', opacity: 0.7 });
  add('circle', { cx: 40.5, cy: 35, r: 2.6, fill: '#f29a9a', opacity: 0.7 });
  add('path', { d: 'M27.5 36.5a5 5 0 009 0', fill: 'none', stroke: '#8a4a3a', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
  switch (p.extra) {
    case 'glasses':
      add('circle', { cx: 26, cy: 30, r: 4.2, fill: 'none', stroke: '#2f3a44', 'stroke-width': 1.6 });
      add('circle', { cx: 38, cy: 30, r: 4.2, fill: 'none', stroke: '#2f3a44', 'stroke-width': 1.6 });
      add('path', { d: 'M30.2 30h3.6', stroke: '#2f3a44', 'stroke-width': 1.6 });
      break;
    case 'cap':
      add('path', { d: 'M16 24c1-8 8-12 16-12s15 4 16 12z', fill: shirt });
      add('path', { d: 'M40 23h12a3 3 0 010 4H40z', fill: shirt });
      break;
    case 'captain':
      add('path', { d: 'M15 21c2-7 9-10 17-10s15 3 17 10z', fill: '#fff' });
      add('rect', { x: 15, y: 20, width: 34, height: 4.5, rx: 2, fill: '#2f3a44' });
      add('circle', { cx: 32, cy: 16, r: 2.6, fill: '#f2c84b' });
      break;
    case 'helmet':
      add('path', { d: 'M15 24c0-9 7-13 17-13s17 4 17 13z', fill: '#e25c4a' });
      add('rect', { x: 13, y: 22, width: 38, height: 4, rx: 2, fill: '#c84a3a' });
      add('circle', { cx: 32, cy: 16, r: 2.4, fill: '#ffd34d' });
      break;
    case 'bow':
      add('path', { d: 'M38 12l6-4v8zM38 12l-6-4v8z', fill: '#ff9fb8' });
      break;
    case 'beard':
      add('path', { d: 'M19 31c1 10 6 14 13 14s12-4 13-14c-3 4-7 5-13 5s-10-1-13-5z', fill: hair });
      add('path', { d: 'M28 38a4 4 0 008 0', fill: 'none', stroke: '#8a4a3a', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
      break;
    case 'scarf':
      add('path', { d: 'M20 44c4 3 20 3 24 0l1 4c-5 3-21 3-26 0z', fill: '#ffc23d' });
      break;
  }
  return svg;
}
