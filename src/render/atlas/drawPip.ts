import { css } from '../../core/math';
import { ballGradient, circle, cuteFace, ellipse, fillStroke, gemShape, glowDot, shine, starPath, type Ctx } from './paint';

/** Pip, the tiny crystal fox who guides players. Front-facing portrait. */
export function drawPip(ctx: Ctx, size: number, mood: 'happy' | 'cheeky' = 'happy'): void {
  const s = size / 100;
  ctx.save();
  ctx.scale(s, s);
  const fur = 0xff9a5a;
  const out = 0x8a3a1a;
  glowDot(ctx, 50, 56, 48, 0xb48cff, 0.35);
  // tail swish behind
  ctx.beginPath();
  ctx.moveTo(66, 82);
  ctx.quadraticCurveTo(98, 78, 92, 50);
  ctx.quadraticCurveTo(86, 66, 70, 70);
  ctx.closePath();
  fillStroke(ctx, ballGradient(ctx, 84, 66, 18, fur), out, 2.5);
  ctx.beginPath();
  ctx.moveTo(92, 50);
  ctx.quadraticCurveTo(95, 58, 89, 62);
  ctx.quadraticCurveTo(88, 55, 92, 50);
  ctx.fillStyle = '#fff';
  ctx.fill();
  // body
  ellipse(ctx, 50, 82, 22, 15);
  fillStroke(ctx, ballGradient(ctx, 50, 80, 22, fur), out, 2.5);
  ellipse(ctx, 50, 85, 12, 9);
  ctx.fillStyle = '#fff4ea';
  ctx.fill();
  // ears with crystal tips
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(50 + side * 12, 34);
    ctx.lineTo(50 + side * 30, 6);
    ctx.lineTo(50 + side * 34, 40);
    ctx.closePath();
    fillStroke(ctx, ballGradient(ctx, 50 + side * 28, 26, 16, fur), out, 2.5);
    ctx.beginPath();
    ctx.moveTo(50 + side * 26, 14);
    ctx.lineTo(50 + side * 30, 6);
    ctx.lineTo(50 + side * 32, 18);
    ctx.closePath();
    fillStroke(ctx, ballGradient(ctx, 50 + side * 30, 12, 6, 0x9ff3ff), 0x2a6a8a, 1.5);
    ctx.beginPath();
    ctx.moveTo(50 + side * 17, 34);
    ctx.lineTo(50 + side * 28, 15);
    ctx.lineTo(50 + side * 30, 36);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,200,220,0.85)';
    ctx.fill();
  }
  // head
  ctx.beginPath();
  ctx.moveTo(18, 46);
  ctx.quadraticCurveTo(18, 22, 50, 22);
  ctx.quadraticCurveTo(82, 22, 82, 46);
  ctx.quadraticCurveTo(80, 66, 50, 72);
  ctx.quadraticCurveTo(20, 66, 18, 46);
  ctx.closePath();
  fillStroke(ctx, ballGradient(ctx, 50, 44, 34, fur), out, 2.5);
  // white muzzle
  ctx.beginPath();
  ctx.moveTo(30, 54);
  ctx.quadraticCurveTo(50, 46, 70, 54);
  ctx.quadraticCurveTo(64, 70, 50, 71);
  ctx.quadraticCurveTo(36, 70, 30, 54);
  ctx.fillStyle = '#fff4ea';
  ctx.fill();
  shine(ctx, 36, 32, 10, 5, 0.5);
  cuteFace(ctx, 50, 44, { eyeR: 6.5, spread: 12, mood, pupil: 0.62 });
  // nose
  ellipse(ctx, 50, 53, 3.5, 2.6);
  ctx.fillStyle = '#3a1a2a';
  ctx.fill();
  // forehead gem
  gemShape(ctx, 50, 30, 6, 0x9b8bff, 1.2);
  starPath(ctx, 74, 24, 4, 5, 1.6, 0);
  ctx.fillStyle = css(0xffffff);
  ctx.fill();
  circle(ctx, 24, 70, 1.8);
  ctx.fill();
  ctx.restore();
}
