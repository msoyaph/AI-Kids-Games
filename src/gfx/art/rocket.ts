import { PART_BY_ID } from '../../data/parts';
import type { PaintColors, RocketLoadout } from '../../data/types';
import { circle, ellipse, glowDot, gloss, ink, linear, poly, radial, roundRect, softStar, star, type Ctx } from '../canvas';
import { C, rgba, shade } from '../palette';
import { drawSticker } from './stickers';

/** Logical size of the rocket sprite (pointing up). */
export const ROCKET_W = 128;
export const ROCKET_H = 176;
const CX = ROCKET_W / 2;

interface BodyDims {
  w: number;
  top: number;
  bottom: number;
  bulge: number;
}

const BODY: Record<string, BodyDims> = {
  classic: { w: 44, top: 60, bottom: 132, bulge: 1.08 },
  chubby: { w: 54, top: 62, bottom: 130, bulge: 1.2 },
  slim: { w: 34, top: 56, bottom: 136, bulge: 1.02 },
  capsule: { w: 48, top: 60, bottom: 132, bulge: 1.1 },
  armor: { w: 48, top: 60, bottom: 132, bulge: 1.06 },
  crystal: { w: 46, top: 60, bottom: 134, bulge: 1.12 },
};

function styleOf(id: string, fallback: string): string {
  return PART_BY_ID[id]?.style ?? fallback;
}

export function paintOf(loadout: RocketLoadout): PaintColors {
  return PART_BY_ID[loadout.paint]?.colors ?? { main: C.white, accent: C.red, trim: C.blue, window: C.cyan };
}

function bodyPath(b: BodyDims): Path2D {
  const p = new Path2D();
  const hw = b.w / 2;
  const mid = (b.top + b.bottom) / 2;
  const bw = hw * 0.86;
  p.moveTo(CX - hw, b.top);
  p.bezierCurveTo(CX - hw * b.bulge, mid - 10, CX - hw * b.bulge, mid + 14, CX - bw, b.bottom - 4);
  p.quadraticCurveTo(CX - bw, b.bottom, CX - bw + 6, b.bottom);
  p.lineTo(CX + bw - 6, b.bottom);
  p.quadraticCurveTo(CX + bw, b.bottom, CX + bw, b.bottom - 4);
  p.bezierCurveTo(CX + hw * b.bulge, mid + 14, CX + hw * b.bulge, mid - 10, CX + hw, b.top);
  p.closePath();
  return p;
}

const RAINBOW = ['#ff5d73', '#ff9f43', '#ffe066', '#8cff66', '#4dd4ff', '#9b6bff'];

