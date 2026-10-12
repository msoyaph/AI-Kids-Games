import { css, darken, lighten, mixColor } from '../core/math';
import { hashString, Rng } from '../core/rng';
import type { MapDef, ThemeId } from '../data/maps/types';
import { polygon, type Ctx } from './atlas/paint';
import { chamferRect, contactShadow, crystal, energyCore, facets, strokePath, TECH } from './atlas/tech';

export const TILE = 64;

export interface Theme {
  /** Base ground and a darker variation for texture. */
  ground: number;
  groundAlt: number;
  /** Engraved build plates. */
  plate: number;
  plateEdge: number;
  /** Rune / energy accent etched into the terrain. */
  rune: number;
  road: number;
  roadEdge: number;
  water: number;
  waterLight: number;
  rock: number;
  /** Small crystals growing out of rocks and scrub. */
  shard: number;
  tree: number;
  treeDark: number;
  bush: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  meadow: {
    ground: 0x355f48,
    groundAlt: 0x2a4d3a,
    plate: 0x456f57,
    plateEdge: 0x1c3527,
    rune: 0x7fffd0,
    road: 0x3a4356,
    roadEdge: 0x161b28,
    water: 0x175f92,
    waterLight: 0x7fe9ff,
    rock: 0x4f5872,
    shard: 0x7fe3d0,
    tree: 0x237a55,
    treeDark: 0x10402c,
    bush: 0x2c8a62,
  },
  desert: {
    ground: 0x9a7448,
    groundAlt: 0x83603a,
    plate: 0xab855a,
    plateEdge: 0x5a3e22,
    rune: 0xffd27a,
    road: 0x4a3f3a,
    roadEdge: 0x221a16,
    water: 0x1b8aa0,
    waterLight: 0xa8f4ff,
    rock: 0x8a5e40,
    shard: 0xffb36b,
    tree: 0x4c8a52,
    treeDark: 0x24502c,
    bush: 0x8a8a4a,
  },
  snow: {
    ground: 0xa9bdd4,
    groundAlt: 0x93a9c4,
    plate: 0xbccde1,
    plateEdge: 0x5d7190,
    rune: 0x9be7ff,
    road: 0x4a5a76,
    roadEdge: 0x1c2436,
    water: 0x2a7ab8,
    waterLight: 0xe0f8ff,
    rock: 0x66789a,
    shard: 0xbff6ff,
    tree: 0x2a6a5a,
    treeDark: 0x123a32,
    bush: 0x8aa8c8,
  },
  caves: {
    ground: 0x332d55,
    groundAlt: 0x29244a,
    plate: 0x41396a,
    plateEdge: 0x151230,
    rune: 0xd9a8ff,
    road: 0x262238,
    roadEdge: 0x0c0a18,
    water: 0x168a8a,
    waterLight: 0xb8fff4,
    rock: 0x3a3266,
    shard: 0xb48cff,
    tree: 0x8a6cff,
    treeDark: 0x3a2a7a,
    bush: 0x6a52b8,
  },
  // Skyforge Ruins: brass platforms floating over a starlit void
  sky: {
    ground: 0x5a5a6e,
    groundAlt: 0x4a4a5e,
    plate: 0x6e6a7a,
    plateEdge: 0x2a2836,
    rune: 0xffc845,
    road: 0x3e3a4a,
    roadEdge: 0x16141e,
    water: 0x0c1838,
    waterLight: 0x7fb8ff,
    rock: 0x6a5a4a,
    shard: 0xffd27a,
    tree: 0xc9923a,
    treeDark: 0x6a4a1e,
    bush: 0x8a7a5a,
  },
  // Rift Citadel: obsidian ground cut by magenta rift energy
  rift: {
    ground: 0x2a2236,
    groundAlt: 0x221b2e,
    plate: 0x3a2f4c,
    plateEdge: 0x120c1c,
    rune: 0xff6bd6,
    road: 0x1e1828,
    roadEdge: 0x0a0610,
    water: 0x5a1450,
    waterLight: 0xff8ae6,
    rock: 0x3a2e4a,
    shard: 0xff7ad9,
    tree: 0xc04ab8,
    treeDark: 0x5a1a56,
    bush: 0x6a3a7a,
  },
};

/** Cells painted as water / void / rift (chasms that bridges and sky lanes cross). */
const VOIDLIKE = '~HhYF';

/**
 * Paint a whole map once into a canvas (terrain, plates, roads, water,
 * crystals). Returns the canvas; the renderer turns it into one big sprite.
 */
