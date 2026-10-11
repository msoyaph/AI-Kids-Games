import { Rng } from '../../core/rng';
import type { Theme } from '../../data/themes';
import type { DecoArt, MachineArt } from '../../data/levelTypes';
import type { SpriteDef } from '../atlas';
import { blob, circle, ellipse, glowDot, ink, linear, lumpyCircle, poly, radial, roundRect, softStar, cuteFace, type Ctx } from '../canvas';
import { C, rgba, shade } from '../palette';

const S = 48;

function speckle(ctx: Ctx, rng: Rng, color: string, n: number, w = S, h = S, y0 = 0): void {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) ctx.fill(circle(rng.range(3, w - 3), rng.range(y0 + 3, h - 3), rng.range(1.5, 3.5)));
}

function groundFill(ctx: Ctx, th: Theme, seed: number): void {
  const rng = new Rng(seed);
  ctx.fillStyle = linear(ctx, 0, 0, 0, S, [[0, th.ground], [1, th.ground2]]);
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, rng, rgba(shade(th.ground, -0.3), 0.5), 4);
  speckle(ctx, rng, rgba(shade(th.ground, 0.25), 0.4), 3);
}

/** Top ground tile; edges: 1 = left open, 2 = right open, 3 = both. */
function groundTop(ctx: Ctx, th: Theme, edges: number, seed: number): void {
  const rng = new Rng(seed);
  ctx.save();
  const body = new Path2D();
  const rl = edges & 1 ? 12 : 0;
  const rr = edges & 2 ? 12 : 0;
  body.moveTo(rl, 8);
  body.lineTo(S - rr, 8);
  if (rr) body.quadraticCurveTo(S, 8, S, 8 + rr);
  body.lineTo(S, S);
  body.lineTo(0, S);
  if (rl) {
    body.lineTo(0, 8 + rl);
    body.quadraticCurveTo(0, 8, rl, 8);
  }
  body.closePath();
  ctx.fillStyle = linear(ctx, 0, 0, 0, S, [[0, shade(th.ground, 0.08)], [1, th.ground2]]);
  ctx.fill(body);
  ctx.clip(body);
  speckle(ctx, rng, rgba(shade(th.ground, -0.3), 0.5), 3, S, S, 18);
  ctx.restore();
  // Surface layer.
  const surf = new Path2D();
  surf.moveTo(rl, 6);
  for (let x = rl; x <= S - rr; x += 8) surf.lineTo(x, 4 + Math.sin(x * 0.5 + seed) * 2);
  surf.lineTo(S - rr, 6);
  surf.lineTo(S - rr * 0.3, 16);
  for (let x = S - rr; x >= rl; x -= 6) surf.lineTo(x, 15 + ((x / 6 + seed) % 2 === 0 ? 3 : 0));
  surf.lineTo(rl * 0.3, 16);
  surf.closePath();
  let col = th.surface;
  if (th.surfaceStyle === 'metal') col = th.surface;
  ctx.fillStyle = linear(ctx, 0, 0, 0, 18, [[0, shade(col, 0.25)], [1, col]]);
  ctx.fill(surf);
  if (th.surfaceStyle === 'grass' || th.surfaceStyle === 'moss') {
    ctx.fillStyle = shade(col, 0.2);
    for (let x = rl + 4; x < S - rr - 2; x += 7) ctx.fill(poly([x - 3, 6, x, -2 + (x % 3), x + 3, 6]));
  }
  if (th.surfaceStyle === 'ice' || th.surfaceStyle === 'snow' || th.surfaceStyle === 'crystal') {
    ctx.fillStyle = rgba('#ffffff', 0.8);
    ctx.fillRect(rl + 4, 6, S - rl - rr - 8, 2);
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(C.ink, 0.85);
  ctx.beginPath();
  if (rl) {
    ctx.moveTo(0, S);
    ctx.lineTo(0, 8 + rl);
    ctx.quadraticCurveTo(0, 6, rl, 5);
  } else ctx.moveTo(0, 5);
  ctx.lineTo(S - rr, 5);
  if (rr) {
    ctx.quadraticCurveTo(S, 6, S, 8 + rr);
    ctx.lineTo(S, S);
  }
  ctx.stroke();
}

function rockTile(ctx: Ctx, th: Theme, seed: number): void {
  const rng = new Rng(seed);
  const p = roundRect(1.5, 1.5, S - 3, S - 3, th.rockStyle === 'metal' ? 6 : 10);
  if (th.rockStyle === 'metal') {
    ink(ctx, p, linear(ctx, 0, 0, 0, S, [[0, shade(th.rock, 0.2)], [1, shade(th.rock, -0.2)]]), 3);
    ctx.fillStyle = rgba(C.ink, 0.45);
    for (const [x, y] of [[8, 8], [S - 8, 8], [8, S - 8], [S - 8, S - 8]]) ctx.fill(circle(x, y, 2.5));
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.fillRect(6, 14, S - 12, 3);
  } else if (th.rockStyle === 'ice') {
    ink(ctx, p, linear(ctx, 0, 0, S, S, [[0, '#ffffff'], [0.4, th.rock], [1, shade(th.rock, -0.25)]]), 3);
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 30);
    ctx.lineTo(22, 14);
    ctx.moveTo(28, 38);
    ctx.lineTo(38, 26);
    ctx.stroke();
  } else if (th.rockStyle === 'crystal') {
    ink(ctx, p, linear(ctx, 0, 0, S, S, [[0, shade(th.rock, 0.35)], [1, shade(th.rock, -0.3)]]), 3);
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.fill(poly([6, 6, 26, 6, 6, 26]));
    glowDot(ctx, 34, 32, 8, '#ffffff');
  } else {
    ink(ctx, p, linear(ctx, 0, 0, 0, S, [[0, shade(th.rock, 0.15)], [1, shade(th.rock, -0.2)]]), 3);
    speckle(ctx, rng, rgba(shade(th.rock, -0.35), 0.5), 4);
    ctx.fillStyle = rgba('#ffffff', 0.25);
    ctx.fill(ellipse(16, 13, 9, 4, -0.3));
  }
}

