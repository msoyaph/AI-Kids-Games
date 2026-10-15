/**
 * Interface icons, drawn in code as small SVGs (no image files, no emoji fonts needed). Each is on a
 * 24 × 24 grid with rounded, chunky shapes in the town's colours: sea teal, coral, sand and sky.
 * (The technique is games/fieldlark/src/ui/icons.ts; the town's icons are its own.)
 */

const NS = 'http://www.w3.org/2000/svg';

type Shape = [tag: string, attrs: Record<string, string | number>];
const c = (cx: number, cy: number, r: number, fill: string, extra: Record<string, string | number> = {}): Shape => ['circle', { cx, cy, r, fill, ...extra }];
const p = (d: string, fill: string, extra: Record<string, string | number> = {}): Shape => ['path', { d, fill, ...extra }];
const r = (x: number, y: number, w: number, h: number, rx: number, fill: string, extra: Record<string, string | number> = {}): Shape => ['rect', { x, y, width: w, height: h, rx, fill, ...extra }];
const line = (d: string, stroke: string, width = 2.4): Shape => ['path', { d, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }];

const INK = '#2f3a44';
const TEAL = '#2fa3b0', CORAL = '#ef6a55', SAND = '#f6d79a', SKY = '#7cc4f2', LEAF = '#5fbf7a';

