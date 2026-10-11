import { css, darken, lighten } from '../../core/math';
import { ELEMENTS } from '../../data/elements';
import type { ProjectileStyle } from '../../data/towers';
import {
  ballGradient,
  circle,
  ellipse,
  elementIcon,
  fillStroke,
  gemShape,
  glowDot,
  polygon,
  roundRect,
  shine,
  softShadow,
  starPath,
  type Ctx,
} from './paint';
import { chamferPoly, chamferRect, contactShadow, crystal, energyCore, glint, metalGradient, strokePath } from './tech';

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

/** Energy vapour: a soft haze with faint hex facets (white, tinted at runtime). */
export function drawPuff(ctx: Ctx, w: number): void {
  const c = w / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, w * 0.48);
  g.addColorStop(0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  circle(ctx, c, c, w * 0.48);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, w * 0.025);
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = c + Math.cos(a) * w * 0.3;
    const y = c + Math.sin(a) * w * 0.3;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** Ground field for lingering zones: hex plate of energy with a rune rim (white, tinted at runtime). */
export function drawField(ctx: Ctx, w: number): void {
  const c = w / 2;
  const r = w * 0.46;
  const hex = (rr: number): void => {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = c + Math.cos(a) * rr;
      const y = c + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  const g = ctx.createRadialGradient(c, c, 0, c, c, r);
  g.addColorStop(0, 'rgba(255,255,255,0.12)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0.5)');
  hex(r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1.5, w * 0.022);
  ctx.stroke();
  hex(r * 0.62);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.stroke();
  // rune ticks on the rim
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(1, w * 0.016);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r * 0.74, c + Math.sin(a) * r * 0.74);
    ctx.lineTo(c + Math.cos(a) * r * 0.84, c + Math.sin(a) * r * 0.84);
    ctx.stroke();
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
  // hexagonal gold coin stamped with the Vanex chevron
  const c = w / 2;
  const r = w * 0.44;
  polygon(ctx, c, c, 6, r, Math.PI / 6);
  const g = ctx.createLinearGradient(c - r, c - r, c + r, c + r);
  g.addColorStop(0, css(0xfff1b0));
  g.addColorStop(0.5, css(0xffc845));
  g.addColorStop(1, css(0xb07a10));
  fillStroke(ctx, g, 0x4a3000, w * 0.07);
  ctx.beginPath();
  ctx.moveTo(c - r * 0.42, c - r * 0.3);
  ctx.lineTo(c, c + r * 0.38);
  ctx.lineTo(c + r * 0.42, c - r * 0.3);
  ctx.strokeStyle = css(0x6a4400);
  ctx.lineWidth = w * 0.09;
  ctx.lineJoin = 'miter';
  ctx.stroke();
}

