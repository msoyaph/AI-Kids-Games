import { css, darken, lighten, mixColor } from '../../core/math';
import { ELEMENTS } from '../../data/elements';
import type { TowerDef } from '../../data/towers';
import { circle, elementIcon, type Ctx } from './paint';
import {
  chamferPoly,
  chamferRect,
  contactShadow,
  crystal,
  dualRing,
  energyCore,
  facets,
  glint,
  metalGradient,
  rivet,
  runeRing,
  strokePath,
  TECH,
} from './tech';

export const TOWER_BASE_SIZE = 78;
export const TOWER_HEAD_SIZE = 76;

/** Level notch colours: steel, silver, gold, crystal. */
const NOTCH = [0x8fa0c2, 0xd8e2f5, TECH.gold, 0x8ff3ff];

/**
 * Angular metal plinth with an element rune ring. Level shows as glowing
 * notches, gold trim (L3) and a crystal halo with corner shards (L4).
 */
export function drawTowerBase(ctx: Ctx, def: TowerDef, level: number): void {
  const S = TOWER_BASE_SIZE;
  const cx = S / 2;
  const cy = S / 2;
  contactShadow(ctx, cx + 2, cy + 6, 34, 26, 0.55);
  const els = def.elements.map((e) => ELEMENTS[e]);

  if (level >= 4) {
    // outer halo + four orbiting shards
    energyCore(ctx, cx, cy, 20, els[0]?.color ?? TECH.cyan, 1.85);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      crystal(ctx, cx + Math.cos(a) * 33, cy + Math.sin(a) * 33, 9, 4.5, a, els[i % Math.max(1, els.length)]?.color ?? TECH.cyan, 1);
    }
  }

  // plinth
  chamferPoly(ctx, cx, cy, 8, 30, 4.5, Math.PI / 8);
  ctx.fillStyle = metalGradient(ctx, cx - 30, cy - 30, cx + 30, cy + 30, level >= 3 ? 0x3d4866 : TECH.steel);
  ctx.fill();
  strokePath(ctx, TECH.ink, 2.2);
  if (level >= 3) {
    chamferPoly(ctx, cx, cy, 8, 28.2, 4, Math.PI / 8);
    strokePath(ctx, TECH.gold, 1.4, 0.85);
  }
  // inset top face with panel seams
  chamferPoly(ctx, cx, cy, 8, 23.5, 3.5, Math.PI / 8);
  ctx.fillStyle = css(0x161d2e);
  ctx.fill();
  strokePath(ctx, lighten(TECH.steel, 0.25), 1, 0.6);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    ctx.moveTo(cx + Math.cos(a) * 23.5, cy + Math.sin(a) * 23.5);
    ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
  }
  ctx.stroke();

  // rune ring (element identity) — combos split into both colours
  if (els.length === 2) dualRing(ctx, cx, cy, 19.5, els[0]!.color, els[1]!.color, 1.8);
  else if (els.length === 1) runeRing(ctx, cx, cy, 19.5, els[0]!.color, 12, 1.5);
  else runeRing(ctx, cx, cy, 19.5, 0x8fb4ff, 8, 1.2, 0.6);

  if (level >= 2) for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    rivet(ctx, cx + Math.cos(a) * 26.5, cy + Math.sin(a) * 26.5, 1.8);
  }

  // level notches along the bottom edge
  for (let i = 0; i < level; i++) {
    const x = cx + (i - (level - 1) / 2) * 7;
    const y = cy + 27.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = css(NOTCH[level - 1]!);
    ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
    ctx.strokeStyle = css(TECH.ink);
    ctx.lineWidth = 1;
    ctx.strokeRect(-2.4, -2.4, 4.8, 4.8);
    ctx.restore();
  }
}

/** Element icons engraved on combo hardware (shape cue for colour-blind players). */
function sigils(ctx: Ctx, def: TowerDef, x: number, y: number, r: number, gap = 1.6): void {
  const els = def.elements.map((e) => ELEMENTS[e]);
  els.forEach((E, i) => elementIcon(ctx, E.icon, x + (i - (els.length - 1) / 2) * r * gap, y, r, E.color));
}

