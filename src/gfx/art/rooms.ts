import { Rng } from '../../core/rng';
import { blob, circle, ellipse, glowDot, ink, linear, poly, radial, roundRect, softStar, type Ctx } from '../canvas';
import { C, rgba, shade } from '../palette';
import { drawPlanet } from './planets';
import { BODY_BY_ID } from '../../data/bodies';
import { drawGlyph } from './glyphs';
import { drawAlienBody } from './characters';

function starsInRect(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, seed: number): void {
  const rng = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const r = rng.range(0.8, 2.6);
    if (r > 2.2) glowDot(ctx, x + rng.range(0, w), y + rng.range(0, h), r * 3, '#ffffff');
    else {
      ctx.fillStyle = rgba('#ffffff', rng.range(0.5, 1));
      ctx.fill(circle(x + rng.range(0, w), y + rng.range(0, h), r));
    }
  }
}

function hazardStripes(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = C.yellow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.ink;
  for (let i = -h; i < w; i += h * 1.4) ctx.fill(poly([x + i, y + h, x + i + h * 0.7, y + h, x + i + h * 1.4, y, x + i + h * 0.7, y]));
  ctx.restore();
}

/** The rocket hangar: a big room with a window to space and a launch platform. 1600 x 720. */
export function drawHangar(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, '#2a2470'], [0.7, '#3b2f8f'], [1, '#2a2470']]);
  ctx.fillRect(0, 0, w, h);
  // Wall panels.
  ctx.strokeStyle = rgba('#ffffff', 0.08);
  ctx.lineWidth = 3;
  for (let x = 0; x < w; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h * 0.78);
    ctx.stroke();
  }
  for (let y = 120; y < h * 0.78; y += 140) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Big round window.
  const wx = w * 0.3;
  const wy = h * 0.34;
  const wr = h * 0.27;
  ink(ctx, circle(wx, wy, wr + 18), linear(ctx, 0, wy - wr, 0, wy + wr, [[0, '#c9d2ee'], [1, '#7f8ab5']]), 6);
  ctx.save();
  ctx.clip(circle(wx, wy, wr));
  ctx.fillStyle = radial(ctx, wx, wy, 0, wr, [[0, '#3b2a8f'], [1, '#140d3a']]);
  ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
  starsInRect(ctx, wx - wr, wy - wr, wr * 2, wr * 2, 60, 5);
  ctx.save();
  ctx.translate(wx + wr * 0.15, wy + wr * 0.25);
  drawPlanet(ctx, BODY_BY_ID.earth.look, wr * 1.3, wr * 1.3);
  ctx.restore();
  ctx.fillStyle = rgba('#ffffff', 0.1);
  ctx.fill(poly([wx - wr, wy - wr * 0.2, wx - wr * 0.2, wy - wr, wx, wy - wr, wx - wr, wy]));
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.ink;
  ctx.stroke(circle(wx, wy, wr));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ink(ctx, circle(wx + Math.cos(a) * (wr + 9), wy + Math.sin(a) * (wr + 9), 5), C.steel, 2);
  }
  // Tool rack on the right.
  const rx = w * 0.82;
  ink(ctx, roundRect(rx - 120, h * 0.2, 240, 170, 14), '#4a3fa0', 4);
  for (let i = 0; i < 4; i++) drawGlyph(ctx, i % 2 ? 'wrench' : 'bolt', rx - 80 + i * 54, h * 0.2 + 85, 22, [C.yellow, C.cyan, C.orange, C.lime][i]);
  // Crane arm.
  ctx.fillStyle = C.ink;
  ctx.fillRect(w * 0.55 - 6, 0, 12, h * 0.16);
  ink(ctx, roundRect(w * 0.42, h * 0.14, w * 0.26, 18, 8), C.steel, 4);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.62, h * 0.16);
  ctx.lineTo(w * 0.62, h * 0.3);
  ctx.stroke();
  ink(ctx, roundRect(w * 0.6, h * 0.3, w * 0.04, 22, 6), C.yellow, 3);
  // Floor.
  ctx.fillStyle = linear(ctx, 0, h * 0.78, 0, h, [[0, '#5a4fb0'], [1, '#3a2f80']]);
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, h * 0.78 - 4, w, 8);
  hazardStripes(ctx, 0, h * 0.78 + 4, w, 18);
  // Hanging lights.
  for (const lx of [0.12, 0.5, 0.7, 0.95]) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(w * lx - 2, 0, 4, 50);
    glowDot(ctx, w * lx, 58, 40, '#fff3b0');
    ink(ctx, ellipse(w * lx, 56, 22, 10), C.steel, 3);
  }
}

