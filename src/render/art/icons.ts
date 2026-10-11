/** UI icons and tool icons (16×16), kept raw for the DOM icon sheet. */
import type { Atlas } from '../atlas';
import { P } from '../palette';
import { PixelCanvas, darken, lighten } from '../pixelcanvas';

export const TIER_COLORS = [0x9a98a8, 0xd2803a, 0xdfe4ee, 0xf5c838];
export { TIER_NAMES } from '../../data/items';

const ic = () => new PixelCanvas(16, 16);

function coin(): PixelCanvas {
  const c = ic();
  c.circle(8, 8, 6, P.y1);
  c.circle(8, 8, 4.5, P.o3);
  c.circle(8, 8, 3.5, P.y1);
  c.vline(8, 5, 10, P.o2);
  c.set(6, 5, P.y3);
  c.outline(P.ink);
  return c;
}

function sun(): PixelCanvas {
  const c = ic();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    c.line(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, P.o3);
  }
  c.circle(8, 8, 4, P.y1);
  c.circle(7, 7, 2, P.y2);
  c.outline(P.ink);
  return c;
}

function cloud(c: PixelCanvas, y: number, col: number): void {
  c.ellipse(8, y, 6, 3, col);
  c.circle(6, y - 2, 3, col);
  c.circle(10, y - 2.5, 3.2, col);
}

function rain(): PixelCanvas {
  const c = ic();
  cloud(c, 7, P.s4);
  for (const x of [4, 8, 12]) c.line(x, 11, x - 1, 14, P.bl2);
  c.outline(P.ink);
  return c;
}

function storm(): PixelCanvas {
  const c = ic();
  cloud(c, 6, P.s2);
  c.line(9, 9, 6, 12, P.y1);
  c.line(6, 12, 9, 12, P.y1);
  c.line(9, 12, 7, 15, P.y1);
  c.outline(P.ink);
  return c;
}

function wind(): PixelCanvas {
  const c = ic();
  c.hline(2, 10, 5, P.s4);
  c.set(11, 4, P.s4); c.set(12, 3, P.s4); c.set(11, 2, P.s4);
  c.hline(1, 13, 9, P.s4);
  c.set(14, 10, P.s4); c.set(14, 11, P.s4); c.set(13, 12, P.s4);
  c.ellipse(5, 13, 2, 1.2, P.o2);
  c.outline(P.ink);
  return c;
}

function snow(): PixelCanvas {
  const c = ic();
  c.line(8, 2, 8, 14, P.snow2);
  c.line(3, 5, 13, 11, P.snow2);
  c.line(3, 11, 13, 5, P.snow2);
  c.circle(8, 8, 1.5, P.bl3);
  c.outline(P.bl1);
  return c;
}

function seasonIcon(s: number): PixelCanvas {
  const c = ic();
  if (s === 0) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      c.circle(8 + Math.cos(a) * 3.5, 8 + Math.sin(a) * 3.5, 2.6, P.k2);
    }
    c.circle(8, 8, 2, P.y1);
  } else if (s === 1) return sun();
  else if (s === 2) {
    c.ellipse(8, 7, 5, 6, P.o2);
    c.line(8, 2, 8, 14, P.o1);
    c.line(8, 13, 9, 15, P.b2);
    c.set(5, 5, P.o3);
  } else return snow();
  c.outline(P.ink);
  return c;
}

function energy(): PixelCanvas {
  const c = ic();
  c.rows(
    ['.......aa', '......aa.', '.....aa..', '....aaaa.', '...aaaaa.', '....aa...', '...aa....', '..aa.....', '..a......'],
    { a: P.y1 },
    3,
    3,
  );
  c.outline(P.ink);
  return c;
}

function heart(full: boolean): PixelCanvas {
  const c = ic();
  const rows = ['.aa.aa.', 'abbabba', 'abbbbba', '.abbba.', '..aba..', '...a...'];
  c.rows(rows, { a: P.ink, b: full ? P.r2 : P.s3 }, 4, 5);
  if (full) c.set(6, 6, P.r3);
  return c;
}

function star(col: number): PixelCanvas {
  const c = ic();
  c.rows(['...a...', '..aaa..', 'aaaaaaa', '.aaaaa.', '.aa.aa.', 'a.....a'], { a: col }, 4, 4);
  c.set(7, 6, lighten(col, 0.4));
  c.outline(P.ink);
  return c;
}

function bag(): PixelCanvas {
  const c = ic();
  c.ellipse(8, 10, 6, 5, P.b4);
  c.rect(5, 3, 6, 4, P.b4);
  c.hline(4, 11, 6, P.b2);
  c.set(7, 9, P.y1);
  c.outline(P.ink);
  return c;
}

function gear(): PixelCanvas {
  const c = ic();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    c.circle(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, 1.6, P.s3);
  }
  c.circle(8, 8, 5, P.s3);
  c.circle(8, 8, 2, P.s1);
  c.outline(P.ink);
  return c;
}

function menu(): PixelCanvas {
  const c = ic();
  for (const y of [4, 8, 12]) c.rect(3, y - 1, 10, 2, P.cream);
  c.outline(P.ink);
  return c;
}

function mapIcon(): PixelCanvas {
  const c = ic();
  c.rect(2, 3, 12, 10, P.sa3);
  c.vline(6, 3, 12, P.sa1); c.vline(10, 3, 12, P.sa1);
  c.line(3, 10, 8, 6, P.r2); c.set(12, 5, P.r2); c.set(11, 6, P.r2);
  c.outline(P.ink);
  return c;
}