export function paintMap(map: MapDef, scale: number): HTMLCanvasElement {
  const rows = map.grid.length;
  const cols = Math.max(...map.grid.map((r) => r.length));
  const W = cols * TILE;
  const H = rows * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const th = THEMES[map.theme];
  const rng = new Rng(hashString(map.id));
  const at = (x: number, y: number): string => (x < 0 || y < 0 || y >= rows || x >= cols ? '#' : (map.grid[y]![x] ?? '#'));

  // --- ground: directional light + mottled texture ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, css(lighten(th.ground, 0.1)));
  bg.addColorStop(1, css(darken(th.ground, 0.12)));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < cols * rows * 0.7; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, H);
    const r = rng.range(20, 64);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rng.chance(0.55) ? th.groundAlt : lighten(th.ground, 0.08);
    g.addColorStop(0, css(c, 0.5));
    g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fine strata lines (rock grain)
  ctx.strokeStyle = css(darken(th.ground, 0.25), 0.18);
  ctx.lineWidth = 1;
  for (let i = 0; i < rows * 3; i++) {
    const y = rng.range(0, H);
    ctx.beginPath();
    ctx.moveTo(rng.range(-40, W * 0.5), y);
    ctx.lineTo(rng.range(W * 0.5, W + 40), y + rng.range(-12, 12));
    ctx.stroke();
  }

  // --- build plates: engraved stone slabs with rune corners ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (ch !== '.' && ch !== 'o' && ch !== 'R') continue;
      const px = x * TILE;
      const py = y * TILE;
      chamferRect(ctx, px + 3, py + 3, TILE - 6, TILE - 6, 8);
      const pg = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
      pg.addColorStop(0, css(lighten(th.plate, 0.07), ch === 'o' ? 0.95 : 0.7));
      pg.addColorStop(1, css(darken(th.plate, 0.08), ch === 'o' ? 0.95 : 0.7));
      ctx.fillStyle = pg;
      ctx.fill();
      strokePath(ctx, th.plateEdge, 1.4, 0.55);
      // bevel highlight
      ctx.strokeStyle = css(lighten(th.plate, 0.35), 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 11, py + 4);
      ctx.lineTo(px + TILE - 11, py + 4);
      ctx.stroke();
      // rune corner ticks
      ctx.strokeStyle = css(th.rune, ch === 'o' ? 0.28 : 0.18);
      ctx.lineWidth = 1.5;
      const m = 9;
      const k = 7;
      ctx.beginPath();
      ctx.moveTo(px + m, py + m + k);
      ctx.lineTo(px + m, py + m);
      ctx.lineTo(px + m + k, py + m);
      ctx.moveTo(px + TILE - m - k, py + TILE - m);
      ctx.lineTo(px + TILE - m, py + TILE - m);
      ctx.lineTo(px + TILE - m, py + TILE - m - k);
      ctx.stroke();
    }
  }

  // --- small details: crystal sprouts and pebbles ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (ch !== '.' && ch !== 'o' && ch !== 'T' && ch !== 'B' && ch !== '#') continue;
      if (!rng.chance(0.22)) continue;
      const px = x * TILE + rng.range(10, TILE - 10);
      const py = y * TILE + rng.range(10, TILE - 10);
      if (rng.chance(0.5)) {
        for (let i = 0; i < 3; i++) crystal(ctx, px + (i - 1) * 3, py, rng.range(5, 8), 2.4, -Math.PI / 2 + (i - 1) * 0.4, th.shard, 0.7);
      } else {
        polygon(ctx, px, py, 5, rng.range(1.8, 3.2), rng.range(0, 2));
        ctx.fillStyle = css(darken(th.ground, 0.3), 0.7);
        ctx.fill();
      }
    }
  }

  // --- roads: slate paving with glowing edge seams ---
  const isRoad = (ch: string): boolean => ch === '=' || ch === 'S' || ch === 'C';
  const roadCell = (x: number, y: number): boolean => isRoad(at(x, y)) && !(map.style === 'maze' && at(x, y) !== '=');
  const roadPass = (color: number, pad: number, alpha = 1): void => {
    ctx.fillStyle = css(color, alpha);
    ctx.strokeStyle = css(color, alpha);
    ctx.lineCap = 'butt';
    ctx.lineWidth = TILE - pad * 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!roadCell(x, y)) continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        chamferRect(ctx, x * TILE + pad, y * TILE + pad, TILE - pad * 2, TILE - pad * 2, 10);
        ctx.fill();
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ] as const) {
          if (roadCell(x + dx, y + dy)) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx * TILE, cy + dy * TILE);
            ctx.stroke();
          }
        }
      }
    }
  };
  if (map.style === 'path' || map.grid.some((r) => r.includes('='))) {
    roadPass(th.rune, 1, 0.35);
    roadPass(th.roadEdge, 3);
    roadPass(th.road, 7);
    // paving seams
    ctx.strokeStyle = css(darken(th.road, 0.35), 0.7);
    ctx.lineWidth = 1.2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (at(x, y) !== '=') continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.beginPath();
        ctx.moveTo(px + 10, py + TILE / 2 + rng.range(-8, 8));
        ctx.lineTo(px + TILE - 10, py + TILE / 2 + rng.range(-8, 8));
        ctx.moveTo(px + TILE / 2 + rng.range(-8, 8), py + 10);
        ctx.lineTo(px + TILE / 2 + rng.range(-8, 8), py + TILE / 2);
        ctx.stroke();
      }
    }
  }

  // --- water: deep pools with luminous shorelines ---
  const waterPass = (color: number, pad: number, alpha = 1): void => {
    ctx.fillStyle = css(color, alpha);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!VOIDLIKE.includes(at(x, y))) continue;
        const vl = (xx: number, yy: number): boolean => VOIDLIKE.includes(at(xx, yy));
        const l = vl(x - 1, y) ? 0 : pad;
        const r = vl(x + 1, y) ? 0 : pad;
        const t = vl(x, y - 1) ? 0 : pad;
        const b = vl(x, y + 1) ? 0 : pad;
        chamferRect(ctx, x * TILE + l, y * TILE + t, TILE - l - r, TILE - t - b, pad > 0 ? 10 : 0);
        ctx.fill();
      }
    }
  };
  waterPass(th.waterLight, 2, 0.55);
  waterPass(darken(th.water, 0.25), 5);
  waterPass(th.water, 9, 0.85);
  waterPass(darken(th.water, 0.45), 18, 0.55);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!VOIDLIKE.includes(at(x, y))) continue;
      if (map.theme === 'sky') {
        // starlight in the void
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = css(0xffffff, rng.range(0.3, 0.8));
          ctx.fillRect(x * TILE + rng.range(6, 58), y * TILE + rng.range(6, 58), 1.6, 1.6);
        }
        continue;
      }
      ctx.strokeStyle = css(th.waterLight, 0.45);
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 2; k++) {
        const wx = x * TILE + rng.range(14, 50);
        const wy = y * TILE + rng.range(14, 50);
        ctx.beginPath();
        ctx.moveTo(wx - 6, wy);
        ctx.lineTo(wx + 6, wy);
        ctx.stroke();
      }
    }
  }

  // --- castle courtyard ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (at(x, y) !== 'C') continue;
      chamferRect(ctx, x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2, 6);
      ctx.fillStyle = css(mixColor(th.road, 0x2a3a5c, 0.5), 0.95);
      ctx.fill();
      strokePath(ctx, TECH.cyan, 1, 0.35);
    }
  }

  // --- special tiles: gates, sky lane, unstable ground, bridge anchors ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if ('PQpq'.includes(ch)) {
        // gate pad: engraved hex ring (the swirl is animated by the renderer)
        polygon(ctx, cx, cy, 6, 27, Math.PI / 6);
        ctx.fillStyle = css(darken(th.road, 0.2), 0.95);
        ctx.fill();
        strokePath(ctx, ch === 'P' || ch === 'p' ? th.rune : TECH.cyan, 2.4, 0.9);
      } else if (ch === 'F' || ch === 'Y') {
        // sky lane: a ribbon of guide lights over the void
        ctx.fillStyle = css(th.rune, 0.16);
        ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(cx + (k - 1) * 16, cy, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = css(th.rune, 0.85);
          ctx.fill();
        }
      } else if (ch === 'U') {
        // unstable ground: crystal veins about to erupt
        chamferRect(ctx, x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6, 8);
        ctx.fillStyle = css(darken(th.ground, 0.15), 0.9);
        ctx.fill();
        ctx.strokeStyle = css(th.shard, 0.75);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x * TILE + 10, y * TILE + 20);
        ctx.lineTo(cx, cy);
        ctx.lineTo(x * TILE + 50, y * TILE + 14);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 4, y * TILE + 54);
        ctx.stroke();
      } else if ((ch === 'H' || ch === 'h') && map.theme !== 'sky') {
        // keep non-sky bridges readable over water
        ctx.strokeStyle = css(th.waterLight, 0.3);
        ctx.strokeRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
      }
    }
  }

  // --- obstacles, drawn top-to-bottom so lower ones overlap ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (ch === '#') drawRocks(ctx, cx, cy, th, rng);
      else if (ch === 'T') drawTree(ctx, map.theme, cx, cy, th, rng);
      else if (ch === 'B') drawBush(ctx, cx, cy, th, rng);
    }
  }

  // --- dramatic vignette ---
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(4,6,18,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return canvas;
}