function drawBody(ctx: Ctx, style: string, b: BodyDims, paint: PaintColors): void {
  const path = bodyPath(b);
  const hw = b.w / 2;
  if (style === 'crystal') {
    const g = linear(ctx, CX - hw, 0, CX + hw, 0, [
      [0, shade(paint.main, 0.25)],
      [0.5, paint.main],
      [1, shade(paint.main, -0.25)],
    ]);
    ink(ctx, path, g, 3);
    ctx.save();
    ctx.clip(path);
    ctx.strokeStyle = rgba('#ffffff', 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - hw, b.top + 20);
    ctx.lineTo(CX, b.top + 40);
    ctx.lineTo(CX + hw, b.top + 20);
    ctx.moveTo(CX, b.top + 40);
    ctx.lineTo(CX, b.bottom);
    ctx.stroke();
    ctx.fillStyle = rgba('#d9b8ff', 0.45);
    ctx.fill(poly([CX - hw, b.top + 20, CX, b.top + 40, CX, b.bottom, CX - hw, b.bottom]));
    ctx.restore();
  } else {
    const g = linear(ctx, CX - hw * 1.2, 0, CX + hw * 1.2, 0, [
      [0, shade(paint.main, -0.12)],
      [0.35, shade(paint.main, 0.18)],
      [0.7, paint.main],
      [1, shade(paint.main, -0.3)],
    ]);
    ink(ctx, path, g, 0);
    ctx.save();
    ctx.clip(path);
    // Paint patterns.
    if (paint.pattern === 'stripes') {
      ctx.fillStyle = paint.accent;
      ctx.fillRect(CX - hw * 1.3, b.top + 34, b.w * 1.3, 7);
      ctx.fillRect(CX - hw * 1.3, b.top + 46, b.w * 1.3, 4);
    } else if (paint.pattern === 'rainbow') {
      const bandH = 6;
      for (let i = 0; i < RAINBOW.length; i++) {
        ctx.fillStyle = RAINBOW[i];
        ctx.fillRect(CX - hw * 1.3, b.top + 32 + i * bandH, b.w * 1.3, bandH + 0.5);
      }
    } else if (paint.pattern === 'stars') {
      ctx.fillStyle = rgba(paint.trim, 0.9);
      const spots = [
        [-0.5, 0.15],
        [0.45, 0.3],
        [-0.3, 0.62],
        [0.35, 0.78],
        [0.05, 0.47],
      ];
      for (const [sx, sy] of spots) ctx.fill(star(CX + sx * hw, b.top + sy * (b.bottom - b.top), 5, 4, 1.8));
    }
    // Band near the bottom in trim color.
    ctx.fillStyle = paint.trim;
    ctx.fillRect(CX - hw * 1.3, b.bottom - 12, b.w * 1.3, 6);
    if (style === 'armor') {
      ctx.strokeStyle = rgba(C.ink, 0.45);
      ctx.lineWidth = 2;
      for (let y = b.top + 24; y < b.bottom - 14; y += 18) {
        ctx.beginPath();
        ctx.moveTo(CX - hw * 1.2, y);
        ctx.lineTo(CX + hw * 1.2, y);
        ctx.stroke();
        ctx.fillStyle = rgba(C.ink, 0.5);
        for (const sx of [-0.65, 0.65]) ctx.fill(circle(CX + sx * hw, y + 4, 1.6));
      }
    }
    gloss(ctx, CX - hw, b.top, b.w, b.bottom - b.top, 0.35);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  }
}

