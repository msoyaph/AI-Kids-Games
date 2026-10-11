import { css, darken, lighten, mixColor } from '../../core/math';
import { ELEMENTS, type ElementId } from '../../data/elements';
import type { EnemyDef } from '../../data/enemies';
import {
  ballGradient,
  circle,
  cuteFace,
  ellipse,
  elementBadge,
  elementIcon,
  fillStroke,
  gemShape,
  roundRect,
  shine,
  starPath,
  type Ctx,
} from './paint';

export const TILE = 64;

/** Logical sprite box for an enemy (room for ears, crowns and wings). */
export function enemyBox(def: EnemyDef): { w: number; h: number } {
  const d = def.radius * TILE * 2;
  const w = Math.ceil(d * (def.look === 'bat' ? 1.9 : 1.45));
  const h = Math.ceil(d * (def.look === 'king' || def.boss ? 1.6 : 1.45));
  return { w, h };
}

export function enemyBodyColor(def: EnemyDef, el: ElementId | null): number {
  return el ? mixColor(def.color, ELEMENTS[el].color, 0.72) : def.color;
}

/**
 * Draws a cute front-facing creature. The body's centre sits at
 * (w/2, h*0.58) so the default anchor keeps feet near the path.
 */
export function drawEnemy(ctx: Ctx, def: EnemyDef, el: ElementId | null, w: number, h: number, frame = 0): void {
  const R = def.radius * TILE;
  const cx = w / 2;
  const cy = h * 0.58;
  const col = enemyBodyColor(def, el);
  const out = darken(col, 0.62);
  const lw = Math.max(1.6, R * 0.09);

  switch (def.look) {
    case 'slime': {
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.05, cy + R * 0.7);
      ctx.bezierCurveTo(cx - R * 1.15, cy - R * 0.2, cx - R * 0.65, cy - R * 1.05, cx, cy - R * 1.05);
      ctx.bezierCurveTo(cx + R * 0.65, cy - R * 1.05, cx + R * 1.15, cy - R * 0.2, cx + R * 1.05, cy + R * 0.7);
      ctx.quadraticCurveTo(cx, cy + R * 0.95, cx - R * 1.05, cy + R * 0.7);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, cx, cy - R * 0.1, R * 1.1, col), out, lw);
      // drips
      ctx.fillStyle = css(lighten(col, 0.25), 0.8);
      ellipse(ctx, cx - R * 0.55, cy + R * 0.62, R * 0.16, R * 0.1);
      ctx.fill();
      shine(ctx, cx - R * 0.45, cy - R * 0.55, R * 0.38, R * 0.22, 0.75);
      cuteFace(ctx, cx, cy - R * 0.05, { eyeR: R * 0.22, spread: R * 0.36, mood: def.boss ? 'cheeky' : 'happy' });
      if (def.boss) crown(ctx, cx, cy - R * 1.0, R * 0.55, 0xffd23f);
      break;
    }
    case 'gremlin': {
      // skates
      for (const s of [-1, 1]) {
        roundRect(ctx, cx + s * R * 0.45 - R * 0.32, cy + R * 0.72, R * 0.64, R * 0.22, R * 0.1);
        fillStroke(ctx, css(0xff4f9a), 0x7a1040, lw * 0.7);
        circle(ctx, cx + s * R * 0.45 - R * 0.18, cy + R * 1.0, R * 0.1);
        fillStroke(ctx, '#ffffff', 0x333333, lw * 0.5);
        circle(ctx, cx + s * R * 0.45 + R * 0.18, cy + R * 1.0, R * 0.1);
        fillStroke(ctx, '#ffffff', 0x333333, lw * 0.5);
      }
      // ears
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * R * 0.45, cy - R * 0.55);
        ctx.lineTo(cx + s * R * 1.25, cy - R * 1.0);
        ctx.lineTo(cx + s * R * 0.85, cy - R * 0.1);
        ctx.closePath();
        fillStroke(ctx, ballGradient(ctx, cx + s * R, cy - R * 0.6, R * 0.6, col), out, lw);
        ctx.beginPath();
        ctx.moveTo(cx + s * R * 0.6, cy - R * 0.45);
        ctx.lineTo(cx + s * R * 1.05, cy - R * 0.78);
        ctx.lineTo(cx + s * R * 0.82, cy - R * 0.25);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,170,190,0.85)';
        ctx.fill();
      }
      circle(ctx, cx, cy, R * 0.85);
      fillStroke(ctx, ballGradient(ctx, cx, cy, R * 0.9, col), out, lw);
      // tuft
      ctx.strokeStyle = css(out);
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - R * 0.85);
      ctx.quadraticCurveTo(cx + R * 0.2, cy - R * 1.25, cx + R * 0.35, cy - R * 1.1);
      ctx.stroke();
      shine(ctx, cx - R * 0.35, cy - R * 0.45, R * 0.3, R * 0.18, 0.6);
      cuteFace(ctx, cx, cy - R * 0.1, { eyeR: R * 0.24, spread: R * 0.34, mood: 'cheeky' });
      break;
    }
    case 'robot': {
      // wind-up key on the side
      const kx = cx + R * 0.95;
      ctx.strokeStyle = css(0xd9a43a);
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.7, cy);
      ctx.lineTo(kx, cy);
      ctx.stroke();
      for (const s of [-1, 1]) {
        ellipse(ctx, kx + R * 0.12, cy + s * R * 0.22, R * 0.14, R * 0.24);
        fillStroke(ctx, ballGradient(ctx, kx, cy, R * 0.3, 0xffc94a), 0x7a5200, lw * 0.7);
      }
      // feet
      for (const s of [-1, 1]) {
        roundRect(ctx, cx + s * R * 0.42 - R * 0.22, cy + R * 0.6, R * 0.44, R * 0.32, R * 0.1);
        fillStroke(ctx, css(darken(col, 0.3)), out, lw * 0.8);
      }
      roundRect(ctx, cx - R * 0.78, cy - R * 0.75, R * 1.56, R * 1.45, R * 0.35);
      fillStroke(ctx, ballGradient(ctx, cx, cy - R * 0.1, R * 1.1, col), out, lw);
      // bolts
      ctx.fillStyle = css(darken(col, 0.35));
      for (const [bx, by] of [
        [-0.6, -0.58],
        [0.6, -0.58],
        [-0.6, 0.52],
        [0.6, 0.52],
      ]) {
        circle(ctx, cx + bx! * R, cy + by! * R, R * 0.06);
        ctx.fill();
      }
      // visor
      roundRect(ctx, cx - R * 0.58, cy - R * 0.45, R * 1.16, R * 0.62, R * 0.25);
      fillStroke(ctx, css(0x24304a), 0x111827, lw * 0.6);
      for (const s of [-1, 1]) {
        circle(ctx, cx + s * R * 0.27, cy - R * 0.15, R * 0.15);
        fillStroke(ctx, ballGradient(ctx, cx + s * R * 0.27, cy - R * 0.15, R * 0.15, 0x7ff0ff), 0x1a6a80, lw * 0.4);
        circle(ctx, cx + s * R * 0.27 - R * 0.05, cy - R * 0.2, R * 0.05);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.strokeStyle = '#7ff0ff';
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy - R * 0.02, R * 0.15, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      // tin hat
      roundRect(ctx, cx - R * 0.42, cy - R * 1.05, R * 0.84, R * 0.34, R * 0.1);
      fillStroke(ctx, ballGradient(ctx, cx, cy - R * 0.9, R * 0.5, 0xff6b6b), 0x7a1a1a, lw * 0.8);
      circle(ctx, cx, cy - R * 1.12, R * 0.1);
      fillStroke(ctx, css(0xffd23f), 0x7a5200, lw * 0.5);
      shine(ctx, cx - R * 0.45, cy - R * 0.62, R * 0.22, R * 0.1, 0.6);
      if (def.boss) {
        // big boss gets a cheeky moustache of bolts and a chest gem
        gemShape(ctx, cx, cy + R * 0.42, R * 0.16, 0xff6b9a, lw * 0.4);
      }
      break;
    }
    case 'bat': {
      const up = frame === 0;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        const wy = up ? -R * 0.75 : R * 0.15;
        ctx.moveTo(cx + s * R * 0.6, cy - R * 0.1);
        ctx.quadraticCurveTo(cx + s * R * 1.4, cy + wy - R * 0.2, cx + s * R * 1.75, cy + wy);
        ctx.quadraticCurveTo(cx + s * R * 1.35, cy + wy + R * 0.25, cx + s * R * 1.2, cy + wy + R * 0.4);
        ctx.quadraticCurveTo(cx + s * R * 1.0, cy + wy + R * 0.2, cx + s * R * 0.85, cy + wy + R * 0.5);
        ctx.quadraticCurveTo(cx + s * R * 0.75, cy + R * 0.2, cx + s * R * 0.6, cy + R * 0.3);
        ctx.closePath();
        fillStroke(ctx, ballGradient(ctx, cx + s * R, cy, R, darken(col, 0.1)), out, lw);
      }
      // fluffy puffball body
      ctx.beginPath();
      const bumps = 14;
      for (let i = 0; i <= bumps; i++) {
        const a = (i / bumps) * Math.PI * 2;
        const rr = R * (0.88 + (i % 2) * 0.08);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, cx, cy, R, col), out, lw);
      // ear tufts
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * R * 0.25, cy - R * 0.8);
        ctx.lineTo(cx + s * R * 0.45, cy - R * 1.2);
        ctx.lineTo(cx + s * R * 0.6, cy - R * 0.68);
        ctx.closePath();
        fillStroke(ctx, css(col), out, lw * 0.8);
      }
      shine(ctx, cx - R * 0.35, cy - R * 0.4, R * 0.3, R * 0.18, 0.6);
      cuteFace(ctx, cx, cy - R * 0.05, { eyeR: R * 0.23, spread: R * 0.32, mood: 'happy' });
      // fang-free tiny tooth for cuteness
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.06, cy + R * 0.3);
      ctx.lineTo(cx + R * 0.06, cy + R * 0.3);
      ctx.lineTo(cx, cy + R * 0.42);
      ctx.closePath();
      ctx.fill();
      if (def.boss) crown(ctx, cx, cy - R * 0.95, R * 0.45, 0xff9bd8);
      break;
    }
    case 'mushroom': {
      // stem/body
      roundRect(ctx, cx - R * 0.55, cy - R * 0.2, R * 1.1, R * 1.05, R * 0.4);
      fillStroke(ctx, ballGradient(ctx, cx, cy + R * 0.3, R * 0.8, 0xfff1dc), 0x8a6a4a, lw);
      cuteFace(ctx, cx, cy + R * 0.18, { eyeR: R * 0.18, spread: R * 0.25, mood: 'happy' });
      // cap
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.1, cy - R * 0.1);
      ctx.bezierCurveTo(cx - R * 1.1, cy - R * 1.2, cx + R * 1.1, cy - R * 1.2, cx + R * 1.1, cy - R * 0.1);
      ctx.quadraticCurveTo(cx, cy + R * 0.1, cx - R * 1.1, cy - R * 0.1);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, cx, cy - R * 0.6, R * 1.1, col), out, lw);
      ctx.fillStyle = '#ffffff';
      for (const [sx, sy, sr] of [
        [-0.55, -0.45, 0.17],
        [0.1, -0.75, 0.2],
        [0.6, -0.4, 0.15],
        [-0.15, -0.3, 0.1],
      ]) {
        circle(ctx, cx + sx! * R, cy + sy! * R, sr! * R);
        ctx.fill();
      }
      // little healing plus sign
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, cx + R * 0.72, cy - R * 1.2, R * 0.12, R * 0.38, R * 0.05);
      ctx.fill();
      roundRect(ctx, cx + R * 0.59, cy - R * 1.07, R * 0.38, R * 0.12, R * 0.05);
      ctx.fill();
      break;
    }
    case 'imp': {
      // tail
      ctx.strokeStyle = css(out);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.6, cy + R * 0.4);
      ctx.quadraticCurveTo(cx + R * 1.2, cy + R * 0.5, cx + R * 1.05, cy - R * 0.05);
      ctx.stroke();
      circle(ctx, cx + R * 1.05, cy - R * 0.1, R * 0.12);
      fillStroke(ctx, css(col), out, lw * 0.6);
      // horns
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * R * 0.35, cy - R * 0.7);
        ctx.quadraticCurveTo(cx + s * R * 0.55, cy - R * 1.25, cx + s * R * 0.8, cy - R * 1.05);
        ctx.quadraticCurveTo(cx + s * R * 0.65, cy - R * 0.85, cx + s * R * 0.65, cy - R * 0.55);
        ctx.closePath();
        fillStroke(ctx, css(0xfff1c4), 0x8a6a2a, lw * 0.7);
      }
      circle(ctx, cx, cy, R * 0.85);
      fillStroke(ctx, ballGradient(ctx, cx, cy, R * 0.9, col), out, lw);
      shine(ctx, cx - R * 0.35, cy - R * 0.45, R * 0.28, R * 0.16, 0.6);
      cuteFace(ctx, cx, cy - R * 0.05, { eyeR: R * 0.24, spread: R * 0.33, mood: 'cheeky' });
      break;
    }
    case 'king': {
      // cape
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.9, cy - R * 0.2);
      ctx.quadraticCurveTo(cx - R * 1.25, cy + R * 0.6, cx - R * 0.9, cy + R * 0.95);
      ctx.lineTo(cx + R * 0.9, cy + R * 0.95);
      ctx.quadraticCurveTo(cx + R * 1.25, cy + R * 0.6, cx + R * 0.9, cy - R * 0.2);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, cx, cy + R * 0.3, R, 0xc23b6b), 0x5a1030, lw);
      circle(ctx, cx, cy, R * 0.88);
      fillStroke(ctx, ballGradient(ctx, cx, cy, R * 0.9, col), out, lw);
      // fluffy collar
      for (let i = 0; i < 9; i++) {
        const x = cx - R * 0.8 + (i / 8) * R * 1.6;
        circle(ctx, x, cy + R * 0.7, R * 0.16);
        fillStroke(ctx, '#ffffff', 0xb0b0c0, lw * 0.4);
      }
      shine(ctx, cx - R * 0.35, cy - R * 0.45, R * 0.3, R * 0.18, 0.55);
      cuteFace(ctx, cx, cy - R * 0.1, { eyeR: R * 0.2, spread: R * 0.32, mood: 'grumpy' });
      crown(ctx, cx, cy - R * 0.92, R * 0.7, 0xffd23f, true);
      break;
    }
  }

  if (el && !def.boss && def.look !== 'king') {
    const E = ELEMENTS[el];
    elementBadge(ctx, E.icon, cx + R * 0.72, cy + R * 0.48, Math.max(5, R * 0.34), E.color);
  }
}

