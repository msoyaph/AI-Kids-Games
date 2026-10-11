import { css, darken, lighten } from '../../core/math';
import { ELEMENTS } from '../../data/elements';
import type { ProjectileStyle } from '../../data/towers';
import {
  ballGradient,
  circle,
  coinShape,
  ellipse,
  elementIcon,
  fillStroke,
  gemShape,
  glowDot,
  heartShape,
  polygon,
  roundRect,
  shine,
  softShadow,
  starPath,
  type Ctx,
} from './paint';

// ------------------------------------------------------------- particles

/** White radial glow (tinted at runtime, additive blend = cheap bloom). */
export function drawGlow(ctx: Ctx, w: number): void {
  const c = w / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
}

export function drawSoftDot(ctx: Ctx, w: number): void {
  const c = w / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
}

export function drawSparkle(ctx: Ctx, w: number): void {
  const c = w / 2;
  starPath(ctx, c, c, 4, c * 0.98, c * 0.22, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  glowDot(ctx, c, c, c * 0.45, 0xffffff, 0.9);
}

export function drawPuff(ctx: Ctx, w: number): void {
  const c = w / 2;
  const blobs = [
    [0, 0, 0.42],
    [-0.28, 0.08, 0.3],
    [0.28, 0.1, 0.3],
    [-0.1, -0.22, 0.28],
    [0.16, -0.18, 0.26],
  ];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(c + x! * w, c + y! * w, 0, c + x! * w, c + y! * w, r! * w);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    circle(ctx, c + x! * w, c + y! * w, r! * w);
    ctx.fill();
  }
}

export function drawRing(ctx: Ctx, w: number, thickness: number): void {
  const c = w / 2;
  ctx.lineWidth = thickness;
  ctx.strokeStyle = '#ffffff';
  circle(ctx, c, c, c - thickness);
  ctx.stroke();
  ctx.lineWidth = thickness * 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  circle(ctx, c, c, c - thickness * 1.6);
  ctx.stroke();
}

export function drawCoin(ctx: Ctx, w: number): void {
  coinShape(ctx, w / 2, w / 2, w * 0.42);
}

export function drawHeart(ctx: Ctx, w: number): void {
  heartShape(ctx, w / 2, w / 2 + w * 0.04, w * 0.42);
}

export function drawGem(ctx: Ctx, w: number, color = 0x9b8bff): void {
  gemShape(ctx, w / 2, w / 2, w * 0.42, color);
}

export function drawStunStar(ctx: Ctx, w: number): void {
  starPath(ctx, w / 2, w / 2, 5, w * 0.45, w * 0.2);
  fillStroke(ctx, ballGradient(ctx, w / 2, w / 2, w * 0.45, 0xffe14a), 0x9a6a00, w * 0.07);
}