function book(): PixelCanvas {
  const c = ic();
  c.rect(3, 2, 10, 12, P.r1);
  c.rect(4, 3, 8, 10, P.r2);
  c.rect(11, 3, 2, 11, P.white);
  c.rect(6, 5, 4, 2, P.y1);
  c.outline(P.ink);
  return c;
}

function moon(): PixelCanvas {
  const c = ic();
  c.circle(8, 8, 6, P.y2);
  c.circle(11, 6, 5, -1);
  c.outline(P.ink);
  return c;
}

function hand(): PixelCanvas {
  const c = ic();
  c.rect(4, 7, 8, 7, P.sk1);
  for (let x = 4; x < 12; x += 2) c.rect(x, 3, 2, 5, P.sk1);
  c.rect(1, 8, 3, 2, P.sk1);
  c.outline(P.ink);
  return c;
}

function chat(): PixelCanvas {
  const c = ic();
  c.ellipse(8, 7, 7, 5, P.white);
  c.line(4, 11, 3, 14, P.white); c.line(5, 11, 3, 14, P.white);
  for (const x of [5, 8, 11]) c.set(x, 7, P.ink2);
  c.outline(P.ink);
  return c;
}

// ── Tools ─────────────────────────────────────────────────
function handle(c: PixelCanvas, x0: number, y0: number, x1: number, y1: number): void {
  c.line(x0, y0, x1, y1, P.b3);
  c.line(x0 + 1, y0, x1 + 1, y1, P.b2);
}

export function toolIcon(tool: string, tier: number): PixelCanvas {
  const c = ic();
  const m = TIER_COLORS[Math.max(0, tier)], md = darken(m, 0.3), ml = lighten(m, 0.35);
  switch (tool) {
    case 'hoe':
      handle(c, 3, 14, 11, 4);
      c.rect(9, 2, 5, 3, m);
      c.rect(12, 2, 2, 6, m);
      c.vline(13, 2, 7, md);
      c.hline(9, 12, 2, ml);
      break;
    case 'can':
      c.ellipse(7, 10, 5, 4, m);
      c.rect(3, 6, 8, 4, m);
      c.line(11, 9, 14, 5, md);
      c.line(11, 10, 14, 6, m);
      c.rect(13, 3, 2, 2, md);
      c.line(4, 5, 7, 2, md);
      c.line(7, 2, 10, 5, md);
      c.hline(4, 8, 7, ml);
      c.set(6, 11, P.w3);
      break;
    case 'axe':
      handle(c, 2, 14, 9, 4);
      c.line(7, 2, 12, 7, md);
      c.line(8, 2, 13, 7, m);
      c.line(8, 1, 13, 6, m);
      c.line(9, 1, 14, 6, m);
      c.line(10, 1, 14, 5, ml);
      c.set(14, 7, md);
      break;
    case 'pick':
      handle(c, 4, 14, 9, 5);
      c.line(2, 6, 7, 2, m);
      c.line(7, 2, 13, 3, m);
      c.line(13, 3, 15, 7, m);
      c.line(3, 6, 8, 3, md);
      c.line(8, 3, 13, 4, md);
      c.set(7, 1, ml);
      break;
    case 'scythe':
      handle(c, 4, 15, 9, 3);
      c.line(9, 3, 14, 4, m);
      c.line(14, 4, 15, 8, m);
      c.line(9, 4, 13, 5, ml);
      break;
    case 'rod':
      c.line(2, 14, 13, 2, P.b3);
      c.line(2, 13, 13, 1, tier >= 1 ? m : P.b4);
      c.circle(5, 11, 1.6, P.s2);
      c.line(13, 2, 14, 10, P.white);
      c.set(14, 11, P.r2);
      break;
    case 'bonk':
      handle(c, 3, 14, 9, 7);
      c.ellipse(11, 5, 4, 3.5, tier >= 1 ? m : P.k2);
      c.ellipse(10, 4, 2, 1.5, P.white);
      break;
    case 'sling':
      c.line(8, 15, 8, 9, P.b3);
      c.line(8, 9, 4, 3, P.b3);
      c.line(8, 9, 12, 3, P.b3);
      c.line(4, 3, 8, 7, P.r2);
      c.line(12, 3, 8, 7, P.r2);
      break;
  }
  c.outline(P.ink);
  return c;
}

export const TOOL_IDS = ['hoe', 'can', 'axe', 'pick', 'scythe', 'rod', 'bonk', 'sling'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export function bakeIcons(atlas: Atlas): void {
  const add = (n: string, c: PixelCanvas) => atlas.add(n, c, true);
  add('ui.coin', coin());
  add('ui.sun', sun());
  add('ui.rain', rain());
  add('ui.storm', storm());
  add('ui.wind', wind());
  add('ui.snow', snow());
  for (let s = 0; s < 4; s++) add(`ui.season${s}`, seasonIcon(s));
  add('ui.energy', energy());
  add('ui.heart', heart(true));
  add('ui.heartEmpty', heart(false));
  add('ui.star1', star(0xc8d0dc));
  add('ui.star2', star(P.y1));
  add('ui.star3', star(P.p3));
  add('ui.bag', bag());
  add('ui.gear', gear());
  add('ui.menu', menu());
  add('ui.map', mapIcon());
  add('ui.book', book());
  add('ui.moon', moon());
  add('ui.hand', hand());
  add('ui.chat', chat());
  for (const t of TOOL_IDS) for (let tier = 0; tier < 4; tier++) add(`item.tool.${t}.${tier}`, toolIcon(t, tier));
}