/** Little crown. `gemSlot` leaves the centre gem empty (drawn live for the Grumble King). */
function crown(ctx: Ctx, cx: number, cy: number, r: number, color: number, gemSlot = false): void {
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r * 0.35);
  ctx.lineTo(cx - r, cy - r * 0.45);
  ctx.lineTo(cx - r * 0.5, cy);
  ctx.lineTo(cx, cy - r * 0.7);
  ctx.lineTo(cx + r * 0.5, cy);
  ctx.lineTo(cx + r, cy - r * 0.45);
  ctx.lineTo(cx + r, cy + r * 0.35);
  ctx.closePath();
  fillStroke(ctx, ballGradient(ctx, cx, cy, r, color), darken(color, 0.55), Math.max(1, r * 0.12));
  if (!gemSlot) {
    circle(ctx, cx, cy + r * 0.05, r * 0.16);
    fillStroke(ctx, ballGradient(ctx, cx, cy, r * 0.16, 0xff4f7b), 0x7a1030, r * 0.06);
  } else {
    circle(ctx, cx, cy + r * 0.05, r * 0.22);
    fillStroke(ctx, '#3a2050', 0x2a1030, r * 0.06);
  }
  starPath(ctx, cx - r * 0.65, cy - r * 0.1, 4, r * 0.14, r * 0.05, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/** Translucent element bubble with the element's icon on top. */
export function drawShield(ctx: Ctx, el: ElementId, size: number): void {
  const E = ELEMENTS[el];
  const c = size / 2;
  const r = size * 0.45;
  const g = ctx.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
  g.addColorStop(0, css(lighten(E.color, 0.8), 0.15));
  g.addColorStop(0.75, css(E.color, 0.22));
  g.addColorStop(1, css(E.color, 0.55));
  circle(ctx, c, c, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  ctx.strokeStyle = css(lighten(E.color, 0.3), 0.9);
  ctx.stroke();
  shine(ctx, c - r * 0.42, c - r * 0.45, r * 0.32, r * 0.16, 0.85);
  elementIcon(ctx, E.icon, c, c - r * 0.92, size * 0.13, E.color);
}
