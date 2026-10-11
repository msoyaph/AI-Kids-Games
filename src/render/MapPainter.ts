import { css, darken, lighten, mixColor } from '../core/math';
import { hashString, Rng } from '../core/rng';
import type { MapDef, ThemeId } from '../data/maps/types';
import { ballGradient, circle, ellipse, fillStroke, glowDot, polygon, roundRect, shine, softShadow, starPath, type Ctx } from './atlas/paint';

export const TILE = 64;

export interface Theme {
  ground: number;
  groundAlt: number;
  tile: number;
  road: number;
  roadEdge: number;
  water: number;
  waterLight: number;
  rock: number;
  tree: number;
  trunk: number;
  bush: number;
  flower: number[];
  bg: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  meadow: {
    ground: 0x6fcf5a,
    groundAlt: 0x5fbf4e,
    tile: 0x86e06a,
    road: 0xe8c58a,
    roadEdge: 0xb88d52,
    water: 0x3aa8f0,
    waterLight: 0x9fe4ff,
    rock: 0x9b95b0,
    tree: 0x3fae4a,
    trunk: 0x8a5a2b,
    bush: 0x4cbf55,
    flower: [0xff7ac8, 0xffe14a, 0xffffff, 0x9fd0ff],
    bg: 0x2c6b3a,
  },
  desert: {
    ground: 0xf0c977,
    groundAlt: 0xe6b964,
    tile: 0xf8d995,
    road: 0xc98c52,
    roadEdge: 0x93602f,
    water: 0x2fc4d8,
    waterLight: 0xa8f4ff,
    rock: 0xc7895a,
    tree: 0x4fae5a,
    trunk: 0x8a5a2b,
    bush: 0x9db35a,
    flower: [0xff8a5a, 0xffd94a, 0xff6fa8],
    bg: 0x8a5a2e,
  },
  snow: {
    ground: 0xe6f2ff,
    groundAlt: 0xd5e7fa,
    tile: 0xf6fbff,
    road: 0xa9d4f0,
    roadEdge: 0x6aa3cc,
    water: 0x5ab8ee,
    waterLight: 0xe0f8ff,
    rock: 0x8ea3c0,
    tree: 0x2f8a6a,
    trunk: 0x6a4a2b,
    bush: 0xb8d8ee,
    flower: [0x9fd0ff, 0xffffff, 0xd6b8ff],
    bg: 0x3a5a8a,
  },
  caves: {
    ground: 0x5a4a8f,
    groundAlt: 0x4f4082,
    tile: 0x6b5aa3,
    road: 0x8a7ab8,
    roadEdge: 0x3a2d66,
    water: 0x3ad6c8,
    waterLight: 0xb8fff4,
    rock: 0x3d3266,
    tree: 0x9b7cff,
    trunk: 0x3a2d66,
    bush: 0x7a5cc8,
    flower: [0x8ff3ff, 0xff9bf0, 0xfff27a],
    bg: 0x1e1640,
  },
};