export function drawRect(ctx: Ctx, w: number, h: number, r: number): void {
  roundRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

export function drawShadow(ctx: Ctx, w: number, h: number): void {
  softShadow(ctx, w / 2, h / 2, w / 2, h / 2, 0.5);
}

/** Chevron used for path preview dots (points +x). */
export function drawChevron(ctx: Ctx, w: number): void {
  const c = w / 2;
  ctx.beginPath();
  ctx.moveTo(c - w * 0.25, c - w * 0.32);
  ctx.lineTo(c + w * 0.22, c);
  ctx.lineTo(c - w * 0.25, c + w * 0.32);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w * 0.2;
  ctx.strokeStyle = 'rgba(30,20,60,0.5)';
  ctx.stroke();
  ctx.lineWidth = w * 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

/** Horizontal beam band: bright core fading to transparent edges. */
export function drawBeam(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Jagged lightning segment (stretched between chain targets). */
export function drawBolt(ctx: Ctx, w: number, h: number): void {
  const pts = [0, 0.5, 0.15, 0.25, 0.3, 0.7, 0.48, 0.3, 0.62, 0.68, 0.78, 0.35, 0.9, 0.62, 1, 0.5];
  for (const [lw, alpha] of [
    [h * 0.42, 0.3],
    [h * 0.22, 0.8],
    [h * 0.09, 1],
  ] as const) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i]! * w;
      const y = pts[i + 1]! * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.stroke();
  }
}

// ------------------------------------------------------------ projectiles

export const PROJECTILE_SIZE: Record<ProjectileStyle, number> = {
  arrow: 30,
  cannonball: 20,
  fireball: 26,
  bubble: 22,
  thorn: 22,
  shadowOrb: 24,
  steamPuff: 30,
  seed: 22,
  wisp: 26,
  lava: 26,
  drop: 18,
  sunSeed: 20,
  shard: 22,
  poisonOrb: 22,
  bark: 26,
  flare: 36,
};

/** Projectiles face +x. */
export function drawProjectile(ctx: Ctx, style: ProjectileStyle, w: number): void {
  const c = w / 2;
  switch (style) {
    case 'arrow': {
      roundRect(ctx, c - w * 0.4, c - 1.3, w * 0.7, 2.6, 1.2);
      fillStroke(ctx, '#f0dcb0', 0x5a3a1a, 0.8);
      ctx.beginPath();
      ctx.moveTo(c + w * 0.45, c);
      ctx.lineTo(c + w * 0.22, c - 4.5);
      ctx.lineTo(c + w * 0.22, c + 4.5);
      ctx.closePath();
      fillStroke(ctx, '#7fd8ff', 0x1a4a7a, 1);
      ctx.beginPath();
      ctx.moveTo(c - w * 0.42, c);
      ctx.lineTo(c - w * 0.3, c - 4);
      ctx.lineTo(c - w * 0.22, c - 4);
      ctx.lineTo(c - w * 0.32, c);
      ctx.lineTo(c - w * 0.22, c + 4);
      ctx.lineTo(c - w * 0.3, c + 4);
      ctx.closePath();
      fillStroke(ctx, '#ff7aa8', 0x7a1a40, 0.8);
      break;
    }
    case 'cannonball': {
      circle(ctx, c, c, w * 0.32);
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.32, 0x4a4e66), 0x15151f, 1.5);
      shine(ctx, c - w * 0.1, c - w * 0.12, w * 0.1, w * 0.06, 0.8);
      break;
    }
    case 'fireball':
    case 'lava':
    case 'flare': {
      const col = style === 'lava' ? 0xff5a1f : style === 'flare' ? 0xffc23a : 0xff7a2b;
      glowDot(ctx, c, c, w * 0.5, col, 0.9);
      circle(ctx, c, c, w * 0.26);
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.26, lighten(col, 0.25)), darken(col, 0.4), 1.2);
      if (style === 'flare') {
        starPath(ctx, c, c, 8, w * 0.45, w * 0.22, 0);
        ctx.fillStyle = 'rgba(255,250,200,0.55)';
        ctx.fill();
      }
      break;
    }
    case 'bubble': {
      circle(ctx, c, c, w * 0.38);
      const g = ctx.createRadialGradient(c - 3, c - 3, 1, c, c, w * 0.38);
      g.addColorStop(0, 'rgba(255,255,255,0.4)');
      g.addColorStop(0.8, 'rgba(120,200,255,0.35)');
      g.addColorStop(1, 'rgba(80,170,255,0.8)');
      fillStroke(ctx, g, 'rgba(230,248,255,0.95)', 1.5);
      shine(ctx, c - w * 0.13, c - w * 0.14, w * 0.11, w * 0.07, 0.95);
      break;
    }
    case 'thorn': {
      ctx.beginPath();
      ctx.moveTo(c + w * 0.45, c);
      ctx.quadraticCurveTo(c, c - w * 0.22, c - w * 0.4, c - 2);
      ctx.lineTo(c - w * 0.4, c + 2);
      ctx.quadraticCurveTo(c, c + w * 0.22, c + w * 0.45, c);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.4, 0x6fdc5a), 0x1a5a1a, 1);
      break;
    }
    case 'shadowOrb':
    case 'poisonOrb':
    case 'wisp': {
      const col = style === 'shadowOrb' ? 0x9b5cff : style === 'poisonOrb' ? 0x8ae04a : 0xff7a3d;
      glowDot(ctx, c, c, w * 0.5, col, 0.85);
      circle(ctx, c, c, w * 0.24);
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.24, col), darken(col, 0.5), 1.2);
      if (style === 'wisp') {
        ctx.beginPath();
        ctx.moveTo(c - w * 0.48, c);
        ctx.quadraticCurveTo(c - w * 0.2, c - w * 0.25, c, c - w * 0.2);
        ctx.lineTo(c, c + w * 0.2);
        ctx.quadraticCurveTo(c - w * 0.2, c + w * 0.25, c - w * 0.48, c);
        ctx.fillStyle = 'rgba(255,170,90,0.7)';
        ctx.fill();
      }
      shine(ctx, c - w * 0.08, c - w * 0.08, w * 0.08, w * 0.05, 0.9);
      break;
    }
    case 'steamPuff': {
      drawPuff(ctx, w);
      break;
    }
    case 'seed':
    case 'sunSeed': {
      const col = style === 'seed' ? 0xff8a3a : 0xffd52e;
      glowDot(ctx, c, c, w * 0.5, col, 0.6);
      ellipse(ctx, c, c, w * 0.3, w * 0.2);
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.3, col), darken(col, 0.5), 1.2);
      break;
    }
    case 'drop': {
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(Math.PI / 2);
      elementIcon(ctx, 'drop', 0, 0, w * 0.4, 0x5fb8ff);
      ctx.restore();
      break;
    }
    case 'shard': {
      ctx.beginPath();
      ctx.moveTo(c + w * 0.45, c);
      ctx.lineTo(c, c - w * 0.18);
      ctx.lineTo(c - w * 0.4, c);
      ctx.lineTo(c, c + w * 0.18);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.4, 0xfff0a0), 0x8a6a2a, 1.2);
      glowDot(ctx, c, c, w * 0.35, 0xfff6c0, 0.6);
      break;
    }
    case 'bark': {
      roundRect(ctx, c - w * 0.38, c - w * 0.14, w * 0.76, w * 0.28, w * 0.1);
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.38, 0x8a5a2b), 0x3a2010, 1.3);
      ctx.fillStyle = '#7bd36a';
      ellipse(ctx, c - w * 0.15, c - w * 0.18, w * 0.12, w * 0.07);
      ctx.fill();
      break;
    }
  }
}

