import { css, darken, lighten } from '../../core/math';
import type { HeroDef } from '../../data/heroes';
import type { Ctx } from './paint';
import { chamferPoly, chamferRect, crystal, energyCore, facets, glint, metalGradient, rivet, strokePath, TECH } from './tech';

export const HERO_W = 64;
export const HERO_H = 72;

/**
 * A commander in armour, seen from the 3/4 top-down camera and facing right.
 * Helmets have a glowing visor (no faces). Each officer has a distinct
 * silhouette: rifle, seismic hammer, lens staff or engineering drone.
 */
export function drawHero(ctx: Ctx, def: HeroDef, w = HERO_W, h = HERO_H): void {
  const s = w / HERO_W;
  ctx.save();
  ctx.scale(s, (h / HERO_H) * 1);
  const cx = 30;
  const col = def.color;
  const acc = def.accent;
  const lw = 1.8;

  // back gear (drawn first)
  switch (def.weapon) {
    case 'rifle': {
      // short command cape
      ctx.beginPath();
      ctx.moveTo(cx - 10, 30);
      ctx.lineTo(cx - 19, 56);
      ctx.lineTo(cx - 4, 52);
      ctx.closePath();
      ctx.fillStyle = css(darken(col, 0.35));
      ctx.fill();
      strokePath(ctx, TECH.ink, lw);
      break;
    }
    case 'hammer': {
      // heavy back plate
      chamferRect(ctx, cx - 18, 24, 14, 26, 4);
      ctx.fillStyle = metalGradient(ctx, cx - 18, 24, cx - 4, 50, darken(col, 0.2));
      ctx.fill();
      strokePath(ctx, TECH.ink, lw);
      break;
    }
    case 'staff': {
      // hood fins + floating halo
      ctx.beginPath();
      ctx.ellipse(cx, 17, 15, 5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = css(acc, 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();
      for (const sx of [-1, 1]) crystal(ctx, cx + sx * 14, 30, 12, 4, Math.PI / 2 + sx * 0.5, darken(col, 0.1), 1.2);
      break;
    }
    case 'drone': {
      // engineering backpack with antenna
      chamferRect(ctx, cx - 17, 28, 11, 18, 3);
      ctx.fillStyle = metalGradient(ctx, cx - 17, 28, cx - 6, 46, TECH.steel);
      ctx.fill();
      strokePath(ctx, TECH.ink, lw);
      ctx.strokeStyle = css(TECH.ink);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 13, 28);
      ctx.lineTo(cx - 16, 16);
      ctx.stroke();
      energyCore(ctx, cx - 16, 15, 2.2, acc, 2.4);
      break;
    }
  }

  // legs
  for (const sx of [-1, 1]) {
    chamferRect(ctx, cx + sx * 5 - 4, 50, 8, 15, 2);
    ctx.fillStyle = metalGradient(ctx, cx - 9, 50, cx + 9, 65, TECH.steelDark);
    ctx.fill();
    strokePath(ctx, TECH.ink, lw);
  }
  // torso
  const bulky = def.weapon === 'hammer' ? 1.25 : 1;
  chamferRect(ctx, cx - 11 * bulky, 27, 22 * bulky, 26, 6);
  ctx.fillStyle = metalGradient(ctx, cx - 12, 27, cx + 12, 53, col);
  ctx.fill();
  strokePath(ctx, TECH.ink, lw);
  // chest core + trim
  ctx.strokeStyle = css(lighten(col, 0.35), 0.8);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 7 * bulky, 46);
  ctx.lineTo(cx, 50);
  ctx.lineTo(cx + 7 * bulky, 46);
  ctx.stroke();
  energyCore(ctx, cx + 1, 38, 3.2, acc, 2.2);
  // shoulder pads
  for (const sx of [-1, 1]) {
    const px = cx + sx * 12 * bulky;
    chamferPoly(ctx, px, 30, 6, 6.5 * bulky, 1.5, 0);
    ctx.fillStyle = metalGradient(ctx, px - 7, 23, px + 7, 37, lighten(col, 0.12));
    ctx.fill();
    strokePath(ctx, TECH.ink, lw);
    rivet(ctx, px, 30, 1.3);
  }
  // helmet with visor (no face)
  chamferRect(ctx, cx - 8, 11, 17, 16, 5);
  ctx.fillStyle = metalGradient(ctx, cx - 8, 11, cx + 9, 27, def.weapon === 'staff' ? darken(col, 0.15) : TECH.steelLight);
  ctx.fill();
  strokePath(ctx, TECH.ink, lw);
  chamferRect(ctx, cx - 3, 16, 12, 5, 2);
  ctx.fillStyle = css(TECH.ink);
  ctx.fill();
  ctx.fillStyle = css(acc);
  ctx.fillRect(cx - 1, 17.5, 9, 2);
  glint(ctx, cx - 4, 14, 2.2, 0.85);

  // weapon in front
  switch (def.weapon) {
    case 'rifle': {
      chamferRect(ctx, cx + 4, 38, 26, 6, 2);
      ctx.fillStyle = metalGradient(ctx, cx + 4, 38, cx + 30, 44, TECH.steel);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.5);
      ctx.strokeStyle = css(acc, 0.9);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + 8, 41);
      ctx.lineTo(cx + 28, 41);
      ctx.stroke();
      energyCore(ctx, cx + 31, 41, 2, acc, 2.4);
      break;
    }
    case 'hammer': {
      ctx.strokeStyle = css(TECH.ink);
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(cx + 6, 50);
      ctx.lineTo(cx + 20, 22);
      ctx.stroke();
      ctx.strokeStyle = css(TECH.steelLight);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const pts: [number, number][] = [
        [cx + 12, 14],
        [cx + 26, 12],
        [cx + 30, 22],
        [cx + 24, 30],
        [cx + 12, 26],
      ];
      facets(ctx, cx + 18, 16, pts, TECH.steel, TECH.ink, 1.6);
      crystal(ctx, cx + 22, 20, 8, 3, 0, acc, 1);
      break;
    }
    case 'staff': {
      ctx.strokeStyle = css(TECH.ink);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 9, 60);
      ctx.lineTo(cx + 15, 14);
      ctx.stroke();
      ctx.strokeStyle = css(lighten(col, 0.4));
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // lens ring
      ctx.beginPath();
      ctx.arc(cx + 15, 11, 6, 0, Math.PI * 2);
      ctx.strokeStyle = css(TECH.gold);
      ctx.lineWidth = 2;
      ctx.stroke();
      energyCore(ctx, cx + 15, 11, 3.6, acc, 2.4);
      break;
    }
    case 'drone': {
      // hovering hex drone beside the shoulder
      chamferPoly(ctx, cx + 20, 18, 6, 6.5, 1.5, Math.PI / 6);
      ctx.fillStyle = metalGradient(ctx, cx + 14, 12, cx + 26, 24, TECH.steel);
      ctx.fill();
      strokePath(ctx, TECH.ink, 1.4);
      energyCore(ctx, cx + 20, 18, 2.4, acc, 2.4);
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + 20 + sx * 8, 13, 4, 1.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = css(TECH.trim, 0.45);
        ctx.fill();
      }
      // wrench arm
      ctx.strokeStyle = css(TECH.ink);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 6, 42);
      ctx.lineTo(cx + 18, 40);
      ctx.stroke();
      ctx.strokeStyle = css(TECH.steelLight);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