function drawNose(ctx: Ctx, style: string, b: BodyDims, paint: PaintColors): void {
  const hw = b.w / 2;
  const top = b.top;
  if (style === 'bubble') {
    const p = new Path2D();
    p.moveTo(CX - hw, top + 2);
    p.arc(CX, top + 2, hw, Math.PI, 0);
    p.closePath();
    // Antenna.
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX, top - hw);
    ctx.lineTo(CX, top - hw - 12);
    ctx.stroke();
    ink(ctx, circle(CX, top - hw - 14, 4), paint.accent, 2.5);
    ink(ctx, p, radial(ctx, CX - hw * 0.3, top - hw * 0.5, 2, hw * 1.2, [[0, '#e9fdff'], [0.5, paint.window], [1, shade(paint.window, -0.3)]]), 3);
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.fill(ellipse(CX - hw * 0.35, top - hw * 0.5, hw * 0.22, hw * 0.12, -0.6));
    ctx.restore();
    return;
  }
  if (style === 'prism') {
    const p = poly([CX - hw, top + 2, CX - hw * 0.55, top - 30, CX, top - 56, CX + hw * 0.55, top - 30, CX + hw, top + 2]);
    ctx.save();
    ctx.shadowColor = '#c89bff';
    ctx.shadowBlur = 14;
    ink(ctx, p, linear(ctx, CX - hw, 0, CX + hw, 0, [[0, '#f3e6ff'], [0.5, '#b07bff'], [1, '#6b3fd4']]), 3);
    ctx.restore();
    ctx.strokeStyle = rgba('#ffffff', 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX, top - 56);
    ctx.lineTo(CX - hw * 0.2, top);
    ctx.moveTo(CX - hw * 0.55, top - 30);
    ctx.lineTo(CX + hw * 0.55, top - 30);
    ctx.stroke();
    return;
  }
  let tipY = top - 46;
  let shoulder = 0.55;
  if (style === 'needle') {
    tipY = top - 62;
    shoulder = 0.3;
  } else if (style === 'star') {
    tipY = top - 36;
  } else if (style === 'comet') {
    tipY = top - 44;
    shoulder = 0.85;
  }
  const p = new Path2D();
  p.moveTo(CX - hw, top + 2);
  p.bezierCurveTo(CX - hw, top - (top - tipY) * shoulder, CX - hw * 0.35, tipY + 4, CX, tipY);
  p.bezierCurveTo(CX + hw * 0.35, tipY + 4, CX + hw, top - (top - tipY) * shoulder, CX + hw, top + 2);
  p.closePath();
  const g = linear(ctx, CX - hw, 0, CX + hw, 0, [
    [0, shade(paint.accent, -0.1)],
    [0.35, shade(paint.accent, 0.25)],
    [1, shade(paint.accent, -0.3)],
  ]);
  ink(ctx, p, g, 3);
  if (style === 'comet') {
    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(CX - hw, top - 8 - i * 9);
      ctx.quadraticCurveTo(CX, top - 18 - i * 9, CX + hw, top - 6 - i * 9);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (style === 'star') {
    ctx.save();
    ctx.shadowColor = C.yellow;
    ctx.shadowBlur = 10;
    ink(ctx, softStar(CX, tipY - 6, 5, 13, 6), C.yellow, 2.5);
    ctx.restore();
  }
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = rgba('#ffffff', 0.45);
  ctx.fill(ellipse(CX - hw * 0.35, top - (top - tipY) * 0.45, hw * 0.12, (top - tipY) * 0.25, 0.25));
  ctx.restore();
}

function nozzle(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  const p = poly([x - w * 0.32, y, x + w * 0.32, y, x + w * 0.5, y + h, x - w * 0.5, y + h]);
  ink(ctx, p, linear(ctx, x - w / 2, 0, x + w / 2, 0, [[0, shade(color, -0.2)], [0.4, shade(color, 0.3)], [1, shade(color, -0.4)]]), 2.5);
}

/** Where flames come out, relative to the sprite's top-left (pointing up). */
export function nozzlePositions(loadout: RocketLoadout): Array<[number, number]> {
  const b = BODY[styleOf(loadout.body, 'classic')] ?? BODY.classic;
  const style = styleOf(loadout.engine, 'single');
  const y = b.bottom + (style === 'turbo' ? 22 : 16);
  switch (style) {
    case 'twin':
      return [
        [CX - b.w * 0.22, y],
        [CX + b.w * 0.22, y],
      ];
    case 'triple':
      return [
        [CX - b.w * 0.3, y - 2],
        [CX, y],
        [CX + b.w * 0.3, y - 2],
      ];
    default:
      return [[CX, y]];
  }
}

function drawEngine(ctx: Ctx, style: string, b: BodyDims): void {
  const y = b.bottom - 2;
  const metal = C.steel;
  switch (style) {
    case 'twin':
      nozzle(ctx, CX - b.w * 0.22, y, b.w * 0.36, 16, metal);
      nozzle(ctx, CX + b.w * 0.22, y, b.w * 0.36, 16, metal);
      break;
    case 'triple':
      nozzle(ctx, CX - b.w * 0.3, y, b.w * 0.28, 14, metal);
      nozzle(ctx, CX + b.w * 0.3, y, b.w * 0.28, 14, metal);
      nozzle(ctx, CX, y, b.w * 0.34, 18, metal);
      break;
    case 'ion': {
      nozzle(ctx, CX, y, b.w * 0.6, 16, '#7fa6d9');
      ctx.save();
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur = 10;
      ink(ctx, ellipse(CX, y + 16, b.w * 0.3, 4), C.cyan, 2);
      ctx.restore();
      break;
    }
    case 'turbo':
      nozzle(ctx, CX, y, b.w * 0.85, 24, '#e8a25a');
      ctx.fillStyle = rgba(C.ink, 0.35);
      ctx.fillRect(CX - b.w * 0.3, y + 8, b.w * 0.6, 3);
      break;
    case 'star':
      nozzle(ctx, CX, y, b.w * 0.62, 18, '#b07bff');
      ink(ctx, softStar(CX, y + 9, 5, 6, 3), C.yellow, 1.5);
      break;
    default:
      nozzle(ctx, CX, y, b.w * 0.55, 16, metal);
  }
}