// ------------------------------------------------------------ landmarks

/** The crystal castle the player protects (≈2×2 tiles). */
export function drawCastle(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const base = h * 0.82;
  softShadow(ctx, cx, base + 4, w * 0.48, h * 0.1, 0.45);
  const stone = 0xb9b2e8;
  const out = 0x3b2f7a;
  // walls
  roundRect(ctx, cx - w * 0.4, base - h * 0.34, w * 0.8, h * 0.36, 8);
  fillStroke(ctx, ballGradient(ctx, cx, base - h * 0.2, w * 0.5, stone), out, 2.5);
  // crenellations
  for (let i = 0; i < 5; i++) {
    roundRect(ctx, cx - w * 0.4 + i * w * 0.17, base - h * 0.4, w * 0.12, h * 0.08, 3);
    fillStroke(ctx, css(lighten(stone, 0.15)), out, 2);
  }
  // door
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.09, base);
  ctx.lineTo(cx - w * 0.09, base - h * 0.14);
  ctx.arc(cx, base - h * 0.14, w * 0.09, Math.PI, 0);
  ctx.lineTo(cx + w * 0.09, base);
  ctx.closePath();
  fillStroke(ctx, ballGradient(ctx, cx, base - h * 0.1, w * 0.12, 0x6a4ac8), out, 2);
  // side towers
  for (const s of [-1, 1]) {
    const tx = cx + s * w * 0.36;
    roundRect(ctx, tx - w * 0.1, base - h * 0.62, w * 0.2, h * 0.62, 6);
    fillStroke(ctx, ballGradient(ctx, tx, base - h * 0.4, w * 0.2, stone), out, 2.5);
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.13, base - h * 0.6);
    ctx.lineTo(tx, base - h * 0.8);
    ctx.lineTo(tx + w * 0.13, base - h * 0.6);
    ctx.closePath();
    fillStroke(ctx, ballGradient(ctx, tx, base - h * 0.7, w * 0.15, 0x7a5cff), out, 2.2);
    circle(ctx, tx, base - h * 0.45, w * 0.035);
    fillStroke(ctx, '#ffe9a8', out, 1.2);
  }
  // great crystal on top
  glowDot(ctx, cx, base - h * 0.62, w * 0.36, 0x8ff3ff, 0.75);
  gemShape(ctx, cx, base - h * 0.6, w * 0.19, 0x7ee8ff, 2.2);
  // flags
  for (const s of [-1, 1]) {
    const fx = cx + s * w * 0.36;
    ctx.strokeStyle = css(out);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, base - h * 0.8);
    ctx.lineTo(fx, base - h * 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, base - h * 0.95);
    ctx.lineTo(fx + s * w * 0.12, base - h * 0.91);
    ctx.lineTo(fx, base - h * 0.87);
    ctx.closePath();
    fillStroke(ctx, css(s < 0 ? 0xff6fa8 : 0x5fd4ff), out, 1.2);
  }
}