/** Launch platform under the hangar rocket. */
export function drawPlatform(ctx: Ctx, w: number, h: number): void {
  ink(ctx, ellipse(w / 2, h * 0.55, w * 0.48, h * 0.3), linear(ctx, 0, 0, 0, h, [[0, '#c9d2ee'], [1, '#7f8ab5']]), 5);
  ink(ctx, ellipse(w / 2, h * 0.45, w * 0.4, h * 0.22), '#9aa4c7', 4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    glowDot(ctx, w / 2 + Math.cos(a) * w * 0.33, h * 0.45 + Math.sin(a) * h * 0.17, 9, i % 2 ? C.cyan : C.lime);
  }
}

/** The Space Sky Academy seen from outside: the hub backdrop. 1600 x 720. */
export function drawAcademy(ctx: Ctx, w: number, h: number): void {
  // Sky: dusk blue fading to stars at the top.
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, '#1d1456'], [0.45, '#4a3fb0'], [0.75, '#8fb8ff'], [1, '#c9f0ff']]);
  ctx.fillRect(0, 0, w, h);
  starsInRect(ctx, 0, 0, w, h * 0.4, 90, 9);
  ctx.save();
  ctx.translate(w * 0.86 - 70, h * 0.12 - 70);
  drawPlanet(ctx, BODY_BY_ID.moon.look, 140, 140);
  ctx.restore();
  // Hills.
  const hill = (y: number, amp: number, color: string, seed: number) => {
    const rng = new Rng(seed);
    const p = new Path2D();
    p.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) p.lineTo(x, y + Math.sin(x * 0.004 + seed) * amp + rng.range(-3, 3));
    p.lineTo(w, h);
    p.closePath();
    ink(ctx, p, color, 4);
  };
  hill(h * 0.66, 30, '#6fa8e8', 1);
  hill(h * 0.74, 22, '#5fbf6a', 2);
  // Main tower (center).
  const cx = w * 0.5;
  ink(ctx, roundRect(cx - 120, h * 0.24, 240, h * 0.56, 40), linear(ctx, cx - 120, 0, cx + 120, 0, [[0, '#ffffff'], [1, '#c9d2ee']]), 6);
  ink(ctx, roundRect(cx - 80, h * 0.12, 160, 110, 50), linear(ctx, 0, h * 0.12, 0, h * 0.27, [[0, '#8fd9ff'], [1, C.blue]]), 6);
  ctx.save();
  ctx.shadowColor = C.yellow;
  ctx.shadowBlur = 20;
  ink(ctx, softStar(cx, h * 0.08, 5, 34, 16), C.yellow, 5);
  ctx.restore();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ink(ctx, roundRect(cx - 80 + j * 100, h * 0.32 + i * 90, 60, 56, 16), '#fff3b0', 4);
  ink(ctx, roundRect(cx - 50, h * 0.66, 100, h * 0.14, 30), C.purple, 5);
  // Side buildings: hangar (left) and dome (right).
  ink(ctx, roundRect(w * 0.12, h * 0.46, w * 0.22, h * 0.34, 30), linear(ctx, 0, h * 0.46, 0, h * 0.8, [[0, '#ffd6a8'], [1, C.orange]]), 6);
  hazardStripes(ctx, w * 0.12 + 10, h * 0.5, w * 0.22 - 20, 16);
  ink(ctx, roundRect(w * 0.16, h * 0.56, w * 0.14, h * 0.24, 10), '#7f8ab5', 5);
  const dome = new Path2D();
  dome.moveTo(w * 0.66, h * 0.8);
  dome.quadraticCurveTo(w * 0.66, h * 0.44, w * 0.77, h * 0.44);
  dome.quadraticCurveTo(w * 0.88, h * 0.44, w * 0.88, h * 0.8);
  dome.closePath();
  ink(ctx, dome, linear(ctx, w * 0.66, 0, w * 0.88, 0, [[0, '#c9fff4'], [1, C.teal]]), 6);
  ctx.save();
  ctx.clip(dome);
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 3;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.66, h * (0.44 + i * 0.08));
    ctx.lineTo(w * 0.88, h * (0.44 + i * 0.08));
    ctx.stroke();
  }
  ctx.restore();
  // Launch pad with a tower (far right).
  ink(ctx, roundRect(w * 0.9, h * 0.3, 26, h * 0.5, 6), C.steel, 4);
  for (let y = h * 0.34; y < h * 0.78; y += 34) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.9, y);
    ctx.lineTo(w * 0.9 + 26, y + 30);
    ctx.stroke();
  }
  glowDot(ctx, w * 0.9 + 13, h * 0.29, 14, C.red);
  // Ground.
  ctx.fillStyle = linear(ctx, 0, h * 0.8, 0, h, [[0, '#7fd06a'], [1, '#4f9a44']]);
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, h * 0.8 - 3, w, 6);
  ink(ctx, roundRect(w * 0.3, h * 0.84, w * 0.4, 24, 12), '#c9d2ee', 4);
  // Flags.
  for (const fx of [0.38, 0.62]) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(w * fx - 3, h * 0.6, 6, h * 0.2);
    ink(ctx, poly([w * fx + 3, h * 0.6, w * fx + 60, h * 0.63, w * fx + 3, h * 0.67]), fx < 0.5 ? C.red : C.blue, 3);
  }
}