function platformTile(ctx: Ctx, th: Theme): void {
  ink(ctx, roundRect(1, 2, S - 2, 14, 6), linear(ctx, 0, 2, 0, 16, [[0, shade(th.platform, 0.2)], [1, shade(th.platform, -0.15)]]), 3);
  ctx.fillStyle = rgba(C.ink, 0.3);
  ctx.fillRect(6, 7, S - 12, 2);
  ctx.strokeStyle = rgba(C.ink, 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(12, 16);
  ctx.lineTo(18, 26);
  ctx.moveTo(S - 12, 16);
  ctx.lineTo(S - 18, 26);
  ctx.stroke();
}

function iceTile(ctx: Ctx): void {
  ink(ctx, roundRect(1.5, 1.5, S - 3, S - 3, 8), linear(ctx, 0, 0, S, S, [[0, '#ffffff'], [0.35, '#bff6ff'], [1, '#6fc8f0']]), 3);
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.fill(poly([8, 10, 20, 8, 10, 22]));
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fillRect(28, 30, 10, 3);
}

function gooTile(ctx: Ctx, th: Theme, top: boolean): void {
  ctx.fillStyle = rgba(th.goo, 0.75);
  if (top) {
    const p = new Path2D();
    p.moveTo(0, 14);
    for (let x = 0; x <= S; x += 12) p.quadraticCurveTo(x + 6, 6, x + 12, 14);
    p.lineTo(S, S);
    p.lineTo(0, S);
    p.closePath();
    ctx.fill(p);
    ctx.strokeStyle = rgba('#ffffff', 0.8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 13);
    ctx.quadraticCurveTo(10, 7, 16, 12);
    ctx.stroke();
    glowDot(ctx, 34, 26, 5, '#ffffff');
  } else {
    ctx.fillRect(0, 0, S, S);
    glowDot(ctx, 14, 30, 4, '#ffffff');
  }
}

function padTile(ctx: Ctx): void {
  ink(ctx, roundRect(4, 20, S - 8, S - 22, 6), C.dark, 3);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(12, 30 - i * 6);
    ctx.lineTo(S - 12, 26 - i * 6);
  }
  ctx.stroke();
  ink(ctx, roundRect(2, 4, S - 4, 12, 6), linear(ctx, 0, 4, 0, 16, [[0, '#ffb0ba'], [1, C.red]]), 3);
  ctx.fillStyle = C.white;
  ctx.fill(poly([S / 2, 6, S / 2 - 6, 13, S / 2 + 6, 13]));
}

function geyserTile(ctx: Ctx, th: Theme): void {
  groundTop(ctx, th, 0, 7);
  ink(ctx, ellipse(S / 2, 9, 16, 6), C.ink, 0);
  ink(ctx, ellipse(S / 2, 8, 12, 4), '#2a2050', 0);
  ctx.strokeStyle = rgba('#ffffff', 0.6);
  ctx.lineWidth = 2;
  ctx.stroke(ellipse(S / 2, 8, 17, 7));
}

