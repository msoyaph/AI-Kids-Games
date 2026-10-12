import { css, darken, lighten } from '../../core/math';
import type { BadgeIcon } from '../../data/achievements';
import { ELEMENTS } from '../../data/elements';
import { ballGradient, circle, coinShape, elementIcon, fillStroke, gemShape, glowDot, heartShape, roundRect, shine, starPath, type Ctx } from './paint';
import { chamferPoly, metalGradient, runeRing, strokePath, TECH } from './tech';

/** A hexagonal service insignia with rank chevrons and an icon. Locked badges are dim steel. */
export function drawBadge(ctx: Ctx, size: number, icon: BadgeIcon, color: number, unlocked: boolean): void {
  const s = size / 100;
  ctx.save();
  ctx.scale(s, s);
  const col = unlocked ? color : 0x4a5570;
  // rank chevrons under the plate
  for (let i = 0; i < 2; i++) {
    const y = 80 + i * 9;
    ctx.beginPath();
    ctx.moveTo(30, y - 6);
    ctx.lineTo(50, y + 4);
    ctx.lineTo(70, y - 6);
    ctx.lineTo(70, y);
    ctx.lineTo(50, y + 10);
    ctx.lineTo(30, y);
    ctx.closePath();
    fillStroke(ctx, css(i === 0 ? col : darken(col, 0.25)), TECH.ink, 2);
  }
  if (unlocked) glowDot(ctx, 50, 44, 46, color, 0.35);
  // steel hex plate
  chamferPoly(ctx, 50, 44, 6, 38, 4, Math.PI / 6);
  ctx.fillStyle = metalGradient(ctx, 14, 8, 86, 82, unlocked ? TECH.steel : TECH.steelDark);
  ctx.fill();
  strokePath(ctx, TECH.ink, 3);
  chamferPoly(ctx, 50, 44, 6, 35, 3, Math.PI / 6);
  strokePath(ctx, unlocked ? TECH.gold : TECH.steelLight, 1.4, unlocked ? 0.9 : 0.4);
  // coloured core
  chamferPoly(ctx, 50, 44, 6, 27, 3, Math.PI / 6);
  const g = ctx.createLinearGradient(50, 18, 50, 70);
  g.addColorStop(0, css(lighten(col, 0.25)));
  g.addColorStop(1, css(darken(col, 0.45)));
  ctx.fillStyle = g;
  ctx.fill();
  strokePath(ctx, darken(col, 0.6), 2);
  runeRing(ctx, 50, 44, 31, unlocked ? color : TECH.steelLight, 12, 1.4, unlocked ? 0.9 : 0.35);
  const ic = unlocked ? 0xffffff : 0xb8b4cc;
  switch (icon) {
    case 'star':
      starPath(ctx, 50, 45, 5, 18, 8.5);
      fillStroke(ctx, ballGradient(ctx, 50, 44, 18, unlocked ? 0xfff27a : ic), 0x6a4a00, 2);
      break;
    case 'gem':
      gemShape(ctx, 50, 44, 17, unlocked ? 0x9ff3ff : ic, 2);
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(32, 54);
      ctx.lineTo(32, 34);
      ctx.lineTo(41, 44);
      ctx.lineTo(50, 30);
      ctx.lineTo(59, 44);
      ctx.lineTo(68, 34);
      ctx.lineTo(68, 54);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, 50, 44, 18, unlocked ? 0xffd23f : ic), 0x6a4a00, 2);
      break;
    case 'heart':
      heartShape(ctx, 50, 46, 17, unlocked ? 0xff4f7b : ic);
      break;
    case 'coin':
      coinShape(ctx, 50, 44, 17);
      break;
    case 'tower':
      roundRect(ctx, 39, 30, 22, 28, 4);
      fillStroke(ctx, ballGradient(ctx, 50, 44, 18, ic), 0x3a3456, 2);
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, 37 + i * 9, 25, 7, 7, 1.5);
        fillStroke(ctx, css(ic), 0x3a3456, 1.5);
      }
      break;
    case 'poof':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        starPath(ctx, 50 + Math.cos(a) * 10, 44 + Math.sin(a) * 10, 4, 7, 2.5, 0);
        ctx.fillStyle = css(ic);
        ctx.fill();
      }
      starPath(ctx, 50, 44, 4, 10, 3, 0);
      ctx.fill();
      break;
    case 'clock':
      circle(ctx, 50, 44, 16);
      fillStroke(ctx, css(ic), 0x3a3456, 2.5);
      ctx.strokeStyle = '#3a3456';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(50, 44);
      ctx.lineTo(50, 34);
      ctx.moveTo(50, 44);
      ctx.lineTo(58, 48);
      ctx.stroke();
      break;
    case 'maze':
      ctx.strokeStyle = css(ic);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(34, 32);
      ctx.lineTo(66, 32);
      ctx.lineTo(66, 44);
      ctx.lineTo(36, 44);
      ctx.lineTo(36, 56);
      ctx.lineTo(66, 56);
      ctx.stroke();
      break;
    case 'trophy':
      ctx.beginPath();
      ctx.moveTo(38, 30);
      ctx.lineTo(62, 30);
      ctx.quadraticCurveTo(62, 50, 50, 50);
      ctx.quadraticCurveTo(38, 50, 38, 30);
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, 50, 38, 14, unlocked ? 0xffd23f : ic), 0x6a4a00, 2);
      roundRect(ctx, 46, 49, 8, 6, 1);
      fillStroke(ctx, css(unlocked ? 0xffb21f : ic), 0x6a4a00, 1.5);
      roundRect(ctx, 40, 55, 20, 5, 2);
      fillStroke(ctx, css(unlocked ? 0xffb21f : ic), 0x6a4a00, 1.5);
      break;
    default: {
      const E = ELEMENTS[icon];
      elementIcon(ctx, E.icon, 50, 44, 17, unlocked ? E.light : ic);
    }
  }
  if (unlocked) shine(ctx, 40, 30, 12, 6, 0.6);
  ctx.restore();
}

const cache = new Map<string, string>();

export function badgeUrl(id: string, icon: BadgeIcon, color: number, unlocked: boolean, size = 128): string {
  const key = `${id}:${unlocked}:${size}`;
  let url = cache.get(key);
  if (!url) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    drawBadge(c.getContext('2d')!, size, icon, color, unlocked);
    url = c.toDataURL('image/png');
    cache.set(key, url);
  }
  return url;
}