function finPair(ctx: Ctx, make: (side: number) => Path2D, fill: string): void {
  for (const side of [-1, 1]) ink(ctx, make(side), fill, 3);
}

function drawFins(ctx: Ctx, style: string, b: BodyDims, paint: PaintColors, back: boolean): void {
  const hw = b.w / 2;
  const by = b.bottom;
  const col = paint.accent;
  if (back) {
    if (style === 'wing') {
      finPair(ctx, (s) => poly([CX + s * hw * 0.8, by - 58, CX + s * (hw + 40), by - 14, CX + s * (hw + 34), by - 2, CX + s * hw * 0.8, by - 18]), col);
      return;
    }
    if (style === 'swept') {
      finPair(ctx, (s) => poly([CX + s * hw * 0.85, by - 44, CX + s * (hw + 26), by + 4, CX + s * (hw + 22), by + 14, CX + s * hw * 0.8, by - 4]), col);
      return;
    }
    if (style === 'round') {
      finPair(ctx, (s) => {
        const p = new Path2D();
        p.moveTo(CX + s * hw * 0.85, by - 40);
        p.quadraticCurveTo(CX + s * (hw + 34), by - 30, CX + s * (hw + 18), by + 10);
        p.quadraticCurveTo(CX + s * hw, by + 6, CX + s * hw * 0.8, by - 4);
        p.closePath();
        return p;
      }, col);
      return;
    }
    if (style === 'star') {
      finPair(ctx, (s) => poly([CX + s * hw * 0.85, by - 40, CX + s * (hw + 22), by + 2, CX + s * hw * 0.8, by - 4]), col);
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.shadowColor = C.yellow;
        ctx.shadowBlur = 8;
        ink(ctx, softStar(CX + s * (hw + 22), by + 2, 5, 9, 4), C.yellow, 2);
        ctx.restore();
      }
      return;
    }
    // basic + quad share side fins
    finPair(ctx, (s) => poly([CX + s * hw * 0.85, by - 36, CX + s * (hw + 20), by + 6, CX + s * (hw + 18), by + 14, CX + s * hw * 0.8, by - 2]), col);
    return;
  }
  // Front layer: the center fin seen face-on.
  if (style === 'quad') {
    ink(ctx, roundRect(CX - 4, by - 30, 8, 44, 4), shade(col, -0.1), 2.5);
  }
}

function drawTank(ctx: Ctx, style: string, b: BodyDims, paint: PaintColors): void {
  const hw = b.w / 2;
  const by = b.bottom;
  switch (style) {
    case 'pods':
    case 'ice':
    case 'boosters':
    case 'glow': {
      const color = style === 'ice' ? '#bfefff' : style === 'glow' ? '#c89bff' : paint.trim;
      for (const s of [-1, 1]) {
        const x = CX + s * (hw + 6);
        const pod = roundRect(x - 8, by - 58, 16, 50, 8);
        if (style === 'glow') {
          ctx.save();
          ctx.shadowColor = '#c89bff';
          ctx.shadowBlur = 12;
        }
        ink(ctx, pod, linear(ctx, x - 8, 0, x + 8, 0, [[0, shade(color, 0.3)], [1, shade(color, -0.25)]]), 2.5);
        if (style === 'glow') ctx.restore();
        if (style === 'ice') {
          ctx.strokeStyle = rgba('#ffffff', 0.9);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI) / 3;
            ctx.moveTo(x - Math.cos(a) * 5, by - 34 - Math.sin(a) * 5);
            ctx.lineTo(x + Math.cos(a) * 5, by - 34 + Math.sin(a) * 5);
          }
          ctx.stroke();
        }
        if (style === 'boosters') nozzle(ctx, x, by - 9, 12, 8, C.steel);
      }
      break;
    }
    default:
      break;
  }
}

