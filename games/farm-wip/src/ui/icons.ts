/**
 * Interface icons, drawn in code as small SVGs (no image files, no emoji fonts needed). Each is on
 * a 24 × 24 grid with rounded, chunky shapes in the game's colours.
 */

const NS = 'http://www.w3.org/2000/svg';

type Shape = [tag: string, attrs: Record<string, string | number>];
const c = (cx: number, cy: number, r: number, fill: string, extra: Record<string, string | number> = {}): Shape => ['circle', { cx, cy, r, fill, ...extra }];
const p = (d: string, fill: string, extra: Record<string, string | number> = {}): Shape => ['path', { d, fill, ...extra }];
const r = (x: number, y: number, w: number, h: number, rx: number, fill: string, extra: Record<string, string | number> = {}): Shape => ['rect', { x, y, width: w, height: h, rx, fill, ...extra }];
const line = (d: string, stroke: string, width = 2.4): Shape => ['path', { d, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }];

const INK = '#3d3a2f';

export const ICONS = {
  // the coin: a wheat-sheaf stamp on a gold disc
  coin: [c(12, 12, 10, '#f6c445'), c(12, 12, 7.6, '#ffd96b'), line('M12 7.5v9M12 10.5l-2.5-2M12 10.5l2.5-2M12 13.5l-2.5-2M12 13.5l2.5-2', '#c98a1b', 1.6)],
  star: [p('M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z', '#ffc93d', { stroke: '#e3a21a', 'stroke-width': 1.2, 'stroke-linejoin': 'round' })],
  level: [c(12, 12, 10, '#7cc4f2'), p('M12 5.5l2 4.2 4.6.6-3.3 3.1.8 4.6L12 15.8 7.9 18l.8-4.6-3.3-3.1 4.6-.6z', '#fff')],
  spring: [p('M12 21V11', 'none', { stroke: '#5aa64a', 'stroke-width': 2.6, 'stroke-linecap': 'round' }), p('M12 12c-5 0-7-3-7-7 4 0 7 2 7 7z', '#7cc95a'), p('M12 10c0-4 2.5-6.5 7-6.5 0 4.5-3 6.5-7 6.5z', '#9ad874')],
  summer: [c(12, 12, 5.2, '#ffc53d'), line('M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8', '#ffb020', 2.2)],
  autumn: [p('M12 2.5l2.2 4.6 4.6-1.2-1.3 4.8 4 2.2-4.4 2 .9 4.6-4.4-1.8L12 21.5l-1.6-3.8-4.4 1.8.9-4.6-4.4-2 4-2.2-1.3-4.8 4.6 1.2z', '#f0a040', { stroke: '#d9792a', 'stroke-width': 1, 'stroke-linejoin': 'round' })],
  winter: [line('M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2', '#6aaecb', 2)],
  menu: [line('M5 7h14M5 12h14M5 17h14', INK, 2.6)],
  close: [line('M6.5 6.5l11 11M17.5 6.5l-11 11', INK, 2.8)],
  turnLeft: [line('M8.5 6.5H14a5 5 0 010 10h-4', INK, 2.6), line('M11 3.5L8 6.5l3 3', INK, 2.6)],
  turnRight: [line('M15.5 6.5H10a5 5 0 000 10h4', INK, 2.6), line('M13 3.5l3 3-3 3', INK, 2.6)],
  zoomIn: [c(10.5, 10.5, 6.5, 'none', { stroke: INK, 'stroke-width': 2.4 }), line('M15.5 15.5L20 20M10.5 7.8v5.4M7.8 10.5h5.4', INK, 2.4)],
  zoomOut: [c(10.5, 10.5, 6.5, 'none', { stroke: INK, 'stroke-width': 2.4 }), line('M15.5 15.5L20 20M7.8 10.5h5.4', INK, 2.4)],
  gear: [c(12, 12, 7.2, '#8b8fa3'), c(12, 12, 3, '#fff'), ...[0, 1, 2, 3, 4, 5].map(i => r(10.6, 1.8, 2.8, 4.4, 1.2, '#8b8fa3', { transform: `rotate(${i * 60} 12 12)` }))],
  sound: [p('M4 9.5h3.5L12 5.5v13l-4.5-4H4z', INK), line('M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11', INK, 2)],
  speak: [p('M4 9.5h3.5L12 5.5v13l-4.5-4H4z', '#4b8fd6'), line('M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11', '#4b8fd6', 2)],
  farm: [p('M3.5 20.5V11L12 4.5l8.5 6.5v9.5z', '#e25c4a'), r(9.3, 13.5, 5.4, 7, 1, '#fff2d6'), p('M3 11.3L12 4.3l9 7', 'none', { stroke: '#fff', 'stroke-width': 1.4 })],
  seeds: [r(5, 4, 14, 17, 2.5, '#f2d38c'), r(5, 4, 14, 5, 2.5, '#d9a84a'), c(12, 14, 3.2, '#7cc95a'), p('M12 14c0-2 1.2-3.4 3.4-3.4 0 2.1-1.4 3.4-3.4 3.4z', '#5aa64a')],
  build: [r(3.5, 15, 17, 5.5, 1.5, '#d9a84a'), r(6, 9.5, 12, 5.5, 1.5, '#e8c070'), r(8.5, 4, 7, 5.5, 1.5, '#f2d38c')],
  orders: [r(5, 3.5, 14, 18, 2.4, '#fff7e6', { stroke: '#d9a84a', 'stroke-width': 1.6 }), r(8.5, 2, 7, 3.5, 1.2, '#d9a84a'), line('M8.5 10h7M8.5 13.5h7M8.5 17h4.5', '#c08a2e', 1.8)],
  books: [r(4, 5, 7.5, 15, 1.4, '#7cc4f2'), r(12.5, 5, 7.5, 15, 1.4, '#9ad874'), line('M6 8.5h3.5M14.5 8.5H18', '#fff', 1.6)],
  ledger: [r(4, 3.5, 16, 17, 2.4, '#fff7e6', { stroke: '#8b8fa3', 'stroke-width': 1.4 }), r(7, 13, 2.6, 5, 0.6, '#7cc95a'), r(10.7, 9.5, 2.6, 8.5, 0.6, '#f6c445'), r(14.4, 11, 2.6, 7, 0.6, '#7cc4f2')],
  water: [p('M5 11h10v8a2 2 0 01-2 2H7a2 2 0 01-2-2z', '#7cc4f2'), p('M15 13l5-4 1 1.5-5 4.5z', '#7cc4f2'), line('M7 11V8.5a3 3 0 016 0V11', '#3f8fc9', 2), c(20.5, 6, 1.1, '#5aa7e0'), c(18.5, 4, 0.9, '#5aa7e0')],
  compost: [p('M6 7h12l1.5 13a2 2 0 01-2 2h-11a2 2 0 01-2-2z', '#c9a16e'), p('M7 7l1-3h8l1 3', '#b08452'), c(12, 15, 3.2, '#7d5a3d'), p('M12 15c0-2 1-3 3-3 0 2-1 3-3 3z', '#6fbf73')],
  barn: [p('M3 21V10l9-6 9 6v11z', '#e25c4a'), r(8, 13, 8, 8, 0.6, '#fff2d6'), line('M8 13l8 8M16 13l-8 8', '#e25c4a', 1.4), p('M2.5 10.3L12 4l9.5 6.3', 'none', { stroke: '#fff', 'stroke-width': 1.3 })],
  lock: [r(6, 10.5, 12, 9.5, 2.2, '#b7a27a'), line('M8.8 10.5V8a3.2 3.2 0 016.4 0v2.5', '#8a7650', 2.4), c(12, 15, 1.6, '#fff')],
  boat: [p('M3 14h18l-3 5H6z', '#e25c4a'), r(11.2, 4, 1.6, 10, 0.6, '#8a5a3b'), p('M12.8 5l5.2 7.5h-5.2z', '#fff7e6')],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 24, label?: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.classList.add('icon');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of ICONS[name]) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}