/** Your room at the Academy (crew lounge background). 1600 x 720. */
export function drawLounge(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, '#4a2f9a'], [1, '#6b4fc0']]);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = rgba('#ffffff', 0.06);
  for (let x = 0; x < w; x += 80) ctx.fillRect(x, 0, 40, h * 0.75);
  // Two windows.
  for (const wx of [0.22, 0.78]) {
    const x = w * wx - 150;
    ink(ctx, roundRect(x, h * 0.1, 300, 220, 40), '#c9d2ee', 6);
    ctx.save();
    ctx.clip(roundRect(x + 14, h * 0.1 + 14, 272, 192, 30));
    ctx.fillStyle = '#140d3a';
    ctx.fillRect(x, h * 0.1, 300, 220);
    starsInRect(ctx, x, h * 0.1, 300, 220, 30, wx * 100);
    if (wx > 0.5) {
      ctx.translate(x + 120, h * 0.1 + 40);
      drawPlanet(ctx, BODY_BY_ID.saturn.look, 150, 150);
    }
    ctx.restore();
  }
  // Floor.
  ctx.fillStyle = linear(ctx, 0, h * 0.75, 0, h, [[0, '#ffb38a'], [1, '#e0784a']]);
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, h * 0.75 - 3, w, 6);
  // Sofa.
  ink(ctx, roundRect(w * 0.38, h * 0.58, w * 0.24, h * 0.2, 30), C.teal, 5);
  ink(ctx, roundRect(w * 0.36, h * 0.66, w * 0.28, h * 0.12, 26), shade(C.teal, 0.15), 5);
}