function drawBellyBand(ctx: Ctx, b: BodyDims, paint: PaintColors): void {
  const hw = b.w / 2;
  const y = (b.top + b.bottom) / 2 + 8;
  const band = roundRect(CX - hw * b.bulge - 3, y - 7, b.w * b.bulge + 6, 14, 6);
  ink(ctx, band, paint.trim, 2.5);
  ctx.fillStyle = C.lime;
  ctx.fillRect(CX - hw * 0.6, y - 2, hw * 0.9, 4);
}

function drawCargo(ctx: Ctx, style: string, b: BodyDims, paint: PaintColors): void {
  const hw = b.w / 2;
  const y = b.bottom - 30;
  switch (style) {
    case 'pod':
      ink(ctx, roundRect(CX - 12, y - 6, 24, 16, 4), shade(paint.trim, 0.1), 2.5);
      ctx.fillStyle = rgba(C.ink, 0.5);
      ctx.fillRect(CX - 1, y - 6, 2, 16);
      break;
    case 'bags':
      for (const s of [-1, 1]) ink(ctx, roundRect(CX + s * (hw * 0.9) - 7, y - 8, 14, 20, 6), C.tan, 2.5);
      break;
    case 'magnet': {
      ctx.lineWidth = 7;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(CX, y + 2, 8, Math.PI, 0, true);
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = C.red;
      ctx.beginPath();
      ctx.arc(CX, y + 2, 8, Math.PI, 0, true);
      ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.fillRect(CX - 10, y - 2, 4, 4);
      ctx.fillRect(CX + 6, y - 2, 4, 4);
      break;
    }
    case 'big':
      ink(ctx, roundRect(CX - hw * 0.7, y - 10, b.w * 0.7, 22, 5), shade(paint.trim, -0.05), 2.5);
      ctx.fillStyle = rgba(C.ink, 0.4);
      ctx.fillRect(CX - hw * 0.7 + 4, y, b.w * 0.7 - 8, 2);
      break;
    case 'treasure':
      ink(ctx, roundRect(CX - 13, y - 9, 26, 20, 4), C.brown, 2.5);
      ink(ctx, roundRect(CX - 13, y - 9, 26, 7, 3), C.gold, 2);
      ink(ctx, circle(CX, y + 3, 2.5), C.gold, 1.5);
      break;
    default:
      ink(ctx, roundRect(CX - 8, y - 4, 16, 12, 3), shade(paint.main, -0.15), 2);
  }
}