/**
 * Paint a whole map once into a canvas (terrain, roads, water, trees, rocks).
 * Returns the canvas; the renderer turns it into one big sprite.
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

  // --- ground ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, css(lighten(th.ground, 0.08)));
  bg.addColorStop(1, css(darken(th.ground, 0.06)));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // soft blotches for texture
  for (let i = 0; i < cols * rows * 0.9; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, H);
    const r = rng.range(18, 60);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rng.chance(0.5) ? th.groundAlt : lighten(th.ground, 0.12);
    g.addColorStop(0, css(c, 0.45));
    g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // --- buildable tiles (subtle rounded squares so kids can see the grid) ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (ch !== '.' && ch !== 'o') continue;
      roundRect(ctx, x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6, 12);
      ctx.fillStyle = css(th.tile, ch === 'o' ? 0.42 : 0.28);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = css(darken(th.ground, 0.15), 0.25);
      ctx.stroke();
    }
  }

  // --- small ground details: grass blades, pebbles, flowers ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (ch !== '.' && ch !== 'o' && ch !== 'T' && ch !== 'B' && ch !== '#') continue;
      const n = rng.int(0, 2);
      for (let k = 0; k < n; k++) {
        const px = x * TILE + rng.range(8, TILE - 8);
        const py = y * TILE + rng.range(8, TILE - 8);
        if (map.theme === 'meadow' && rng.chance(0.35)) {
          const fc = rng.pick(th.flower);
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            circle(ctx, px + Math.cos(a) * 2.6, py + Math.sin(a) * 2.6, 2.2);
            ctx.fillStyle = css(fc);
            ctx.fill();
          }
          circle(ctx, px, py, 1.6);
          ctx.fillStyle = '#ffd23f';
          ctx.fill();
        } else {
          ctx.strokeStyle = css(darken(th.ground, 0.22), 0.6);
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px - 3, py + 3);
          ctx.lineTo(px - 4, py - 3);
          ctx.moveTo(px, py + 3);
          ctx.lineTo(px + 0.5, py - 5);
          ctx.moveTo(px + 3, py + 3);
          ctx.lineTo(px + 4.5, py - 2);
          ctx.stroke();
        }
      }
    }
  }

  // --- roads (union of soft blobs + connectors) ---
  const isRoad = (ch: string): boolean => ch === '=' || ch === 'S' || ch === 'C';
  const roadPass = (color: number, pad: number): void => {
    ctx.fillStyle = css(color);
    ctx.strokeStyle = css(color);
    ctx.lineCap = 'round';
    ctx.lineWidth = TILE - pad * 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!isRoad(at(x, y)) || (map.style === 'maze' && at(x, y) !== '=')) continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        roundRect(ctx, x * TILE + pad, y * TILE + pad, TILE - pad * 2, TILE - pad * 2, 18);
        ctx.fill();
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ] as const) {
          if (isRoad(at(x + dx, y + dy)) && !(map.style === 'maze' && at(x + dx, y + dy) !== '=')) {
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
    roadPass(th.roadEdge, 2);
    roadPass(th.road, 7);
    // pebbles on road
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (at(x, y) !== '=') continue;
        for (let k = 0; k < 3; k++) {
          ellipse(ctx, x * TILE + rng.range(12, 52), y * TILE + rng.range(12, 52), rng.range(1.5, 3.5), rng.range(1.2, 2.5));
          ctx.fillStyle = css(darken(th.road, 0.18), 0.6);
          ctx.fill();
        }
      }
    }
  }

  // --- water (soft union with shoreline) ---
  const waterPass = (color: number, pad: number, alpha = 1): void => {
    ctx.fillStyle = css(color, alpha);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (at(x, y) !== '~') continue;
        const l = at(x - 1, y) === '~' ? 0 : pad;
        const r = at(x + 1, y) === '~' ? 0 : pad;
        const t = at(x, y - 1) === '~' ? 0 : pad;
        const b = at(x, y + 1) === '~' ? 0 : pad;
        roundRect(ctx, x * TILE + l, y * TILE + t, TILE - l - r, TILE - t - b, pad > 0 ? 16 : 0);
        ctx.fill();
      }
    }
  };
  waterPass(lighten(th.water, 0.55), 1);
  waterPass(th.water, 6);
  waterPass(darken(th.water, 0.12), 14, 0.6);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (at(x, y) !== '~') continue;
      for (let k = 0; k < 2; k++) {
        const wx = x * TILE + rng.range(14, 50);
        const wy = y * TILE + rng.range(14, 50);
        ctx.strokeStyle = css(th.waterLight, 0.7);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(wx, wy, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }
  }

  // --- spawn burrow ground & castle courtyard ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (ch === 'C') {
        roundRect(ctx, x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2, 8);
        ctx.fillStyle = css(mixColor(th.road, 0xb9b2e8, 0.6), 0.9);
        ctx.fill();
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
      else if (ch === 'B') drawBush(ctx, map.theme, cx, cy, th, rng);
    }
  }

  // --- gentle vignette at the edges ---
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(20,10,50,0.25)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return canvas;
}

function drawRocks(ctx: Ctx, cx: number, cy: number, th: Theme, rng: Rng): void {
  softShadow(ctx, cx + 2, cy + 12, 26, 10, 0.35);
  const n = rng.int(2, 3);
  for (let i = 0; i < n; i++) {
    const rx = cx + rng.range(-10, 10);
    const ry = cy + rng.range(-8, 8);
    const r = rng.range(14, 21);
    polygon(ctx, rx, ry, rng.int(6, 8), r, rng.range(0, 1));
    fillStroke(ctx, ballGradient(ctx, rx, ry, r, th.rock), darken(th.rock, 0.5), 2);
    shine(ctx, rx - r * 0.3, ry - r * 0.35, r * 0.35, r * 0.2, 0.45);
  }
}

function drawTree(ctx: Ctx, theme: ThemeId, cx: number, cy: number, th: Theme, rng: Rng): void {
  const jx = rng.range(-5, 5);
  const jy = rng.range(-4, 4);
  cx += jx;
  cy += jy;
  softShadow(ctx, cx + 4, cy + 18, 26, 9, 0.4);
  switch (theme) {
    case 'meadow': {
      roundRect(ctx, cx - 5, cy + 2, 10, 18, 4);
      fillStroke(ctx, css(th.trunk), darken(th.trunk, 0.5), 1.5);
      const blobs = [
        [0, -10, 18],
        [-12, -2, 13],
        [12, -2, 13],
        [0, 2, 14],
      ];
      for (const [x, y, r] of blobs) {
        circle(ctx, cx + x!, cy + y!, r!);
        fillStroke(ctx, ballGradient(ctx, cx + x!, cy + y!, r!, th.tree), darken(th.tree, 0.5), 2);
      }
      if (rng.chance(0.5)) {
        for (let i = 0; i < 3; i++) {
          circle(ctx, cx + rng.range(-12, 12), cy + rng.range(-16, 4), 3);
          fillStroke(ctx, '#ff5a6a', 0x8a1020, 1);
        }
      }
      break;
    }
    case 'desert': {
      const g = th.tree;
      roundRect(ctx, cx - 8, cy - 22, 16, 42, 8);
      fillStroke(ctx, ballGradient(ctx, cx, cy - 4, 20, g), darken(g, 0.5), 2);
      roundRect(ctx, cx - 22, cy - 10, 10, 20, 5);
      fillStroke(ctx, ballGradient(ctx, cx - 17, cy, 12, g), darken(g, 0.5), 2);
      roundRect(ctx, cx + 12, cy - 16, 10, 18, 5);
      fillStroke(ctx, ballGradient(ctx, cx + 17, cy - 8, 12, g), darken(g, 0.5), 2);
      ctx.fillStyle = css(darken(g, 0.4));
      for (let i = 0; i < 5; i++) {
        circle(ctx, cx + rng.range(-4, 4), cy + rng.range(-18, 14), 1);
        ctx.fill();
      }
      if (rng.chance(0.6)) {
        circle(ctx, cx, cy - 23, 4);
        fillStroke(ctx, '#ff6fa8', 0x8a1040, 1);
      }
      break;
    }
    case 'snow': {
      roundRect(ctx, cx - 4, cy + 8, 8, 12, 3);
      fillStroke(ctx, css(th.trunk), darken(th.trunk, 0.5), 1.5);
      for (let i = 0; i < 3; i++) {
        const ty = cy + 10 - i * 12;
        const w = 24 - i * 6;
        ctx.beginPath();
        ctx.moveTo(cx - w, ty);
        ctx.lineTo(cx, ty - 20);
        ctx.lineTo(cx + w, ty);
        ctx.closePath();
        fillStroke(ctx, ballGradient(ctx, cx, ty - 8, w, th.tree), darken(th.tree, 0.5), 2);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.55, ty - 9);
        ctx.lineTo(cx, ty - 20);
        ctx.lineTo(cx + w * 0.55, ty - 9);
        ctx.quadraticCurveTo(cx, ty - 12, cx - w * 0.55, ty - 9);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      break;
    }
    case 'caves': {
      const shards = [
        [0, -6, 9, 26, 0],
        [-12, 4, 7, 17, -0.4],
        [12, 4, 7, 17, 0.4],
      ];
      glowDot(ctx, cx, cy - 4, 30, th.tree, 0.35);
      for (const [x, y, w, h, rot] of shards) {
        ctx.save();
        ctx.translate(cx + x!, cy + y!);
        ctx.rotate(rot!);
        ctx.beginPath();
        ctx.moveTo(0, -h!);
        ctx.lineTo(w!, -h! * 0.3);
        ctx.lineTo(w! * 0.6, h! * 0.5);
        ctx.lineTo(-w! * 0.6, h! * 0.5);
        ctx.lineTo(-w!, -h! * 0.3);
        ctx.closePath();
        const g = ctx.createLinearGradient(-w!, -h!, w!, h!);
        g.addColorStop(0, css(lighten(th.tree, 0.6)));
        g.addColorStop(1, css(th.tree));
        fillStroke(ctx, g, darken(th.tree, 0.55), 2);
        ctx.restore();
      }
      break;
    }
  }
}

function drawBush(ctx: Ctx, theme: ThemeId, cx: number, cy: number, th: Theme, rng: Rng): void {
  softShadow(ctx, cx + 2, cy + 12, 24, 8, 0.35);
  if (theme === 'caves' || theme === 'desert') {
    const r = rng.range(16, 22);
    polygon(ctx, cx, cy, 7, r, rng.range(0, 1));
    fillStroke(ctx, ballGradient(ctx, cx, cy, r, th.bush), darken(th.bush, 0.5), 2);
    if (theme === 'caves') {
      starPath(ctx, cx + 4, cy - 4, 4, 5, 2, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
    }
    return;
  }
  const blobs = [
    [-9, 2, 12],
    [9, 2, 12],
    [0, -5, 13],
  ];
  for (const [x, y, r] of blobs) {
    circle(ctx, cx + x!, cy + y!, r!);
    fillStroke(ctx, ballGradient(ctx, cx + x!, cy + y!, r!, th.bush), darken(th.bush, 0.5), 2);
  }
  if (theme === 'meadow') {
    for (let i = 0; i < 4; i++) {
      circle(ctx, cx + rng.range(-12, 12), cy + rng.range(-10, 6), 2.4);
      ctx.fillStyle = css(rng.pick(th.flower));
      ctx.fill();
    }
  }
}