export const ICONS = {
  // the coin: a little lighthouse stamped on a gold disc
  coin: [c(12, 12, 10, '#f6c445'), c(12, 12, 7.6, '#ffd96b'), p('M10.6 17.2l.6-7.4h1.6l.6 7.4z', '#c98a1b'), r(10.4, 7.6, 3.2, 2.2, 0.6, '#c98a1b'), p('M10.2 7.6L12 5.6l1.8 2z', '#c98a1b')],
  people: [c(8.5, 8, 3.2, TEAL), p('M3 19.5c0-3.6 2.5-6.2 5.5-6.2s5.5 2.6 5.5 6.2z', TEAL), c(16, 9, 2.8, CORAL), p('M11.6 19.5c.3-3 2.1-5.2 4.4-5.2 2.6 0 4.6 2.4 4.6 5.2z', CORAL)],
  smile: [c(12, 12, 10, '#ffd34d'), c(8.6, 10, 1.4, INK), c(15.4, 10, 1.4, INK), line('M7.8 14a5 5 0 008.4 0', INK, 2)],
  calmFace: [c(12, 12, 10, '#ffe08a'), c(8.6, 10, 1.4, INK), c(15.4, 10, 1.4, INK), line('M8.5 15h7', INK, 2)],
  glumFace: [c(12, 12, 10, '#ffd9a0'), c(8.6, 10, 1.4, INK), c(15.4, 10, 1.4, INK), line('M8.2 16.2a5 5 0 017.6 0', INK, 2)],
  star: [p('M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z', '#ffc93d', { stroke: '#e3a21a', 'stroke-width': 1.2, 'stroke-linejoin': 'round' })],
  summer: [c(12, 12, 5.2, '#ffc53d'), line('M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8', '#ffb020', 2.2)],
  menu: [line('M5 7h14M5 12h14M5 17h14', INK, 2.6)],
  turnLeft: [line('M8.5 6.5H14a5 5 0 010 10h-4', INK, 2.6), line('M11 3.5L8 6.5l3 3', INK, 2.6)],
  turnRight: [line('M15.5 6.5H10a5 5 0 000 10h4', INK, 2.6), line('M13 3.5l3 3-3 3', INK, 2.6)],
  zoomIn: [c(10.5, 10.5, 6.5, 'none', { stroke: INK, 'stroke-width': 2.4 }), line('M15.5 15.5L20 20M10.5 7.8v5.4M7.8 10.5h5.4', INK, 2.4)],
  zoomOut: [c(10.5, 10.5, 6.5, 'none', { stroke: INK, 'stroke-width': 2.4 }), line('M15.5 15.5L20 20M7.8 10.5h5.4', INK, 2.4)],
  close: [line('M6.5 6.5l11 11M17.5 6.5l-11 11', INK, 2.8)],
  gear: [c(12, 12, 7.2, '#8b98a3'), c(12, 12, 3, '#fff'), ...[0, 1, 2, 3, 4, 5].map(i => r(10.6, 1.8, 2.8, 4.4, 1.2, '#8b98a3', { transform: `rotate(${i * 60} 12 12)` }))],
  check: [line('M5 12.5l4.5 4.5L19 7.5', '#1f8f9c', 3)],
  lock: [r(6, 10.5, 12, 9.5, 2.2, '#a9b5bd'), line('M8.8 10.5V8a3.2 3.2 0 016.4 0v2.5', '#7f8c95', 2.4), c(12, 15, 1.6, '#fff')],
  speak: [p('M4 9.5h3.5L12 5.5v13l-4.5-4H4z', '#3f8fc9'), line('M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11', '#3f8fc9', 2)],
  info: [c(12, 12, 10, SKY), r(10.8, 10.5, 2.4, 7, 1.2, '#fff'), c(12, 7.5, 1.5, '#fff')],
  turn: [line('M18.5 12a6.5 6.5 0 11-2-4.7', INK, 2.6), line('M18.8 3.8v4.5h-4.5', INK, 2.6)],
  trash: [r(6, 8, 12, 13, 2, '#a9b5bd'), r(4.5, 5, 15, 3, 1.2, '#7f8c95'), r(9.5, 2.8, 5, 2.6, 1, '#7f8c95'), line('M10 11v7M14 11v7', '#fff', 1.6)],
  undo: [line('M8 6.5L4.5 10 8 13.5', INK, 2.6), line('M5 10h9a5 5 0 010 10h-3', INK, 2.6)],
  move: [line('M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3', INK, 2)],
  // tools
  look: [p('M8.5 11V5.5a1.5 1.5 0 013 0V10m0-1.5V4a1.5 1.5 0 013 0v5m0-.5V5.5a1.5 1.5 0 013 0V13c0 4.2-2.6 7.5-6.6 7.5-2.6 0-4.1-1.3-5.6-3.6L4.6 13.6a1.5 1.5 0 012.5-1.6L8.5 14z', '#fde3c8', { stroke: '#c98a5a', 'stroke-width': 1.3, 'stroke-linejoin': 'round' })],
  road: [p('M8 3h8l4 18H4z', '#6c7480'), line('M12 5v2.5M12 10.5v3M12 16.5v3', '#f2c84b', 1.8)],
  zones: [r(3, 3, 8, 8, 1.6, '#7fd0a6'), r(13, 3, 8, 8, 1.6, SKY), r(3, 13, 8, 8, 1.6, '#ffc97a'), r(13, 13, 8, 8, 1.6, '#c9b3ef')],
  build: [p('M4 20.5V11l6-4.5 6 4.5v9.5z', CORAL), r(8, 14, 4, 6.5, 0.8, '#fff2d6'), line('M16 20.5h4.5V8', INK, 2), line('M14 5h8M20.5 5v3', INK, 1.8)],
  park: [c(12, 9, 6.5, LEAF), c(9, 10.5, 3.6, '#4aa86a'), r(11, 13, 2, 7.5, 0.8, '#8a5a3b'), line('M5 20.5h14', '#5a9a4a', 2.2)],
  services: [p('M12 3l7.5 3v5.2c0 4.8-3.2 8.4-7.5 9.8-4.3-1.4-7.5-5-7.5-9.8V6z', SKY), line('M12 8.2v7.6M8.2 12h7.6', '#fff', 2.6)],
  transit: [r(4, 4, 16, 13.5, 3, TEAL), r(6, 6.5, 12, 5, 1.2, '#cdeff4'), c(8, 20, 1.8, INK), c(16, 20, 1.8, INK), r(7, 14, 2.5, 1.6, 0.6, '#fff4c8'), r(14.5, 14, 2.5, 1.6, 0.6, '#fff4c8')],
  overlays: [p('M12 3.5l9 4.5-9 4.5L3 8z', SKY), p('M3 12l9 4.5 9-4.5', 'none', { stroke: TEAL, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }), p('M3 15.8l9 4.5 9-4.5', 'none', { stroke: CORAL, 'stroke-width': 2.2, 'stroke-linejoin': 'round' })],
  cityhall: [p('M2.5 9L12 3.5 21.5 9z', CORAL), r(3.5, 9.5, 17, 2, 0.6, SAND), ...[5, 9.3, 13.6, 17.9].map(x => r(x - 0.9, 11.5, 2.4, 6.5, 0.6, '#fff7e6', { stroke: '#d9b979', 'stroke-width': 0.8 })), r(2.5, 18.5, 19, 2.6, 0.8, SAND)],
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
