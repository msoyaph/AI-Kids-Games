/**
 * Small pictures of crops and goods, drawn in code as SVG. Each has its own shape as well as its
 * colour (grain ears, round fruit, leafy heads, bulbs, pods, flowers), and the name is always written
 * next to it, so nothing depends on colour alone.
 */
import { CROP } from '../data/crops';
import { ITEMS } from '../data/items';

const NS = 'http://www.w3.org/2000/svg';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function el(tag: string, attrs: Record<string, string | number>) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

export function itemIcon(id: string, size = 36): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('item-icon');
  const item = ITEMS[id];
  const crop = CROP[id] ?? (item?.base ? CROP[item.base] : undefined);
  const main = hex(item?.color ?? 0xcccccc);
  const leaf = hex(crop?.color.leaf ?? 0x6fbf73);
  const accent = crop?.color.accent !== undefined ? hex(crop.color.accent) : '#ffffff';
  const add = (tag: string, attrs: Record<string, string | number>) => svg.appendChild(el(tag, attrs));
  const SPECIAL: Record<string, string> = { fertilizer: 'sack', egg: 'egg', duckegg: 'egg', milk: 'bottle', goatmilk: 'bottle', wool: 'yarn', honey: 'jar', lemon: 'lemon', almond: 'nut', walnut: 'nut', hazelnut: 'nut', mushroom: 'mushroom' };
  const shape: string = crop?.shape ?? SPECIAL[id] ?? 'round';
  switch (shape) {
    case 'grain':
    case 'paddy':
      add('path', { d: 'M12 22V8', stroke: leaf, 'stroke-width': 2, 'stroke-linecap': 'round' });
      for (const y of [6, 9.5, 13]) { add('ellipse', { cx: 9.6, cy: y + 1, rx: 2.2, ry: 3.2, fill: main, transform: `rotate(-30 9.6 ${y + 1})` }); add('ellipse', { cx: 14.4, cy: y + 1, rx: 2.2, ry: 3.2, fill: main, transform: `rotate(30 14.4 ${y + 1})` }); }
      add('ellipse', { cx: 12, cy: 4.5, rx: 2, ry: 3, fill: main });
      break;
    case 'leafy':
      add('circle', { cx: 12, cy: 13, r: 8.5, fill: leaf });
      add('circle', { cx: 12, cy: 13.5, r: 5.5, fill: main });
      add('path', { d: 'M12 8.5v10M8 12c2 1 6 1 8 0', stroke: leaf, 'stroke-width': 1.2, fill: 'none', opacity: 0.6 });
      break;
    case 'bulb':
      add('path', { d: 'M12 3c.5 3 .5 5 0 8M10 4c1 3 1.5 5 1.5 7M14 4c-1 3-1.5 5-1.5 7', stroke: leaf, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' });
      add('path', { d: 'M12 9c4.5 2 6.5 5 6.5 8a6.5 5 0 01-13 0c0-3 2-6 6.5-8z', fill: main });
      break;
    case 'stalk':
      for (const x of [9, 12, 15]) add('rect', { x: x - 1.2, y: 7, width: 2.4, height: 15, rx: 1.2, fill: main });
      add('ellipse', { cx: 12, cy: 6, rx: 7, ry: 3.5, fill: leaf });
      break;
    case 'flower':
      add('path', { d: 'M12 22V12', stroke: leaf, 'stroke-width': 2, 'stroke-linecap': 'round' });
      if (id === 'lavender') for (const y of [4, 7, 10]) add('ellipse', { cx: 12, cy: y, rx: 2.6, ry: 2, fill: main });
      else { for (let i = 0; i < 6; i++) add('ellipse', { cx: 12, cy: 6.5, rx: 2.2, ry: 4, fill: main, transform: `rotate(${i * 60} 12 10)` }); add('circle', { cx: 12, cy: 10, r: 2.4, fill: accent }); }
      break;
    case 'tall':
      add('path', { d: 'M12 22V8', stroke: leaf, 'stroke-width': 2, 'stroke-linecap': 'round' });
      if (id === 'cotton') for (const [x, y] of [[8, 9], [16, 8], [12, 5]]) add('circle', { cx: x!, cy: y!, r: 3.6, fill: main, stroke: '#ddd', 'stroke-width': 0.6 });
      else for (const [x, y, r] of [[8, 11, -20], [16, 10, 20], [12, 6, 0]]) add('path', { d: `M${x} ${y! - 4}l2 8h-4z`, fill: main, transform: `rotate(${r} ${x} ${y})` });
      break;
    case 'clover':
      for (const [x, y] of [[9, 9], [15, 9], [12, 14]]) add('circle', { cx: x!, cy: y!, r: 4, fill: leaf });
      add('circle', { cx: 12, cy: 6, r: 3, fill: main });
      break;
    case 'vine':
      if (id === 'pumpkin') { for (const x of [7, 12, 17]) add('ellipse', { cx: x, cy: 14, rx: 4.5, ry: 7, fill: main }); add('rect', { x: 11, y: 3.5, width: 2, height: 4, rx: 1, fill: '#6b8a3a' }); }
      else if (id === 'watermelon') { add('ellipse', { cx: 12, cy: 13, rx: 10, ry: 7.5, fill: main }); add('path', { d: 'M5 9c3 3 3 6 0 9M12 6c2 4 2 10 0 14M19 9c-3 3-3 6 0 9', stroke: hex(crop!.color.accent ?? 0x9fd07a), 'stroke-width': 1.4, fill: 'none' }); }
      else if (id === 'squash') add('path', { d: 'M12 3c2.5 0 3.5 2 3.5 5 0 2 3.5 4 3.5 8a7 6 0 01-14 0c0-4 3.5-6 3.5-8 0-3 1-5 3.5-5z', fill: main });
      else add('rect', { x: 4, y: 9, width: 16, height: 7, rx: 3.5, fill: main, transform: 'rotate(-25 12 12.5)' });
      add('path', { d: 'M15 4c3-1 5 0 6 2-2 1-4 1-6-2z', fill: leaf });
      break;
    case 'sack':
      add('path', { d: 'M7 7h10l2 13a2 2 0 01-2 2H7a2 2 0 01-2-2z', fill: '#c9a16e' });
      add('path', { d: 'M8 7l1-3h6l1 3', fill: '#b08452' });
      add('circle', { cx: 12, cy: 15, r: 3.2, fill: main });
      add('path', { d: 'M12 15c0-2 1-3 3-3 0 2-1 3-3 3z', fill: '#6fbf73' });
      break;
    case 'egg':
      add('ellipse', { cx: 12, cy: 13, rx: 7, ry: 9, fill: main, stroke: '#d8c7a8', 'stroke-width': 0.8 });
      if (id === 'duckegg') add('ellipse', { cx: 10, cy: 10, rx: 2, ry: 3, fill: '#ffffff', opacity: 0.7 });
      break;
    case 'bottle':
      add('path', { d: 'M9.5 2.5h5v3l2.5 3.5v11a2 2 0 01-2 2h-6a2 2 0 01-2-2V9l2.5-3.5z', fill: '#f4f8fb', stroke: '#9fb3c4', 'stroke-width': 1 });
      add('rect', { x: 9, y: 11, width: 6, height: 6, rx: 1, fill: id === 'goatmilk' ? '#c9a37a' : '#7cc4f2' });
      break;
    case 'yarn':
      add('circle', { cx: 12, cy: 13, r: 8.5, fill: main, stroke: '#c9c2ad', 'stroke-width': 0.8 });
      add('path', { d: 'M6 9c4 1 8 5 10 11M5 14c5 0 9 3 11 7M9 5c3 3 7 5 11 6', stroke: '#c9c2ad', 'stroke-width': 1.2, fill: 'none' });
      break;
    case 'jar':
      add('rect', { x: 6, y: 7, width: 12, height: 14, rx: 3, fill: main });
      add('rect', { x: 5.5, y: 4, width: 13, height: 4, rx: 1.5, fill: '#b07a4f' });
      add('rect', { x: 8, y: 11, width: 8, height: 5, rx: 1, fill: '#fff2d6' });
      break;
    case 'lemon':
      add('ellipse', { cx: 12, cy: 13, rx: 7, ry: 8.5, fill: main, transform: 'rotate(-35 12 13)' });
      add('path', { d: 'M15 4c3-1 5 0 6 2-2 1-4 1-6-2z', fill: leaf });
      break;
    case 'mushroom':
      add('rect', { x: 9.5, y: 12, width: 5, height: 9, rx: 2, fill: '#f6ecd8' });
      add('path', { d: 'M3.5 13c0-5 4-8.5 8.5-8.5s8.5 3.5 8.5 8.5z', fill: main });
      add('circle', { cx: 9, cy: 9, r: 1, fill: '#d9b58a' });
      add('circle', { cx: 14.5, cy: 8, r: 0.8, fill: '#d9b58a' });
      break;
    case 'nut':
      add('path', { d: 'M12 3c5 0 8 4 8 9.5S16.5 21 12 21 4 18 4 12.5 7 3 12 3z', fill: main });
      add('path', { d: 'M12 4v16M7 8c3 2 7 2 10 0M6.5 14c3.5 2 7.5 2 11 0', stroke: '#6b4a2e', 'stroke-width': 0.9, fill: 'none', opacity: 0.6 });
      break;
    default: // berries, round fruit and veg
      add('circle', { cx: 12, cy: 13.5, r: 8, fill: main });
      if (id === 'strawberry') for (const [x, y] of [[9, 12], [13, 11], [15, 15], [10, 16], [12, 19]]) add('circle', { cx: x!, cy: y!, r: 0.7, fill: accent });
      add('path', { d: 'M12 6c-3-3-6-2-6-2 1 3 4 3.5 6 2zM12 6c3-3 6-2 6-2-1 3-4 3.5-6 2z', fill: leaf });
  }
  return svg;
}

/** Stars as a small row of filled and empty star shapes (with a text label for screen readers). */
export function starsEl(n: number, size = 14): HTMLElement {
  const span = document.createElement('span');
  span.className = 'stars';
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `${n} star${n === 1 ? '' : 's'}`);
  for (let i = 1; i <= 3; i++) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(el('path', { d: 'M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z', fill: i <= n ? '#ffc93d' : 'none', stroke: i <= n ? '#e3a21a' : '#c9c2ad', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    span.appendChild(svg);
  }
  return span;
}