export function drawHeart(ctx: Ctx, w: number): void {
  // life core: a cyan crystal inside a shield
  const c = w / 2;
  ctx.beginPath();
  ctx.moveTo(c, w * 0.06);
  ctx.lineTo(w * 0.9, w * 0.22);
  ctx.lineTo(w * 0.82, w * 0.62);
  ctx.lineTo(c, w * 0.95);
  ctx.lineTo(w * 0.18, w * 0.62);
  ctx.lineTo(w * 0.1, w * 0.22);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, w, w);
  g.addColorStop(0, css(0x4a5878));
  g.addColorStop(1, css(0x141b2e));
  fillStroke(ctx, g, 0x070b16, w * 0.07);
  gemShape(ctx, c, w * 0.48, w * 0.24, 0x3ee6ff, w * 0.04);
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
  ctx.moveTo(c - w * 0.28, c - w * 0.34);
  ctx.lineTo(c + w * 0.2, c);
  ctx.lineTo(c - w * 0.28, c + w * 0.34);
  ctx.lineTo(c - w * 0.12, c);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(4,8,20,0.55)';
  ctx.lineWidth = w * 0.08;
  ctx.lineJoin = 'miter';
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
      // twin-rail energy bolt
      const g = ctx.createLinearGradient(c - w * 0.45, 0, c + w * 0.45, 0);
      g.addColorStop(0, 'rgba(62,230,255,0)');
      g.addColorStop(0.6, 'rgba(62,230,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c - w * 0.45, c - 1.2);
      ctx.lineTo(c + w * 0.3, c - 2.6);
      ctx.lineTo(c + w * 0.46, c);
      ctx.lineTo(c + w * 0.3, c + 2.6);
      ctx.lineTo(c - w * 0.45, c + 1.2);
      ctx.closePath();
      ctx.fill();
      glowDot(ctx, c + w * 0.3, c, w * 0.18, 0x3ee6ff, 0.9);
      break;
    }
    case 'cannonball': {
      // armour-piercing shell with a hot band
      ctx.beginPath();
      ctx.moveTo(c + w * 0.36, c);
      ctx.lineTo(c + w * 0.12, c - w * 0.2);
      ctx.lineTo(c - w * 0.3, c - w * 0.2);
      ctx.lineTo(c - w * 0.3, c + w * 0.2);
      ctx.lineTo(c + w * 0.12, c + w * 0.2);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, c - w * 0.2, 0, c + w * 0.2);
      g.addColorStop(0, css(0x8a95b0));
      g.addColorStop(1, css(0x2a3044));
      fillStroke(ctx, g, 0x070b16, 1.4);
      ctx.fillStyle = css(0xffb347);
      ctx.fillRect(c - w * 0.05, c - w * 0.2, w * 0.07, w * 0.4);
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
      // hydro charge: a water-energy orb in a thin ring
      glowDot(ctx, c, c, w * 0.5, 0x2fa8ff, 0.7);
      circle(ctx, c, c, w * 0.3);
      fillStroke(ctx, ballGradient(ctx, c, c, w * 0.3, 0x5fc4ff), 'rgba(220,246,255,0.95)', 1.4);
      circle(ctx, c, c, w * 0.42);
      ctx.strokeStyle = 'rgba(155,231,255,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
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
      // pressurised vapour charge: hot core inside a hex shell
      glowDot(ctx, c, c, w * 0.5, 0x9be7ff, 0.7);
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = c + Math.cos(a) * w * 0.26;
        const y = c + Math.sin(a) * w * 0.26;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      fillStroke(ctx, 'rgba(190,240,255,0.55)', 'rgba(240,252,255,0.95)', 1.4);
      glowDot(ctx, c, c, w * 0.16, 0xffffff, 1);
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
  // The Vanex Citadel: crystal spire flanked by two pylons on a hex dais
  const cx = w / 2;
  const base = h * 0.82;
  contactShadow(ctx, cx, base + 2, w * 0.48, h * 0.1, 0.6);
  // energy dome
  energyCore(ctx, cx, base - h * 0.42, w * 0.3, 0x3ee6ff, 1.35);
  // hex dais
  chamferPoly(ctx, cx, base - h * 0.06, 6, w * 0.42, w * 0.05, Math.PI / 6);
  ctx.save();
  ctx.translate(cx, base - h * 0.06);
  ctx.scale(1, 0.42);
  ctx.translate(-cx, -(base - h * 0.06));
  chamferPoly(ctx, cx, base - h * 0.06, 6, w * 0.42, w * 0.05, Math.PI / 6);
  ctx.fillStyle = metalGradient(ctx, cx - w * 0.4, base - h * 0.2, cx + w * 0.4, base, 0x3a4766);
  ctx.fill();
  strokePath(ctx, 0x070b16, 2.2);
  ctx.restore();
  runeRingFlat(ctx, cx, base - h * 0.06, w * 0.3, 0x3ee6ff);
  // pylons
  for (const s of [-1, 1]) {
    const px = cx + s * w * 0.3;
    chamferRect(ctx, px - w * 0.07, base - h * 0.52, w * 0.14, h * 0.46, w * 0.03);
    ctx.fillStyle = metalGradient(ctx, px - w * 0.07, base - h * 0.52, px + w * 0.07, base, 0x4a5878);
    ctx.fill();
    strokePath(ctx, 0x070b16, 2);
    crystal(ctx, px, base - h * 0.6, h * 0.2, w * 0.08, -Math.PI / 2, s < 0 ? 0x7ee8ff : 0xb48cff, 1.6);
    energyCore(ctx, px, base - h * 0.32, w * 0.025, 0x3ee6ff, 2.4);
  }
  // central spire
  chamferRect(ctx, cx - w * 0.12, base - h * 0.48, w * 0.24, h * 0.44, w * 0.05);
  ctx.fillStyle = metalGradient(ctx, cx - w * 0.12, base - h * 0.48, cx + w * 0.12, base, 0x56668c);
  ctx.fill();
  strokePath(ctx, 0x070b16, 2.4);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, base - h * 0.04);
  ctx.lineTo(cx - w * 0.06, base - h * 0.2);
  ctx.lineTo(cx, base - h * 0.25);
  ctx.lineTo(cx + w * 0.06, base - h * 0.2);
  ctx.lineTo(cx + w * 0.06, base - h * 0.04);
  ctx.closePath();
  ctx.fillStyle = css(0x0b1020);
  ctx.fill();
  energyCore(ctx, cx, base - h * 0.14, w * 0.03, 0x3ee6ff, 2.2);
  // great crystal
  crystal(ctx, cx, base - h * 0.7, h * 0.48, w * 0.2, -Math.PI / 2, 0x6fe8ff, 2.2);
  glint(ctx, cx - w * 0.04, base - h * 0.84, w * 0.08, 0.95);
}