function drawRocks(ctx: Ctx, cx: number, cy: number, th: Theme, rng: Rng): void {
  contactShadow(ctx, cx + 2, cy + 12, 26, 10, 0.5);
  const n = rng.int(2, 3);
  for (let i = 0; i < n; i++) {
    const rx = cx + rng.range(-10, 10);
    const ry = cy + rng.range(-8, 8);
    const r = rng.range(13, 20);
    const pts: [number, number][] = [];
    const sides = rng.int(5, 7);
    const rot = rng.range(0, 1);
    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2;
      const rr = r * rng.range(0.8, 1.05);
      pts.push([rx + Math.cos(a) * rr, ry + Math.sin(a) * rr]);
    }
    facets(ctx, rx - r * 0.2, ry - r * 0.25, pts, th.rock, TECH.ink, 1.6);
  }
  if (rng.chance(0.6)) for (let i = 0; i < 2; i++) crystal(ctx, cx + rng.range(-8, 8), cy - 6, rng.range(9, 14), 4, -Math.PI / 2 + rng.range(-0.5, 0.5), th.shard, 1);
}

function drawTree(ctx: Ctx, theme: ThemeId, cx: number, cy: number, th: Theme, rng: Rng): void {
  cx += rng.range(-5, 5);
  cy += rng.range(-4, 4);
  contactShadow(ctx, cx + 4, cy + 18, 24, 9, 0.55);
  if (theme === 'sky') {
    // brass pylon with a hovering crystal
    chamferRect(ctx, cx - 7, cy - 14, 14, 32, 4);
    const g = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0);
    g.addColorStop(0, css(lighten(th.tree, 0.3)));
    g.addColorStop(1, css(th.treeDark));
    ctx.fillStyle = g;
    ctx.fill();
    strokePath(ctx, TECH.ink, 1.5);
    crystal(ctx, cx, cy - 24, 14, 6, -Math.PI / 2, th.shard, 1.2);
    return;
  }
  if (theme === 'caves' || theme === 'rift') {
    // crystal formation
    energyCore(ctx, cx, cy - 4, 12, th.tree, 1.8);
    crystal(ctx, cx, cy - 8, 34, 12, -Math.PI / 2, th.tree, 1.6);
    crystal(ctx, cx - 11, cy + 2, 22, 9, -Math.PI / 2 - 0.45, lighten(th.tree, 0.15), 1.4);
    crystal(ctx, cx + 11, cy + 2, 22, 9, -Math.PI / 2 + 0.45, darken(th.tree, 0.1), 1.4);
    return;
  }
  if (theme === 'desert') {
    // angular cactus pillars
    for (const [ox, h, w] of [
      [0, 40, 14],
      [-12, 22, 9],
      [12, 26, 9],
    ] as const) {
      chamferRect(ctx, cx + ox - w / 2, cy + 16 - h, w, h, 4);
      const g = ctx.createLinearGradient(cx + ox - w / 2, 0, cx + ox + w / 2, 0);
      g.addColorStop(0, css(lighten(th.tree, 0.25)));
      g.addColorStop(1, css(th.treeDark));
      ctx.fillStyle = g;
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.5);
    }
    return;
  }
  // angular conifer (meadow / snow)
  ctx.fillStyle = css(darken(th.treeDark, 0.2));
  ctx.fillRect(cx - 3, cy + 6, 6, 12);
  for (let i = 0; i < 3; i++) {
    const ty = cy + 12 - i * 11;
    const w = 22 - i * 5;
    const pts: [number, number][] = [
      [cx, ty - 20],
      [cx + w, ty],
      [cx, ty + 3],
      [cx - w, ty],
    ];
    facets(ctx, cx - 2, ty - 6, pts, i === 0 ? th.treeDark : th.tree, TECH.ink, 1.5);
    if (theme === 'snow') {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, ty - 10);
      ctx.lineTo(cx, ty - 20);
      ctx.lineTo(cx + w * 0.45, ty - 11);
      ctx.closePath();
      ctx.fillStyle = 'rgba(240,248,255,0.95)';
      ctx.fill();
    }
  }
}

function drawBush(ctx: Ctx, cx: number, cy: number, th: Theme, rng: Rng): void {
  contactShadow(ctx, cx + 2, cy + 12, 22, 8, 0.45);
  const pts: [number, number][] = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const rr = rng.range(14, 19);
    pts.push([cx + Math.cos(a) * rr, cy + 2 + Math.sin(a) * rr * 0.75]);
  }
  facets(ctx, cx - 3, cy - 2, pts, th.bush, TECH.ink, 1.5);
  for (let i = 0; i < 3; i++) crystal(ctx, cx + (i - 1) * 7, cy - 8, rng.range(9, 13), 4, -Math.PI / 2 + (i - 1) * 0.35, th.shard, 1);
}