export function doorTile(ctx: Ctx, top: boolean): void {
  ink(ctx, roundRect(4, top ? 2 : -4, S - 8, top ? S - 2 : S + 8, 6), linear(ctx, 0, 0, S, 0, [[0, '#c9d2ee'], [0.5, '#ffffff'], [1, '#9aa4c7']]), 3);
  ctx.fillStyle = C.yellow;
  ctx.fill(poly([4, 18, 4, 30, S - 4, 18, S - 4, 6]));
  ctx.fillStyle = rgba(C.ink, 0.6);
  ctx.fill(poly([4, 30, 4, 34, S - 4, 22, S - 4, 18]));
  if (top) glowDot(ctx, S / 2, 10, 7, C.red);
}

function crate(ctx: Ctx): void {
  ink(ctx, roundRect(2, 2, S - 4, S - 4, 6), linear(ctx, 0, 0, 0, S, [[0, '#ffc58a'], [1, '#d98a3a']]), 3.5);
  ctx.strokeStyle = rgba(C.ink, 0.6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(S - 8, S - 8);
  ctx.moveTo(S - 8, 8);
  ctx.lineTo(8, S - 8);
  ctx.stroke();
  ink(ctx, roundRect(2, 2, S - 4, S - 4, 6), 'rgba(0,0,0,0)', 3.5);
  ink(ctx, softStar(S / 2, S / 2, 5, 9, 4), C.yellow, 2);
}

function plate(ctx: Ctx, down: boolean, heavy: boolean): void {
  const h = down ? 6 : 12;
  ink(ctx, roundRect(2, 20 - 2, S - 4, 6, 3), C.dark, 2.5);
  ink(ctx, roundRect(6, 18 - h, S - 12, h + 2, 4), down ? C.lime : heavy ? C.orange : C.red, 3);
  if (heavy) {
    ctx.fillStyle = C.ink;
    ctx.fill(roundRect(S / 2 - 7, 18 - h + 2, 14, 4, 2));
  }
}

function orb(ctx: Ctx, w: number): void {
  glowDot(ctx, w / 2, w / 2, w / 2, C.cyan);
  ink(ctx, circle(w / 2, w / 2, w * 0.26), radial(ctx, w * 0.42, w * 0.4, 1, w * 0.3, [[0, '#ffffff'], [0.5, '#bff6ff'], [1, C.cyan]]), 3);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.45, w * 0.36);
  ctx.lineTo(w * 0.4, w * 0.5);
  ctx.lineTo(w * 0.55, w * 0.5);
  ctx.lineTo(w * 0.5, w * 0.64);
  ctx.stroke();
}