function runeRingFlat(ctx: Ctx, cx: number, cy: number, r: number, color: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.42);
  ctx.strokeStyle = css(color, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
    ctx.stroke();
  }
  ctx.restore();
}

/** Creature burrow / spawn portal (≈1 tile). */
export function drawPortal(ctx: Ctx, w: number): void {
  // Shardbound rift gate: angular frame around a violet tear in space
  const c = w / 2;
  contactShadow(ctx, c, c + w * 0.1, w * 0.46, w * 0.28, 0.55);
  chamferPoly(ctx, c, c, 6, w * 0.44, w * 0.06, 0);
  ctx.fillStyle = metalGradient(ctx, 0, 0, w, w, 0x2a2f45);
  ctx.fill();
  strokePath(ctx, 0x070b16, 2.2);
  const g = ctx.createRadialGradient(c, c, 1, c, c, w * 0.34);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, '#e2b8ff');
  g.addColorStop(0.5, '#8a3cff');
  g.addColorStop(1, '#1a0838');
  chamferPoly(ctx, c, c, 6, w * 0.33, w * 0.04, 0);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,200,255,0.8)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.04) {
      const a = t * Math.PI * 2.4 + k * Math.PI;
      const r = t * w * 0.28;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    energyCore(ctx, c + Math.cos(a) * w * 0.39, c + Math.sin(a) * w * 0.39, w * 0.025, 0xb48cff, 2.2);
  }
}

export function drawSelectRing(ctx: Ctx, w: number): void {
  // targeting reticle: four bracket arcs
  const c = w / 2;
  const r = c - 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.strokeStyle = 'rgba(62,230,255,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(c, c, r, a - 0.45, a + 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#bff6ff';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

export function drawCellMark(ctx: Ctx, w: number, ok: boolean): void {
  const col = ok ? 0x3dffa0 : 0xff4d6a;
  chamferRect(ctx, 3, 3, w - 6, w - 6, 9);
  ctx.fillStyle = css(col, 0.18);
  ctx.fill();
  // corner brackets
  ctx.strokeStyle = css(col, 0.95);
  ctx.lineWidth = 3;
  ctx.lineCap = 'square';
  const k = w * 0.22;
  const m = 5;
  ctx.beginPath();
  ctx.moveTo(m, m + k);
  ctx.lineTo(m, m);
  ctx.lineTo(m + k, m);
  ctx.moveTo(w - m - k, m);
  ctx.lineTo(w - m, m);
  ctx.lineTo(w - m, m + k);
  ctx.moveTo(w - m, w - m - k);
  ctx.lineTo(w - m, w - m);
  ctx.lineTo(w - m - k, w - m);
  ctx.moveTo(m + k, w - m);
  ctx.lineTo(m, w - m);
  ctx.lineTo(m, w - m - k);
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

/** Crystal shard particle (white; tinted at runtime) used when constructs shatter. */
export function drawShard(ctx: Ctx, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(w, h / 2);
  ctx.lineTo(w * 0.42, 0);
  ctx.lineTo(0, h / 2);
  ctx.lineTo(w * 0.42, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(200,210,230,0.95)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,130,160,0.9)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, 0);
  ctx.lineTo(w * 0.55, h / 2);
  ctx.lineTo(w * 0.42, h);
  ctx.stroke();
}