/** Creature burrow / spawn portal (≈1 tile). */
export function drawPortal(ctx: Ctx, w: number): void {
  const c = w / 2;
  softShadow(ctx, c, c + w * 0.08, w * 0.46, w * 0.3, 0.4);
  ellipse(ctx, c, c, w * 0.42, w * 0.32);
  fillStroke(ctx, ballGradient(ctx, c, c, w * 0.42, 0x8a6a4a), 0x3a2414, 2.5);
  ellipse(ctx, c, c + 2, w * 0.3, w * 0.21);
  const g = ctx.createRadialGradient(c, c + 2, 1, c, c + 2, w * 0.3);
  g.addColorStop(0, '#ff9bf0');
  g.addColorStop(0.4, '#7a3cff');
  g.addColorStop(1, '#2a0f5a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,255,0.75)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let t = 0; t < 1; t += 0.04) {
    const a = t * Math.PI * 3.2;
    const r = t * w * 0.22;
    const x = c + Math.cos(a) * r;
    const y = c + 2 + Math.sin(a) * r * 0.7;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function drawSelectRing(ctx: Ctx, w: number): void {
  const c = w / 2;
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  circle(ctx, c, c, c - 3);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawCellMark(ctx: Ctx, w: number, ok: boolean): void {
  roundRect(ctx, 2, 2, w - 4, w - 4, 10);
  ctx.fillStyle = ok ? 'rgba(120,255,160,0.28)' : 'rgba(255,90,110,0.32)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ok ? 'rgba(160,255,190,0.95)' : 'rgba(255,120,140,0.95)';
  ctx.stroke();
}

export function drawElementToken(ctx: Ctx, w: number, el: keyof typeof ELEMENTS): void {
  const E = ELEMENTS[el];
  elementIcon(ctx, E.icon, w / 2, w / 2, w * 0.42, E.color);
}

export function drawHexTile(ctx: Ctx, w: number): void {
  polygon(ctx, w / 2, w / 2, 6, w * 0.45);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/** Little grass tuft (tinted per theme, sways via skew). Anchor bottom-centre. */
export function drawTuft(ctx: Ctx, w: number, h: number): void {
  ctx.lineCap = 'round';
  const blades = [
    [-6, -0.8, 0.85],
    [-2, -0.25, 1],
    [3, 0.35, 0.9],
    [7, 0.9, 0.7],
  ];
  for (const [dx, lean, len] of blades) {
    ctx.strokeStyle = 'rgba(40,90,30,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2 + dx!, h);
    ctx.quadraticCurveTo(w / 2 + dx! + lean! * 3, h - h * 0.5 * len!, w / 2 + dx! + lean! * 7, h - h * 0.92 * len!);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}
