import { css } from '../../core/math';
import type { Ctx } from './paint';
import { chamferPoly, crystal, energyCore, facets, glint, metalGradient, strokePath, TECH } from './tech';

/**
 * PIP — Prismatic Intelligence Protocol: the Commander's tactical AI, a small
 * faceted drone with a single sensor eye. `mood` changes the eye: steady cyan
 * ("happy") or an amber, narrowed "wry" look ("cheeky").
 */
export function drawPip(ctx: Ctx, size: number, mood: 'happy' | 'cheeky' = 'happy'): void {
  const s = size / 100;
  ctx.save();
  ctx.scale(s, s);
  const eye = mood === 'cheeky' ? 0xffb347 : TECH.cyan;
  // holo projection cone + ring
  const g = ctx.createLinearGradient(50, 62, 50, 96);
  g.addColorStop(0, css(eye, 0.35));
  g.addColorStop(1, css(eye, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(42, 64);
  ctx.lineTo(58, 64);
  ctx.lineTo(74, 94);
  ctx.lineTo(26, 94);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(50, 92);
  ctx.scale(1, 0.25);
  ctx.strokeStyle = css(eye, 0.8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // side fins
  for (const side of [-1, 1]) {
    crystal(ctx, 50 + side * 33, 40, 30, 10, side < 0 ? Math.PI + 0.35 : -0.35, 0x7a6bff, 2);
  }
  // faceted body
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    pts.push([50 + Math.cos(a) * 27, 42 + Math.sin(a) * 25]);
  }
  facets(ctx, 44, 36, pts, 0x3b4a72, TECH.ink, 2.6);
  // visor band
  chamferPoly(ctx, 50, 42, 6, 15, 3, 0);
  ctx.fillStyle = metalGradient(ctx, 35, 30, 65, 55, 0x0b1020);
  ctx.fill();
  strokePath(ctx, 0x8fb4ff, 1.4, 0.6);
  // sensor eye
  if (mood === 'cheeky') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(36, 41, 28, 10);
    ctx.clip();
    energyCore(ctx, 50, 42, 8, eye, 1.7);
    ctx.restore();
    ctx.fillStyle = css(eye);
    ctx.fillRect(40, 40, 20, 2.5);
  } else {
    energyCore(ctx, 50, 42, 8, eye, 1.8);
    ctx.beginPath();
    ctx.arc(50, 42, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  // antenna crystal
  ctx.strokeStyle = css(TECH.steelLight);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 17);
  ctx.lineTo(50, 8);
  ctx.stroke();
  crystal(ctx, 50, 6, 10, 5, -Math.PI / 2, 0x9ff3ff, 1.2);
  glint(ctx, 38, 26, 6, 0.9);
  ctx.restore();
}