function hub(ctx: Ctx, r: number, color: number, sides = 6): void {
  chamferPoly(ctx, 0, 0, sides, r, r * 0.22, Math.PI / sides);
  ctx.fillStyle = metalGradient(ctx, -r, -r, r, r, color);
  ctx.fill();
  strokePath(ctx, TECH.ink, 1.8);
}

/**
 * Tower "head". Rotating heads face +x (angle 0); the renderer rotates them
 * toward targets. Bigger and more ornate at higher levels.
 */
export function drawTowerHead(ctx: Ctx, def: TowerDef, level: number): void {
  const S = TOWER_HEAD_SIZE;
  const k = 0.82 + level * 0.06;
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.scale(k, k);
  const body = def.look.body;
  const acc = def.look.accent;
  const els = def.elements.map((e) => ELEMENTS[e]);
  const e0 = els[0];
  const e1 = els[1] ?? els[0];
  const c0 = e0?.color ?? acc;
  const c1 = e1?.color ?? acc;

  switch (def.look.shape) {
    case 'post': {
      // twin-rail bolt turret
      chamferRect(ctx, -16, -9, 14, 18, 3);
      ctx.fillStyle = metalGradient(ctx, -16, -9, -2, 9, darken(TECH.steel, 0.15));
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.6);
      for (const s of [-1, 1]) {
        chamferRect(ctx, -2, s * 6 - 2, 30, 4, 1.2);
        ctx.fillStyle = metalGradient(ctx, 0, s * 6 - 2, 0, s * 6 + 2, TECH.steelLight);
        ctx.fill();
        strokePath(ctx, TECH.ink, 1.2);
      }
      ctx.strokeStyle = css(acc, 0.45);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(27, 0);
      ctx.stroke();
      ctx.strokeStyle = css(lighten(acc, 0.6));
      ctx.lineWidth = 1.6;
      ctx.stroke();
      hub(ctx, 12, TECH.steel);
      energyCore(ctx, 0, 0, 4.5, acc, 1.7);
      if (level >= 3) for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-8, s * 10);
        ctx.lineTo(-16, s * 17);
        ctx.lineTo(-2, s * 12);
        ctx.closePath();
        ctx.fillStyle = css(TECH.gold);
        ctx.fill();
        strokePath(ctx, TECH.ink, 1);
      }
      break;
    }
    case 'cannon': {
      chamferRect(ctx, 6, -6.5, 22, 13, 2);
      ctx.fillStyle = metalGradient(ctx, 0, -6.5, 0, 6.5, darken(body, 0.1));
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.6);
      for (const x of [12, 18]) {
        ctx.fillStyle = css(darken(body, 0.45));
        ctx.fillRect(x, -6.5, 2, 13);
      }
      chamferRect(ctx, 25, -8.5, 7, 17, 2);
      ctx.fillStyle = metalGradient(ctx, 25, -8.5, 32, 8.5, TECH.steelLight);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.4);
      chamferRect(ctx, -17, -14, 26, 28, 6);
      ctx.fillStyle = metalGradient(ctx, -17, -14, 9, 14, body);
      ctx.fill();
      strokePath(ctx, TECH.ink, 2);
      ctx.fillStyle = css(acc);
      ctx.fillRect(-15, -3, 22, 2.5);
      ctx.fillRect(-15, 1.5, 22, 1.2);
      energyCore(ctx, -9, 0, 3.6, acc, 1.6);
      if (level >= 2) {
        rivet(ctx, -12, -9, 1.6);
        rivet(ctx, -12, 9, 1.6);
        rivet(ctx, 4, -9, 1.6);
        rivet(ctx, 4, 9, 1.6);
      }
      break;
    }
    case 'spire': {
      chamferPoly(ctx, 0, 0, 8, 17, 3, Math.PI / 8);
      ctx.fillStyle = metalGradient(ctx, -17, -17, 17, 17, darken(TECH.steel, 0.1));
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.8);
      const prongs = level >= 3 ? 6 : 4;
      for (let i = 0; i < prongs; i++) {
        const a = Math.PI / 4 + (i / prongs) * Math.PI * 2;
        crystal(ctx, Math.cos(a) * 15, Math.sin(a) * 15, 13, 5.5, a, c0);
      }
      energyCore(ctx, 0, -1, 10, c0, 1.6);
      elementIcon(ctx, 'flame', 0, -1, 8 + level * 0.8, c0);
      break;
    }
    case 'fountain': {
      chamferPoly(ctx, 0, 0, 8, 18, 3, Math.PI / 8);
      ctx.fillStyle = metalGradient(ctx, -18, -18, 18, 18, TECH.steel);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.8);
      const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
      g.addColorStop(0, css(lighten(c0, 0.55)));
      g.addColorStop(0.6, css(c0));
      g.addColorStop(1, css(darken(c0, 0.5)));
      circle(ctx, 0, 0, 14);
      ctx.fillStyle = g;
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.4);
      ctx.strokeStyle = css(lighten(c0, 0.7), 0.75);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 5 + i * 3.2, i * 2.1, i * 2.1 + Math.PI * 1.1);
        ctx.stroke();
      }
      crystal(ctx, 0, -2, 15, 6, -Math.PI / 2, lighten(c0, 0.25));
      if (level >= 3) for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        crystal(ctx, Math.cos(a) * 11, Math.sin(a) * 11, 7, 3.5, a, lighten(c0, 0.35), 1);
      }
      break;
    }
    case 'bloom': {
      const blades = 6;
      for (let i = 0; i < blades; i++) {
        const a = (i / blades) * Math.PI * 2 + Math.PI / blades;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(13, -5);
        ctx.lineTo(22, 0);
        ctx.lineTo(13, 5);
        ctx.closePath();
        ctx.fillStyle = metalGradient(ctx, 6, -5, 22, 5, acc);
        ctx.fill();
        strokePath(ctx, TECH.ink, 1.3);
        ctx.restore();
      }
      hub(ctx, 10, body);
      if (def.rotates) crystal(ctx, 15, 0, 18, 6, 0, lighten(c1, 0.2));
      energyCore(ctx, 0, 0, 4.5, c1, 1.7);
      sigils(ctx, def, 0, 0, 3.8, 2.2);
      break;
    }
    case 'prism': {
      const r = 18;
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) pts.push([Math.cos((i / 6) * Math.PI * 2) * r, Math.sin((i / 6) * Math.PI * 2) * r]);
      facets(ctx, -2, -2, pts, body, TECH.ink, 1.8);
      energyCore(ctx, 0, 0, 8, acc, 1.8);
      elementIcon(ctx, 'star', 0, 0, 6 + level * 0.6, c0);
      const n = level >= 3 ? 3 : 0;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
        crystal(ctx, Math.cos(a) * 24, Math.sin(a) * 24, 8, 4, a, lighten(body, 0.2), 1);
      }
      break;
    }
    case 'lantern': {
      ctx.save();
      ctx.rotate(Math.PI / 4);
      chamferRect(ctx, -15, -15, 30, 30, 5);
      ctx.fillStyle = metalGradient(ctx, -15, -15, 15, 15, body);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.9);
      ctx.strokeStyle = css(lighten(body, 0.4), 0.7);
      ctx.lineWidth = 1.2;
      chamferRect(ctx, -10, -10, 20, 20, 3);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        crystal(ctx, Math.cos(a) * 19, Math.sin(a) * 19, 9, 4, a, acc, 1);
      }
      energyCore(ctx, 0, 0, 8.5, acc, 1.8);
      sigils(ctx, def, 0, 0, 5, 2);
      break;
    }
    case 'rock': {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
        pts.push([Math.cos(a) * 19, Math.sin(a) * 19]);
      }
      facets(ctx, -2, -3, pts, body, TECH.ink, 2);
      ctx.strokeStyle = css(acc, 0.95);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, -10);
      ctx.lineTo(-2, -2);
      ctx.lineTo(-8, 7);
      ctx.moveTo(-2, -2);
      ctx.lineTo(9, 1);
      ctx.lineTo(11, 9);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
        chamferRect(ctx, Math.cos(a) * 21 - 4, Math.sin(a) * 21 - 4, 8, 8, 2);
        ctx.fillStyle = metalGradient(ctx, -4, -4, 4, 4, TECH.steelLight);
        ctx.fill();
        strokePath(ctx, TECH.ink, 1.2);
      }
      energyCore(ctx, 0, 0, 5 + level, acc, 1.6);
      elementIcon(ctx, 'hex', 0, 0, 5 + level * 0.6, c0);
      break;
    }
    case 'vent': {
      chamferPoly(ctx, 0, 0, 8, 18, 3, Math.PI / 8);
      ctx.fillStyle = metalGradient(ctx, -18, -18, 18, 18, body);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.8);
      ctx.fillStyle = css(darken(body, 0.6));
      for (let i = -2; i <= 2; i++) ctx.fillRect(-11, i * 4.6 - 1.2, 22, 2.4);
      energyCore(ctx, 0, 0, 9, mixColor(c0, c1, 0.5), 1.4);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        energyCore(ctx, Math.cos(a) * 15, Math.sin(a) * 15, 2.8, i % 2 ? c0 : c1, 1.6);
        rivet(ctx, Math.cos(a) * 15, Math.sin(a) * 15, 1.5);
      }
      sigils(ctx, def, 0, 0, 4.5, 2.2);
      break;
    }
    case 'tree': {
      const leaves = 6;
      for (let i = 0; i < leaves; i++) {
        const a = (i / leaves) * Math.PI * 2 - Math.PI / 2;
        crystal(ctx, Math.cos(a) * 11, Math.sin(a) * 11, 17, 8, a, i % 2 ? body : lighten(body, 0.18));
      }
      if (def.rotates) {
        chamferRect(ctx, 6, -3.5, 22, 7, 2);
        ctx.fillStyle = metalGradient(ctx, 6, -3.5, 28, 3.5, mixColor(body, 0x8a5a2b, 0.6));
        ctx.fill();
        strokePath(ctx, TECH.ink, 1.4);
      }
      hub(ctx, 8, darken(body, 0.25));
      energyCore(ctx, 0, 0, 5, acc, 1.8);
      sigils(ctx, def, 0, 0, 3.6, 2.2);
      break;
    }
    case 'orb': {
      ctx.strokeStyle = css(TECH.steelLight);
      ctx.lineWidth = 3;
      circle(ctx, 0, 0, 16);
      ctx.stroke();
      strokePath(ctx, TECH.ink, 1);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
        chamferRect(ctx, Math.cos(a) * 16 - 3, Math.sin(a) * 16 - 3, 6, 6, 1.5);
        ctx.fillStyle = css(TECH.trim);
        ctx.fill();
        strokePath(ctx, TECH.ink, 1);
      }
      if (def.rotates) {
        chamferRect(ctx, 8, -5, 18, 10, 2.5);
        ctx.fillStyle = metalGradient(ctx, 8, -5, 26, 5, TECH.steel);
        ctx.fill();
        strokePath(ctx, TECH.ink, 1.4);
        energyCore(ctx, 26, 0, 3.5, acc, 1.8);
      }
      if (def.id === 'eclipse') {
        energyCore(ctx, 0, 0, 11, acc, 1.6);
        circle(ctx, 0, 0, 9.5);
        ctx.fillStyle = css(0x120c26);
        ctx.fill();
        strokePath(ctx, lighten(acc, 0.5), 1.2);
      } else {
        energyCore(ctx, 0, 0, 12, acc, 1.7);
      }
      sigils(ctx, def, 0, 21, 3.4, 2.2);
      break;
    }
    case 'mortar': {
      chamferPoly(ctx, 0, 0, 8, 17, 3, Math.PI / 8);
      ctx.fillStyle = metalGradient(ctx, -17, -17, 17, 17, body);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.8);
      chamferRect(ctx, -4, -10, 26, 20, 4);
      ctx.fillStyle = metalGradient(ctx, -4, -10, 22, 10, lighten(body, 0.1));
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.8);
      ctx.beginPath();
      ctx.ellipse(20, 0, 5, 8.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(TECH.ink);
      ctx.fill();
      energyCore(ctx, 20, 0, 4.5, acc, 1.8);
      sigils(ctx, def, -10, 0, 4, 2.1);
      break;
    }
    case 'totem': {
      chamferRect(ctx, -11, -13, 22, 26, 4);
      ctx.fillStyle = metalGradient(ctx, -11, -13, 11, 13, body);
      ctx.fill();
      strokePath(ctx, TECH.ink, 2);
      ctx.strokeStyle = css(acc);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, -7);
      ctx.lineTo(5, -7);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 4);
      ctx.moveTo(-5, 1);
      ctx.lineTo(5, 7);
      ctx.stroke();
      runeRing(ctx, 0, 0, 19, acc, 10, 1.1, 0.8);
      sigils(ctx, def, 0, 17, 3.6, 2.2);
      break;
    }
    case 'flower': {
      const blades = 10;
      for (let i = 0; i < blades; i++) {
        const a = (i / blades) * Math.PI * 2;
        crystal(ctx, Math.cos(a) * 14, Math.sin(a) * 14, 12, 4.5, a, i % 2 ? acc : lighten(acc, 0.2), 1.1);
      }
      hub(ctx, 10, body, 8);
      energyCore(ctx, 0, 0, 6, mixColor(c0, c1, 0.5), 1.6);
      sigils(ctx, def, 0, 0, 3.6, 2.2);
      break;
    }
    case 'crystal': {
      const shards: [number, number, number, number, number][] = [
        [0, -4, 24, 9, -Math.PI / 2],
        [-10, 3, 16, 7, -Math.PI / 2 - 0.55],
        [10, 3, 16, 7, -Math.PI / 2 + 0.55],
        [-5, 9, 12, 6, -Math.PI / 2 - 0.25],
        [6, 10, 11, 6, -Math.PI / 2 + 0.3],
      ];
      energyCore(ctx, 0, 0, 13, acc, 1.6);
      shards.forEach(([x, y, l, w, r], i) => crystal(ctx, x, y, l, w, r, i % 2 ? c1 : lighten(acc, 0.1)));
      sigils(ctx, def, 0, 18, 3.6, 2.2);
      break;
    }
    case 'well': {
      chamferPoly(ctx, 0, 0, 8, 19, 3, Math.PI / 8);
      ctx.fillStyle = metalGradient(ctx, -19, -19, 19, 19, TECH.steel);
      ctx.fill();
      strokePath(ctx, TECH.ink, 2);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
      g.addColorStop(0, css(darken(body, 0.75)));
      g.addColorStop(1, css(body));
      circle(ctx, 0, 0, 14);
      ctx.fillStyle = g;
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.2);
      ctx.strokeStyle = css(acc, 0.9);
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.05) {
          const a = t * Math.PI * 1.6 + (i * Math.PI * 2) / 3;
          const rr = 2 + t * 11;
          if (t === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.stroke();
      }
      energyCore(ctx, 0, 0, 4.5, acc, 1.8);
      sigils(ctx, def, 0, 21, 3.4, 2.2);
      break;
    }
  }

  if (level >= 4) {
    glint(ctx, -12, -14, 5, 0.95);
    glint(ctx, 13, -10, 3.5, 0.8);
  }
  ctx.restore();
}

/** A full composite tower icon (base + head) for the DOM UI. */
export function drawTowerIcon(ctx: Ctx, def: TowerDef, level: number, size: number): void {
  const k = size / TOWER_BASE_SIZE;
  ctx.save();
  ctx.scale(k, k);
  drawTowerBase(ctx, def, level);
  ctx.translate((TOWER_BASE_SIZE - TOWER_HEAD_SIZE) / 2, (TOWER_BASE_SIZE - TOWER_HEAD_SIZE) / 2 - 3);
  if (def.rotates) {
    ctx.translate(TOWER_HEAD_SIZE / 2, TOWER_HEAD_SIZE / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-TOWER_HEAD_SIZE / 2, -TOWER_HEAD_SIZE / 2);
  }
  drawTowerHead(ctx, def, level);
  ctx.restore();
}