function crystalShape(ctx: Ctx, w: number, h: number): void {
  const p = poly([w / 2, 4, w - 8, h * 0.35, w - 12, h - 6, 12, h - 6, 8, h * 0.35]);
  ink(ctx, p, linear(ctx, 0, 0, w, 0, [[0, '#ffffff'], [0.5, '#e6e6f0'], [1, '#b8b8c8']]), 3.5);
  ctx.strokeStyle = rgba(C.ink, 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.lineTo(w / 2 - 4, h - 6);
  ctx.moveTo(8, h * 0.35);
  ctx.lineTo(w - 8, h * 0.35);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.fill(poly([w / 2 - 2, 10, 14, h * 0.33, w / 2 - 6, h * 0.33]));
}

function sign(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = C.ink;
  ctx.fillRect(w / 2 - 4, h * 0.45, 8, h * 0.55);
  ink(ctx, roundRect(4, 6, w - 8, h * 0.48, 8), linear(ctx, 0, 0, 0, h * 0.5, [[0, '#fff6e0'], [1, '#e0c49a']]), 3);
  ctx.fillStyle = C.ink;
  ctx.font = `900 ${Math.round(h * 0.34)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', w / 2, 6 + h * 0.25);
}

function goalFlag(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = C.ink;
  ctx.fillRect(w / 2 - 3, 6, 6, h - 6);
  ink(ctx, poly([w / 2 + 2, 8, w - 4, 20, w / 2 + 2, 32]), C.yellow, 3);
  ink(ctx, softStar(w / 2 + 12, 20, 5, 6, 3), C.orange, 1.5);
  ink(ctx, ellipse(w / 2, h - 3, 14, 4), C.dark, 2);
}

/** A friendly Space Sky dust-bot (real worlds) or a fuzzle critter (Zephyra). */
function bumbler(ctx: Ctx, w: number, h: number, kind: 'dustbot' | 'fuzzle', frame: number): void {
  if (kind === 'dustbot') {
    for (const x of [w * 0.28, w * 0.72]) ink(ctx, circle(x, h - 9, 8), C.dark, 3);
    ctx.fillStyle = C.steel;
    for (const x of [w * 0.28, w * 0.72]) ctx.fill(circle(x + (frame ? 2 : -2), h - 11, 2.5));
    ink(ctx, roundRect(6, h * 0.3, w - 12, h * 0.52, 12), linear(ctx, 0, 0, 0, h, [[0, '#fff3b0'], [1, C.orange]]), 3);
    ink(ctx, roundRect(14, h * 0.38, w - 28, h * 0.24, 8), C.ink, 0);
    ctx.fillStyle = C.cyan;
    ctx.fill(circle(w * 0.4, h * 0.5, 3.5));
    ctx.fill(circle(w * 0.6, h * 0.5, 3.5));
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.3);
    ctx.lineTo(w / 2 + (frame ? 4 : -4), h * 0.12);
    ctx.stroke();
    glowDot(ctx, w / 2 + (frame ? 4 : -4), h * 0.1, 6, C.lime);
  } else {
    const p = lumpyCircle(w / 2, h * 0.6 + (frame ? 2 : 0), w * 0.38, 14, 0.12, () => 0.5 + Math.sin(frame) * 0.1);
    ink(ctx, p, radial(ctx, w * 0.4, h * 0.45, 2, w * 0.5, [[0, '#ffd6f1'], [1, C.pink]]), 3);
    cuteFace(ctx, w / 2, h * 0.6, w * 0.22, { blush: C.purple });
    for (const s of [-1, 1]) ink(ctx, ellipse(w / 2 + s * 8, h - 4, 7, 4), shade(C.pink, -0.2), 2);
  }
}

function plant(ctx: Ctx, th: Theme, w: number, h: number): void {
  switch (th.plant) {
    case 'tree': {
      ctx.fillStyle = C.ink;
      ctx.fillRect(w / 2 - 4, h * 0.45, 8, h * 0.55);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(w / 2 - 2, h * 0.45, 4, h * 0.55);
      ink(ctx, blob([w * 0.15, h * 0.4, w * 0.25, h * 0.12, w * 0.55, h * 0.04, w * 0.85, h * 0.18, w * 0.9, h * 0.42, w * 0.5, h * 0.52]), th.surface, 3);
      for (const [x, y] of [[0.35, 0.22], [0.62, 0.3], [0.5, 0.15]]) glowDot(ctx, w * x, h * y, 6, C.yellow);
      break;
    }
    case 'mushroom':
      ink(ctx, roundRect(w / 2 - 6, h * 0.45, 12, h * 0.55, 5), C.cream, 3);
      ink(ctx, blob([w * 0.1, h * 0.5, w * 0.2, h * 0.15, w * 0.8, h * 0.15, w * 0.9, h * 0.5]), C.pink, 3);
      ctx.fillStyle = C.white;
      ctx.fill(circle(w * 0.35, h * 0.32, 4));
      ctx.fill(circle(w * 0.62, h * 0.28, 5));
      break;
    case 'crystal':
      ink(ctx, poly([w * 0.5, 4, w * 0.7, h * 0.4, w * 0.6, h, w * 0.4, h, w * 0.3, h * 0.4]), radial(ctx, w / 2, h / 2, 2, h, [[0, '#ffffff'], [1, '#c89bff']]), 3);
      ink(ctx, poly([w * 0.22, h * 0.45, w * 0.35, h * 0.62, w * 0.32, h, w * 0.14, h, w * 0.1, h * 0.65]), '#ff9ad9', 3);
      break;
    case 'icicle':
      ink(ctx, poly([w * 0.3, h, w * 0.42, h * 0.2, w * 0.54, h]), '#e6f7ff', 3);
      ink(ctx, poly([w * 0.5, h, w * 0.62, h * 0.45, w * 0.74, h]), '#bff6ff', 3);
      break;
    case 'antenna':
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2, h);
      ctx.lineTo(w / 2, h * 0.2);
      ctx.stroke();
      ink(ctx, ellipse(w / 2, h * 0.35, w * 0.3, h * 0.08, -0.3), C.steel, 3);
      glowDot(ctx, w / 2, h * 0.18, 8, C.red);
      break;
    default:
      ink(ctx, poly([w * 0.25, h, w * 0.35, h * 0.35, w * 0.5, h * 0.1, w * 0.62, h * 0.4, w * 0.75, h]), th.rockStyle === 'metal' ? shade(th.ground, 0.15) : th.rock, 3);
  }
}

export function drawDeco(ctx: Ctx, art: DecoArt | string, w: number, h: number): void {
  switch (art) {
    case 'dish':
      ctx.fillStyle = C.ink;
      ctx.fillRect(w / 2 - 4, h * 0.5, 8, h * 0.5);
      ink(ctx, poly([w * 0.3, h, w * 0.7, h, w * 0.55, h * 0.75, w * 0.45, h * 0.75]), C.steel, 3);
      {
        const p = new Path2D();
        p.ellipse(w / 2, h * 0.38, w * 0.42, h * 0.22, -0.4, 0, Math.PI);
        p.closePath();
        ink(ctx, p, C.white, 3);
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.4);
      ctx.lineTo(w * 0.7, h * 0.12);
      ctx.stroke();
      glowDot(ctx, w * 0.7, h * 0.12, 6, C.red);
      break;
    case 'antenna':
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w / 2, h);
      ctx.lineTo(w / 2, h * 0.1);
      ctx.moveTo(w * 0.3, h * 0.4);
      ctx.lineTo(w * 0.7, h * 0.4);
      ctx.moveTo(w * 0.35, h * 0.25);
      ctx.lineTo(w * 0.65, h * 0.25);
      ctx.stroke();
      glowDot(ctx, w / 2, h * 0.08, 8, C.red);
      break;
    case 'tent':
    case 'dome': {
      const p = new Path2D();
      p.moveTo(4, h - 2);
      p.quadraticCurveTo(4, h * 0.1, w / 2, h * 0.1);
      p.quadraticCurveTo(w - 4, h * 0.1, w - 4, h - 2);
      p.closePath();
      ink(ctx, p, linear(ctx, 0, 0, w, 0, [[0, '#ffffff'], [1, C.steel]]), 3.5);
      ctx.save();
      ctx.clip(p);
      ctx.fillStyle = rgba(C.blue, 0.25);
      for (let i = 1; i < 4; i++) ctx.fillRect(0, h * 0.1 + i * h * 0.22, w, 3);
      ctx.restore();
      ink(ctx, roundRect(w / 2 - 14, h * 0.55, 28, h * 0.45 - 2, 10), C.cyan, 3);
      for (const x of [0.25, 0.75]) ink(ctx, circle(w * x, h * 0.45, 7), '#fff3b0', 2.5);
      break;
    }
    case 'house':
      ink(ctx, roundRect(8, h * 0.4, w - 16, h * 0.6 - 2, 10), C.pink, 3.5);
      ink(ctx, blob([0, h * 0.45, w * 0.2, h * 0.1, w * 0.5, 0, w * 0.8, h * 0.1, w, h * 0.45]), C.teal, 3.5);
      ink(ctx, roundRect(w / 2 - 10, h * 0.62, 20, h * 0.38 - 2, 10), C.purple, 3);
      ink(ctx, circle(w * 0.25, h * 0.6, 7), C.yellow, 2.5);
      break;
    case 'crate':
      crate(ctx);
      break;
    case 'pipe':
      ink(ctx, roundRect(0, h * 0.6, w, h * 0.22, 8), C.steel, 3);
      ink(ctx, roundRect(w * 0.15, h * 0.55, 10, h * 0.32, 3), C.gray, 2.5);
      ink(ctx, roundRect(w * 0.75, h * 0.55, 10, h * 0.32, 3), C.gray, 2.5);
      break;
    case 'crater':
      ink(ctx, ellipse(w / 2, h * 0.75, w * 0.45, h * 0.2), rgba(C.ink, 0.25), 0);
      break;
    case 'crystals':
      plant(ctx, { plant: 'crystal' } as Theme, w, h);
      break;
    case 'mushroom':
      plant(ctx, { plant: 'mushroom' } as Theme, w, h);
      break;
    case 'flagpole':
      ctx.fillStyle = C.ink;
      ctx.fillRect(w / 2 - 3, 4, 6, h - 4);
      ink(ctx, poly([w / 2 + 2, 6, w - 2, 16, w / 2 + 2, 28]), C.blue, 3);
      ink(ctx, softStar(w / 2 + 12, 17, 5, 5, 2.5), C.yellow, 1.5);
      break;
    case 'statue':
      ink(ctx, roundRect(w * 0.2, h * 0.75, w * 0.6, h * 0.25, 4), C.steel, 3);
      ink(ctx, softStar(w / 2, h * 0.4, 5, w * 0.35, w * 0.16), C.gold, 3);
      break;
    case 'lamp':
      ctx.fillStyle = C.ink;
      ctx.fillRect(w / 2 - 3, h * 0.2, 6, h * 0.8);
      glowDot(ctx, w / 2, h * 0.18, 16, C.yellow);
      ink(ctx, circle(w / 2, h * 0.18, 7), '#fff3b0', 3);
      break;
    case 'icicle':
      plant(ctx, { plant: 'icicle' } as Theme, w, h);
      break;
    case 'vent':
      ink(ctx, roundRect(w * 0.2, h * 0.6, w * 0.6, h * 0.4, 6), C.dark, 3);
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ctx.fill(circle(w / 2, h * 0.4, 8));
      ctx.fill(circle(w * 0.6, h * 0.25, 6));
      break;
    case 'station':
      ink(ctx, roundRect(4, h * 0.3, w - 8, h * 0.7 - 2, 14), linear(ctx, 0, 0, 0, h, [[0, '#ffffff'], [1, C.steel]]), 3.5);
      for (let i = 0; i < 3; i++) ink(ctx, circle(w * (0.25 + i * 0.25), h * 0.5, 8), C.cyan, 2.5);
      ink(ctx, roundRect(w / 2 - 12, h * 0.65, 24, h * 0.35 - 2, 6), C.blue, 3);
      ctx.fillStyle = C.red;
      ctx.fillRect(4, h * 0.36, w - 8, 5);
      break;
    case 'window':
      ink(ctx, roundRect(4, 4, w - 8, h - 8, 10), radial(ctx, w * 0.4, h * 0.4, 2, w, [[0, '#3a2a7a'], [1, '#140d3a']]), 3.5);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) ctx.fill(circle(10 + ((i * 37) % (w - 20)), 10 + ((i * 23) % (h - 20)), 1.6));
      break;
    case 'bench':
      ink(ctx, roundRect(4, h * 0.55, w - 8, 10, 4), C.brown, 3);
      ctx.fillStyle = C.ink;
      ctx.fillRect(10, h * 0.55, 5, h * 0.45);
      ctx.fillRect(w - 15, h * 0.55, 5, h * 0.45);
      break;
    case 'cloud':
      ink(ctx, blob([4, h * 0.7, w * 0.15, h * 0.35, w * 0.4, h * 0.2, w * 0.65, h * 0.25, w * 0.9, h * 0.4, w - 4, h * 0.7, w / 2, h * 0.85]), '#ffffff', 3);
      break;
    case 'roverOld':
      drawMachine(ctx, 'rover', w, h, false);
      break;
    case 'podCrashed':
      drawMachine(ctx, 'pod', w, h, false);
      break;
    default:
      ink(ctx, circle(w / 2, h / 2, w * 0.3), C.gray, 3);
  }
}

/** Machines that need power orbs. `on` draws the powered state. */
export function drawMachine(ctx: Ctx, art: MachineArt, w: number, h: number, on: boolean): void {
  const glow = on ? C.lime : C.red;
  switch (art) {
    case 'rover': {
      const base = h - 18;
      for (const x of [0.22, 0.5, 0.78]) ink(ctx, circle(w * x, base + 4, 13), C.dark, 3);
      ink(ctx, roundRect(w * 0.1, base - 36, w * 0.8, 30, 9), linear(ctx, 0, base - 36, 0, base, [[0, '#ffd6a8'], [1, C.orange]]), 3);
      ink(ctx, roundRect(w * 0.15, base - 48, w * 0.45, 9, 3), C.blue, 3);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.72, base - 36);
      ctx.lineTo(w * 0.72, base - 58);
      ctx.stroke();
      ink(ctx, roundRect(w * 0.64, base - 70, 26, 16, 6), C.steel, 3);
      glowDot(ctx, w * 0.64 + 19, base - 62, on ? 10 : 6, on ? C.cyan : '#555577');
      if (!on) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.3, base - 30);
        ctx.lineTo(w * 0.36, base - 22);
        ctx.lineTo(w * 0.32, base - 16);
        ctx.stroke();
      }
      break;
    }
    case 'pod': {
      const p = new Path2D();
      p.ellipse(w / 2, h * 0.6, w * 0.42, h * 0.32, on ? 0 : 0.35, 0, Math.PI * 2);
      ink(ctx, p, linear(ctx, 0, 0, w, h, [[0, '#c9fff4'], [1, C.teal]]), 3.5);
      ink(ctx, ellipse(w * 0.55, h * 0.5, w * 0.16, h * 0.12, on ? 0 : 0.35), radial(ctx, w * 0.5, h * 0.45, 1, w * 0.2, [[0, '#ffffff'], [1, C.purple]]), 3);
      for (let i = 0; i < 3; i++) glowDot(ctx, w * (0.25 + i * 0.25), h * 0.78, on ? 9 : 4, on ? C.yellow : '#666688');
      if (!on) {
        ctx.fillStyle = rgba('#ffffff', 0.6);
        ctx.fill(circle(w * 0.2, h * 0.3, 6));
        ctx.fill(circle(w * 0.12, h * 0.18, 4));
      }
      break;
    }
    case 'beacon': {
      ink(ctx, poly([w * 0.3, h, w * 0.38, h * 0.3, w * 0.62, h * 0.3, w * 0.7, h]), linear(ctx, 0, 0, w, 0, [[0, C.white], [1, C.steel]]), 3.5);
      ctx.fillStyle = C.purple;
      ctx.fillRect(w * 0.34, h * 0.6, w * 0.32, 8);
      ink(ctx, roundRect(w * 0.32, h * 0.18, w * 0.36, h * 0.14, 6), C.gold, 3);
      if (on) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDot(ctx, w / 2, h * 0.12, w * 0.45, C.yellow);
        ctx.restore();
      }
      ink(ctx, softStar(w / 2, h * 0.1, 6, w * 0.14, w * 0.07), on ? '#fff7b3' : '#8a86a8', 3);
      break;
    }
    case 'weather':
    case 'antenna':
      drawDeco(ctx, art === 'weather' ? 'dish' : 'antenna', w, h * 0.8);
      ink(ctx, roundRect(w * 0.25, h * 0.75, w * 0.5, h * 0.25 - 2, 6), C.steel, 3);
      glowDot(ctx, w / 2, h * 0.86, on ? 10 : 6, glow);
      break;
    case 'lift':
      ink(ctx, roundRect(w * 0.1, h * 0.75, w * 0.8, h * 0.25 - 2, 6), C.steel, 3);
      ctx.fillStyle = C.ink;
      ctx.fillRect(w * 0.2, 0, 6, h * 0.75);
      ctx.fillRect(w * 0.8 - 6, 0, 6, h * 0.75);
      glowDot(ctx, w / 2, h * 0.86, on ? 10 : 6, glow);
      break;
    default: {
      // Generic power machine.
      ink(ctx, roundRect(w * 0.12, h * 0.25, w * 0.76, h * 0.75 - 2, 12), linear(ctx, 0, 0, 0, h, [[0, '#ffffff'], [1, C.steel]]), 3.5);
      ink(ctx, roundRect(w * 0.22, h * 0.35, w * 0.56, h * 0.26, 8), C.ink, 0);
      for (let i = 0; i < 3; i++) glowDot(ctx, w * (0.32 + i * 0.18), h * 0.48, on ? 8 : 4, on ? [C.lime, C.yellow, C.cyan][i] : '#555577');
      ink(ctx, roundRect(w * 0.4, h * 0.7, w * 0.2, h * 0.14, 5), on ? C.lime : C.red, 2.5);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.25);
      ctx.lineTo(w * 0.24, h * 0.06);
      ctx.stroke();
      glowDot(ctx, w * 0.24, h * 0.06, 7, glow);
    }
  }
}

export function sampleArt(ctx: Ctx, w: number, color: string): void {
  glowDot(ctx, w / 2, w / 2, w / 2, C.cyan);
  const rng = new Rng(w + color.length);
  ink(ctx, lumpyCircle(w / 2, w / 2 + 2, w * 0.26, 7, 0.25, () => rng.next()), radial(ctx, w * 0.42, w * 0.4, 1, w * 0.35, [[0, shade(color, 0.4)], [1, shade(color, -0.2)]]), 3);
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill(circle(w * 0.42, w * 0.42, 3));
}

/** All textures one exploration theme needs. */
export function themeSprites(th: Theme): SpriteDef[] {
  const id = th.id;
  const d: SpriteDef[] = [];
  const add = (name: string, w: number, h: number, draw: (c: Ctx, w: number, h: number) => void, ax = 0, ay = 0) => d.push({ name: `${id}_${name}`, w, h, draw, ax, ay });
  add('fill', S, S, (c) => groundFill(c, th, 1));
  add('fill2', S, S, (c) => groundFill(c, th, 2));
  for (let e = 0; e < 4; e++) add(`top${e}`, S, S, (c) => groundTop(c, th, e, 3 + e));
  add('rock', S, S, (c) => rockTile(c, th, 4));
  add('plat', S, S, (c) => platformTile(c, th));
  add('ice', S, S, (c) => iceTile(c));
  add('gooTop', S, S, (c) => gooTile(c, th, true));
  add('goo', S, S, (c) => gooTile(c, th, false));
  add('pad', S, S, (c) => padTile(c));
  add('geyser', S, S, (c) => geyserTile(c, th));
  add('plant', 64, 96, (c, w, h) => plant(c, th, w, h), 0.5, 1);
  add('bumbler0', 56, 52, (c, w, h) => bumbler(c, w, h, th.bumbler, 0), 0.5, 1);
  add('bumbler1', 56, 52, (c, w, h) => bumbler(c, w, h, th.bumbler, 1), 0.5, 1);
  add('boulder', 72, 56, (c, w, h) => {
    const rng = new Rng(9);
    ink(c, lumpyCircle(w / 2, h * 0.58, w * 0.42, 9, 0.15, () => rng.next()), linear(c, 0, 0, 0, h, [[0, shade(th.ground, 0.25)], [1, th.ground2]]), 3);
  }, 0.5, 1);
  return d;
}

/** Shared props for every level (doors, crates, plates, orbs, machines, signs...). */
export function propSprites(): SpriteDef[] {
  const d: SpriteDef[] = [];
  const add = (name: string, w: number, h: number, draw: (c: Ctx, w: number, h: number) => void, ax = 0.5, ay = 1) => d.push({ name, w, h, draw, ax, ay });
  add('p_doorTop', S, S, (c) => doorTile(c, true), 0, 0);
  add('p_door', S, S, (c) => doorTile(c, false), 0, 0);
  add('p_crate', S, S, (c) => crate(c), 0, 0);
  add('p_plateUp', S, 24, (c) => plate(c, false, false), 0, 1);
  add('p_plateDown', S, 24, (c) => plate(c, true, false), 0, 1);
  add('p_plateHeavy', S, 24, (c) => plate(c, false, true), 0, 1);
  add('p_plateHeavyDown', S, 24, (c) => plate(c, true, true), 0, 1);
  add('p_orb', 52, 52, (c, w) => orb(c, w), 0.5, 0.5);
  add('p_crystal', 52, 76, (c, w, h) => crystalShape(c, w, h));
  add('p_sign', 56, 72, (c, w, h) => sign(c, w, h));
  add('p_goal', 56, 90, (c, w, h) => goalFlag(c, w, h));
  add('p_lamp', 40, 110, (c, w, h) => drawDeco(c, 'lamp', w, h));
  add('p_flag', 56, 110, (c, w, h) => drawDeco(c, 'flagpole', w, h));
  add('p_bubble', 64, 56, (c, w, h) => {
    ink(c, roundRect(4, 4, w - 8, h - 18, 16), C.white, 3.5);
    c.fill(poly([w * 0.35, h - 16, w * 0.5, h - 2, w * 0.55, h - 16]));
    c.strokeStyle = C.ink;
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(w * 0.35, h - 15);
    c.lineTo(w * 0.5, h - 2);
    c.lineTo(w * 0.58, h - 15);
    c.stroke();
    c.fillStyle = C.ink;
    for (let i = 0; i < 3; i++) c.fill(circle(w * (0.32 + i * 0.18), (h - 14) / 2 + 2, 4));
  }, 0.5, 1);
  for (const art of ['machine', 'rover', 'pod', 'beacon', 'weather', 'antenna', 'heater', 'drill', 'lift'] as MachineArt[]) {
    const w = art === 'beacon' ? 120 : 110;
    const h = art === 'beacon' ? 170 : 110;
    add(`p_m_${art}_off`, w, h, (c, ww, hh) => drawMachine(c, art, ww, hh, false));
    add(`p_m_${art}_on`, w, h, (c, ww, hh) => drawMachine(c, art, ww, hh, true));
  }
  for (const art of ['dish', 'antenna', 'tent', 'dome', 'crate', 'pipe', 'crater', 'crystals', 'mushroom', 'house', 'flagpole', 'statue', 'lamp', 'icicle', 'vent', 'station', 'window', 'bench', 'cloud', 'roverOld', 'podCrashed'] as DecoArt[]) {
    const big = art === 'station' || art === 'house' || art === 'dome' || art === 'roverOld' || art === 'podCrashed';
    add(`p_d_${art}`, big ? 150 : 90, big ? 130 : 90, (c, w, h) => drawDeco(c, art, w, h));
  }
  return d;
}