/** Decorations you can buy for your room. Each fits a w x h box, sitting on the floor. */
export function drawDecor(ctx: Ctx, style: string, w: number, h: number): void {
  switch (style) {
    case 'plant':
      ink(ctx, poly([w * 0.3, h * 0.65, w * 0.7, h * 0.65, w * 0.62, h, w * 0.38, h]), C.orange, 4);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        ink(ctx, ellipse(w / 2 + Math.cos(a) * w * 0.2, h * 0.45 + Math.sin(a) * h * 0.25, w * 0.1, h * 0.2, a + Math.PI / 2), C.green, 3);
      }
      break;
    case 'rug':
      ink(ctx, ellipse(w / 2, h * 0.85, w * 0.48, h * 0.14), C.pink, 4);
      ink(ctx, softStar(w / 2, h * 0.85, 5, w * 0.16, w * 0.07, -Math.PI / 2), C.yellow, 2);
      break;
    case 'telescope':
      drawGlyph(ctx, 'telescope', w / 2, h * 0.55, w * 0.42, C.blue);
      break;
    case 'model':
      ink(ctx, roundRect(w * 0.3, h * 0.88, w * 0.4, h * 0.1, 6), C.brown, 3);
      drawGlyph(ctx, 'rocket', w / 2, h * 0.5, w * 0.36);
      break;
    case 'lavalamp': {
      ink(ctx, poly([w * 0.35, h, w * 0.65, h, w * 0.58, h * 0.85, w * 0.42, h * 0.85]), C.steel, 3);
      const p = poly([w * 0.42, h * 0.85, w * 0.58, h * 0.85, w * 0.64, h * 0.3, w * 0.36, h * 0.3]);
      ink(ctx, p, linear(ctx, 0, h * 0.3, 0, h, [[0, '#ff7ad9'], [1, '#9b6bff']]), 3);
      ctx.fillStyle = '#ffe066';
      ctx.fill(circle(w / 2, h * 0.5, w * 0.06));
      ctx.fill(circle(w * 0.47, h * 0.7, w * 0.05));
      ink(ctx, poly([w * 0.38, h * 0.3, w * 0.62, h * 0.3, w * 0.56, h * 0.2, w * 0.44, h * 0.2]), C.steel, 3);
      break;
    }
    case 'mobile':
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h * 0.15);
      ctx.moveTo(w * 0.15, h * 0.15);
      ctx.lineTo(w * 0.85, h * 0.15);
      for (const x of [0.15, 0.5, 0.85]) {
        ctx.moveTo(w * x, h * 0.15);
        ctx.lineTo(w * x, h * 0.35);
      }
      ctx.stroke();
      ink(ctx, circle(w * 0.15, h * 0.42, w * 0.08), C.red, 3);
      ink(ctx, circle(w * 0.5, h * 0.45, w * 0.11), C.orange, 3);
      ink(ctx, circle(w * 0.85, h * 0.42, w * 0.07), C.cyan, 3);
      break;
    case 'plush':
      drawAlienBody(ctx, { body: '#2de0c7', belly: '#c9fff4', eyes: 3, antenna: '#ffe066', extra: 'scarf' }, w / 2, h * 0.66, w * 0.3, 'happy');
      break;
    case 'trophy':
      ink(ctx, roundRect(w * 0.08, h * 0.55, w * 0.84, h * 0.08, 4), C.brown, 3);
      ink(ctx, roundRect(w * 0.08, h * 0.92, w * 0.84, h * 0.08, 4), C.brown, 3);
      drawGlyph(ctx, 'trophy', w * 0.3, h * 0.38, w * 0.15, C.gold);
      drawGlyph(ctx, 'medal', w * 0.7, h * 0.4, w * 0.13, C.steel);
      drawGlyph(ctx, 'trophy', w * 0.5, h * 0.78, w * 0.13, '#e0a050');
      break;
    case 'beanbag':
      ink(ctx, blob([w * 0.1, h * 0.95, w * 0.12, h * 0.6, w * 0.4, h * 0.42, w * 0.75, h * 0.5, w * 0.92, h * 0.75, w * 0.85, h * 0.98]), C.purple, 4);
      break;
    case 'globe':
      ink(ctx, roundRect(w * 0.35, h * 0.88, w * 0.3, h * 0.1, 6), C.steel, 3);
      glowDot(ctx, w / 2, h * 0.5, w * 0.45, '#fff7d6');
      ctx.save();
      ctx.translate(w / 2 - w * 0.3, h * 0.5 - w * 0.3);
      drawPlanet(ctx, BODY_BY_ID.moon.look, w * 0.6, w * 0.6);
      ctx.restore();
      break;
    default:
      ink(ctx, circle(w / 2, h / 2, w * 0.3), C.gray, 3);
  }
}