function drawLights(ctx: Ctx, style: string, b: BodyDims, t: number): void {
  const hw = b.w / 2;
  switch (style) {
    case 'blink':
      glowDot(ctx, CX - hw - 18, b.bottom + 8, 7, t < 0.5 ? '#ff4060' : '#ff9aa8');
      glowDot(ctx, CX + hw + 18, b.bottom + 8, 7, t < 0.5 ? '#40ff80' : '#a8ffc8');
      break;
    case 'strip':
      ctx.save();
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur = 8;
      ink(ctx, roundRect(CX - 3, b.top + 8, 6, b.bottom - b.top - 24, 3), '#bff6ff', 1.5);
      ctx.restore();
      break;
    case 'halo':
      ctx.save();
      ctx.shadowColor = C.yellow;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(CX, b.top - 4, hw + 10, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    case 'party':
      for (let i = 0; i < 6; i++) {
        const y = b.top + 12 + i * ((b.bottom - b.top - 24) / 5);
        glowDot(ctx, CX + (i % 2 === 0 ? -hw * 0.75 : hw * 0.75), y, 5, RAINBOW[i]);
      }
      break;
    case 'head':
      glowDot(ctx, CX, b.top - 8, 10, C.yellow);
      break;
    default:
      break;
  }
}

function drawWindows(ctx: Ctx, style: string, b: BodyDims, paint: PaintColors): void {
  const r = Math.max(7, b.w * 0.2);
  const y = b.top + 18;
  const portholes: Array<[number, number, number]> = style === 'capsule' ? [[CX, y, r * 0.8], [CX, y + r * 2, r * 0.6]] : [[CX, y, r]];
  for (const [x, wy, rr] of portholes) {
    ink(ctx, circle(x, wy, rr + 3), C.steel, 2.5);
    ink(ctx, circle(x, wy, rr), radial(ctx, x - rr * 0.3, wy - rr * 0.3, 1, rr * 1.2, [[0, '#ffffff'], [0.3, paint.window], [1, shade(paint.window, -0.4)]]), 2);
    ctx.fillStyle = rgba('#ffffff', 0.85);
    ctx.fill(circle(x - rr * 0.35, wy - rr * 0.35, rr * 0.22));
  }
}

/** Draws a complete rocket from parts. `blink` animates lights (0..1). */
export function drawRocket(ctx: Ctx, loadout: RocketLoadout, blink = 0): void {
  const paint = paintOf(loadout);
  const bodyStyle = styleOf(loadout.body, 'classic');
  const b = BODY[bodyStyle] ?? BODY.classic;
  const tank = styleOf(loadout.tank, 'mini');
  const fins = styleOf(loadout.fins, 'basic');
  drawTank(ctx, tank, b, paint);
  drawFins(ctx, fins, b, paint, true);
  drawEngine(ctx, styleOf(loadout.engine, 'single'), b);
  drawBody(ctx, bodyStyle, b, paint);
  if (tank === 'belly') drawBellyBand(ctx, b, paint);
  drawFins(ctx, fins, b, paint, false);
  drawCargo(ctx, styleOf(loadout.cargo, 'hatch'), b, paint);
  drawWindows(ctx, bodyStyle, b, paint);
  const st = loadout.stickers;
  if (st.length > 0) drawSticker(ctx, st[0], CX - b.w * 0.18, b.bottom - 52, 8);
  if (st.length > 1) drawSticker(ctx, st[1], CX + b.w * 0.2, b.bottom - 46, 8);
  drawLights(ctx, styleOf(loadout.lights, 'none'), b, blink);
  drawNose(ctx, styleOf(loadout.nose, 'cone'), b, paint);
}

/** Flame sprite (pointing down, anchor at top-center). */
export function drawFlame(ctx: Ctx, w: number, h: number, outer: string, inner: string): void {
  const cx = w / 2;
  ctx.save();
  const p = new Path2D();
  p.moveTo(cx - w * 0.42, 0);
  p.quadraticCurveTo(cx - w * 0.5, h * 0.45, cx, h);
  p.quadraticCurveTo(cx + w * 0.5, h * 0.45, cx + w * 0.42, 0);
  p.closePath();
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, inner], [0.4, outer], [1, rgba(outer, 0)]]);
  ctx.fill(p);
  const q = new Path2D();
  q.moveTo(cx - w * 0.22, 0);
  q.quadraticCurveTo(cx - w * 0.25, h * 0.3, cx, h * 0.6);
  q.quadraticCurveTo(cx + w * 0.25, h * 0.3, cx + w * 0.22, 0);
  q.closePath();
  ctx.fillStyle = linear(ctx, 0, 0, 0, h * 0.6, [[0, '#ffffff'], [0.5, inner], [1, rgba(inner, 0)]]);
  ctx.fill(q);
  ctx.restore();
}
