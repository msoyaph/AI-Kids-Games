import type { AlienLook, CharacterDef, HumanLook } from '../../data/characters';
import type { AstronautLook } from '../../data/types';
import { circle, cuteFace, ellipse, glowDot, ink, linear, poly, radial, roundRect, softStar, type Ctx } from '../canvas';
void cuteFace;
import { C, rgba, shade } from '../palette';

export type Mood = 'happy' | 'wow' | 'think' | 'sleepy';

// ------------------------------------------------------------------ Tuggy & robots

export function drawTuggy(ctx: Ctx, w: number, h: number, mood: Mood = 'happy'): void {
  const cx = w / 2;
  const cy = h / 2 + 4;
  const s = Math.min(w, h) / 110;
  // Little jets.
  for (const sx of [-1, 1]) {
    ink(ctx, roundRect(cx + sx * 40 * s - 9 * s, cy - 6 * s, 18 * s, 26 * s, 7 * s), C.steel, 3 * s);
    glowDot(ctx, cx + sx * 40 * s, cy + 26 * s, 9 * s, C.cyan);
  }
  // Propeller.
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 34 * s);
  ctx.lineTo(cx, cy - 44 * s);
  ctx.stroke();
  ink(ctx, ellipse(cx, cy - 46 * s, 26 * s, 6 * s), C.red, 3 * s);
  ink(ctx, circle(cx, cy - 46 * s, 5 * s), C.yellow, 2.5 * s);
  // Body.
  const body = roundRect(cx - 34 * s, cy - 36 * s, 68 * s, 64 * s, 26 * s);
  ink(ctx, body, radial(ctx, cx - 14 * s, cy - 22 * s, 4 * s, 60 * s, [[0, '#fff3b0'], [0.6, C.yellow], [1, C.orange]]), 4 * s);
  // Face screen.
  ink(ctx, roundRect(cx - 24 * s, cy - 24 * s, 48 * s, 32 * s, 13 * s), C.ink, 0);
  ctx.fillStyle = C.cyan;
  if (mood === 'wow') {
    ctx.fill(circle(cx - 10 * s, cy - 9 * s, 6 * s));
    ctx.fill(circle(cx + 10 * s, cy - 9 * s, 6 * s));
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = C.cyan;
      ctx.lineCap = 'round';
      ctx.arc(cx + sx * 10 * s, cy - 6 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  ctx.fillStyle = rgba(C.pink, 0.8);
  ctx.fill(ellipse(cx - 19 * s, cy + 2 * s, 4 * s, 2.5 * s));
  ctx.fill(ellipse(cx + 19 * s, cy + 2 * s, 4 * s, 2.5 * s));
  // Hook arm.
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 28 * s);
  ctx.lineTo(cx, cy + 38 * s);
  ctx.stroke();
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.arc(cx + 5 * s, cy + 44 * s, 6 * s, Math.PI, Math.PI * 2.6);
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.fill(ellipse(cx - 18 * s, cy - 30 * s, 9 * s, 4 * s, -0.4));
}

function drawRobotHead(ctx: Ctx, cx: number, cy: number, s: number, color: string, mood: Mood, chef: boolean): void {
  // Antenna
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 40 * s);
  ctx.lineTo(cx, cy - 56 * s);
  ctx.stroke();
  glowDot(ctx, cx, cy - 58 * s, 10 * s, C.red);
  ink(ctx, circle(cx, cy - 58 * s, 5 * s), C.red, 2.5 * s);
  for (const sx of [-1, 1]) ink(ctx, roundRect(cx + sx * 46 * s - 7 * s, cy - 12 * s, 14 * s, 26 * s, 6 * s), shade(color, -0.2), 3 * s);
  ink(ctx, roundRect(cx - 44 * s, cy - 42 * s, 88 * s, 76 * s, 24 * s), radial(ctx, cx - 18 * s, cy - 28 * s, 4 * s, 80 * s, [[0, shade(color, 0.4)], [0.6, color], [1, shade(color, -0.3)]]), 4 * s);
  ink(ctx, roundRect(cx - 32 * s, cy - 28 * s, 64 * s, 44 * s, 14 * s), C.ink, 0);
  ctx.save();
  ctx.translate(cx, cy - 6 * s);
  ctx.fillStyle = C.lime;
  ctx.strokeStyle = C.lime;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * s;
  if (mood === 'wow') {
    ctx.fill(circle(-13 * s, -4 * s, 7 * s));
    ctx.fill(circle(13 * s, -4 * s, 7 * s));
    ctx.beginPath();
    ctx.arc(0, 11 * s, 4 * s, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mood === 'think') {
    ctx.fill(circle(-13 * s, -4 * s, 5 * s));
    ctx.fill(circle(13 * s, -6 * s, 5 * s));
    ctx.beginPath();
    ctx.moveTo(-8 * s, 11 * s);
    ctx.lineTo(8 * s, 9 * s);
    ctx.stroke();
  } else {
    ctx.fill(ellipse(-13 * s, -4 * s, 5 * s, 7 * s));
    ctx.fill(ellipse(13 * s, -4 * s, 5 * s, 7 * s));
    ctx.beginPath();
    ctx.arc(0, 4 * s, 10 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  // Bolts.
  for (const sx of [-1, 1]) ink(ctx, circle(cx + sx * 34 * s, cy + 24 * s, 3.5 * s), C.steel, 2 * s);
  if (chef) {
    ink(ctx, roundRect(cx - 26 * s, cy - 56 * s, 52 * s, 18 * s, 4 * s), C.white, 3 * s);
    ink(ctx, circle(cx - 18 * s, cy - 62 * s, 13 * s), C.white, 3 * s);
    ink(ctx, circle(cx + 18 * s, cy - 62 * s, 13 * s), C.white, 3 * s);
    ink(ctx, circle(cx, cy - 70 * s, 16 * s), C.white, 3 * s);
  }
}

// ------------------------------------------------------------------ Humans

function drawHairBack(ctx: Ctx, look: HumanLook, cx: number, cy: number, r: number): void {
  const hair = look.hair;
  switch (look.hairStyle) {
    case 'long':
      ink(ctx, roundRect(cx - r * 1.05, cy - r * 0.6, r * 2.1, r * 1.9, r * 0.8), hair, 3);
      break;
    case 'pony':
      ink(ctx, ellipse(cx + r * 1.0, cy + r * 0.2, r * 0.32, r * 0.75, -0.3), hair, 3);
      break;
    case 'bob':
      ink(ctx, roundRect(cx - r * 1.1, cy - r * 0.7, r * 2.2, r * 1.65, r * 0.75), hair, 3);
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.9 + (i / 8) * Math.PI * 1.2;
        ink(ctx, circle(cx + Math.cos(a) * r * 0.98, cy - r * 0.1 + Math.sin(a) * r * 0.95, r * 0.36), hair, 3);
      }
      break;
    case 'puff':
      for (const sx of [-1, 1]) ink(ctx, circle(cx + sx * r * 0.95, cy - r * 0.2, r * 0.45), hair, 3);
      break;
    default:
      break;
  }
}

function drawHairFront(ctx: Ctx, look: HumanLook, cx: number, cy: number, r: number): void {
  const hair = look.hair;
  switch (look.hairStyle) {
    case 'bun':
      ink(ctx, circle(cx, cy - r * 1.12, r * 0.38), hair, 3);
      ink(ctx, poly([cx - r * 0.95, cy - r * 0.1, cx - r * 0.85, cy - r * 0.75, cx - r * 0.3, cy - r * 1.0, cx + r * 0.4, cy - r * 1.0, cx + r * 0.9, cy - r * 0.7, cx + r * 0.95, cy - r * 0.1, cx + r * 0.5, cy - r * 0.55, cx - r * 0.5, cy - r * 0.55]), hair, 3);
      break;
    case 'short':
      ink(ctx, poly([cx - r * 0.98, cy - r * 0.05, cx - r * 0.9, cy - r * 0.75, cx - r * 0.2, cy - r * 1.05, cx + r * 0.6, cy - r * 0.95, cx + r * 0.98, cy - r * 0.4, cx + r * 0.95, cy - r * 0.1, cx + r * 0.6, cy - r * 0.55, cx, cy - r * 0.45, cx - r * 0.55, cy - r * 0.6]), hair, 3);
      break;
    case 'spiky':
      ink(ctx, poly([cx - r, cy - r * 0.2, cx - r * 0.95, cy - r * 0.95, cx - r * 0.6, cy - r * 0.8, cx - r * 0.4, cy - r * 1.3, cx - r * 0.05, cy - r * 0.95, cx + r * 0.25, cy - r * 1.35, cx + r * 0.45, cy - r * 0.9, cx + r * 0.85, cy - r * 1.1, cx + r * 0.95, cy - r * 0.25, cx + r * 0.5, cy - r * 0.55, cx - r * 0.5, cy - r * 0.55]), hair, 3);
      break;
    case 'curly':
      for (let i = 0; i < 6; i++) ink(ctx, circle(cx - r * 0.7 + i * r * 0.28, cy - r * 0.78 + Math.sin(i) * r * 0.06, r * 0.27), hair, 2.5);
      break;
    case 'puff':
      ink(ctx, ellipse(cx, cy - r * 0.85, r * 0.85, r * 0.35), hair, 3);
      break;
    case 'long':
    case 'bob':
    case 'pony':
      ink(ctx, poly([cx - r * 0.98, cy, cx - r * 0.85, cy - r * 0.8, cx - r * 0.1, cy - r * 1.05, cx + r * 0.7, cy - r * 0.9, cx + r, cy - r * 0.2, cx + r * 0.55, cy - r * 0.6, cx + r * 0.1, cy - r * 0.5, cx - r * 0.3, cy - r * 0.62, cx - r * 0.7, cy - r * 0.45]), hair, 3);
      break;
    case 'bald':
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ctx.fill(ellipse(cx - r * 0.3, cy - r * 0.7, r * 0.25, r * 0.12, -0.4));
      break;
  }
}

export function drawHumanBust(ctx: Ctx, look: HumanLook, cx: number, cy: number, r: number, mood: Mood): void {
  // Shoulders.
  const sh = new Path2D();
  sh.moveTo(cx - r * 1.5, cy + r * 2.2);
  sh.quadraticCurveTo(cx - r * 1.45, cy + r * 1.05, cx, cy + r * 1.0);
  sh.quadraticCurveTo(cx + r * 1.45, cy + r * 1.05, cx + r * 1.5, cy + r * 2.2);
  sh.closePath();
  ink(ctx, sh, linear(ctx, cx - r, 0, cx + r, 0, [[0, shade(look.outfit, 0.15)], [1, shade(look.outfit, -0.2)]]), 3);
  ink(ctx, poly([cx - r * 0.35, cy + r * 1.0, cx, cy + r * 1.45, cx + r * 0.35, cy + r * 1.0]), C.white, 2.5);
  if (look.accessory === 'star') ink(ctx, softStar(cx - r * 0.8, cy + r * 1.5, 5, r * 0.24, r * 0.11), C.yellow, 2);
  if (look.accessory === 'bowtie') {
    ink(ctx, poly([cx, cy + r * 1.15, cx - r * 0.35, cy + r * 0.95, cx - r * 0.35, cy + r * 1.35]), C.red, 2.5);
    ink(ctx, poly([cx, cy + r * 1.15, cx + r * 0.35, cy + r * 0.95, cx + r * 0.35, cy + r * 1.35]), C.red, 2.5);
  }
  ink(ctx, roundRect(cx - r * 0.28, cy + r * 0.6, r * 0.56, r * 0.5, r * 0.15), shade(look.skin, -0.1), 2.5);
  drawHairBack(ctx, look, cx, cy, r);
  // Ears.
  for (const sx of [-1, 1]) ink(ctx, circle(cx + sx * r * 0.98, cy + r * 0.05, r * 0.2), look.skin, 2.5);
  ink(ctx, circle(cx, cy, r), radial(ctx, cx - r * 0.3, cy - r * 0.35, r * 0.1, r * 1.1, [[0, shade(look.skin, 0.15)], [1, shade(look.skin, -0.12)]]), 3);
  if (look.accessory === 'beard') {
    const b = new Path2D();
    b.moveTo(cx - r * 0.95, cy + r * 0.05);
    b.quadraticCurveTo(cx - r * 0.85, cy + r * 1.15, cx, cy + r * 1.25);
    b.quadraticCurveTo(cx + r * 0.85, cy + r * 1.15, cx + r * 0.95, cy + r * 0.05);
    b.quadraticCurveTo(cx, cy + r * 0.55, cx - r * 0.95, cy + r * 0.05);
    ink(ctx, b, look.hair, 3);
  }
  cuteFace(ctx, cx, cy + r * 0.12, r * 0.62, { mood, blush: C.pink });
  if (look.accessory === 'mustache') {
    ink(ctx, ellipse(cx - r * 0.2, cy + r * 0.3, r * 0.22, r * 0.09, 0.2), look.hair, 2);
    ink(ctx, ellipse(cx + r * 0.2, cy + r * 0.3, r * 0.22, r * 0.09, -0.2), look.hair, 2);
  }
  drawHairFront(ctx, look, cx, cy, r);
  if (look.accessory === 'cap') {
    ink(ctx, ellipse(cx + r * 0.35, cy - r * 0.62, r * 0.75, r * 0.16, -0.1), shade(look.outfit, -0.1), 2.5);
    const cap = new Path2D();
    cap.moveTo(cx - r * 0.85, cy - r * 0.55);
    cap.quadraticCurveTo(cx - r * 0.75, cy - r * 1.2, cx, cy - r * 1.15);
    cap.quadraticCurveTo(cx + r * 0.75, cy - r * 1.2, cx + r * 0.85, cy - r * 0.55);
    cap.closePath();
    ink(ctx, cap, look.outfit, 3);
  }
  if (look.accessory === 'glasses') {
    ctx.lineWidth = r * 0.07;
    ctx.strokeStyle = C.ink;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = rgba('#ffffff', 0.25);
      ctx.fill(circle(cx + sx * r * 0.24, cy + r * 0.05, r * 0.22));
      ctx.stroke(circle(cx + sx * r * 0.24, cy + r * 0.05, r * 0.22));
    }
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.03, cy + r * 0.03);
    ctx.lineTo(cx + r * 0.03, cy + r * 0.03);
    ctx.stroke();
  }
  if (look.accessory === 'goggles') {
    ink(ctx, roundRect(cx - r * 0.95, cy - r * 0.75, r * 1.9, r * 0.22, r * 0.1), C.brown, 2);
    for (const sx of [-1, 1]) ink(ctx, circle(cx + sx * r * 0.32, cy - r * 0.66, r * 0.2), radial(ctx, cx + sx * r * 0.32, cy - r * 0.7, 1, r * 0.2, [[0, '#e9fdff'], [1, C.cyan]]), 2.5);
  }
  if (look.accessory === 'headset') {
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ink(ctx, roundRect(cx - r * 1.2, cy - r * 0.2, r * 0.3, r * 0.5, r * 0.1), C.dark, 2);
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.05, cy + r * 0.25);
    ctx.quadraticCurveTo(cx - r * 0.9, cy + r * 0.7, cx - r * 0.4, cy + r * 0.65);
    ctx.stroke();
    ink(ctx, circle(cx - r * 0.38, cy + r * 0.65, r * 0.08), C.red, 1.5);
  }
}

// ------------------------------------------------------------------ Aliens

export function drawAlienBody(ctx: Ctx, look: AlienLook, cx: number, cy: number, r: number, mood: Mood, elder = false): void {
  const tall = elder ? 1.35 : 1;
  // Antennae.
  for (const sx of [-1, 1]) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + sx * r * 0.35, cy - r * 0.7 * tall);
    ctx.quadraticCurveTo(cx + sx * r * 0.45, cy - r * 1.25 * tall, cx + sx * r * 0.75, cy - r * 1.45 * tall);
    ctx.stroke();
    ctx.strokeStyle = shade(look.body, -0.1);
    ctx.lineWidth = r * 0.05;
    ctx.stroke();
    glowDot(ctx, cx + sx * r * 0.75, cy - r * 1.45 * tall, r * 0.32, look.antenna);
    ink(ctx, circle(cx + sx * r * 0.75, cy - r * 1.45 * tall, r * 0.13), look.antenna, r * 0.05);
  }
  if (look.extra === 'crown') {
    ctx.save();
    ctx.shadowColor = '#fff7b3';
    ctx.shadowBlur = r * 0.4;
    for (let i = -2; i <= 2; i++) ink(ctx, softStar(cx + i * r * 0.3, cy - r * 1.05 * tall - Math.abs(i) * -r * 0.08, 5, r * 0.16, r * 0.08), '#fff7b3', r * 0.04);
    ctx.restore();
  }
  // Body blob.
  const body = new Path2D();
  body.moveTo(cx - r, cy + r * 0.2);
  body.bezierCurveTo(cx - r * 1.05, cy - r * 0.9 * tall, cx + r * 1.05, cy - r * 0.9 * tall, cx + r, cy + r * 0.2);
  body.bezierCurveTo(cx + r * 1.05, cy + r * 1.05, cx - r * 1.05, cy + r * 1.05, cx - r, cy + r * 0.2);
  ink(ctx, body, radial(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.1, r * 1.3, [[0, shade(look.body, 0.35)], [0.6, look.body], [1, shade(look.body, -0.25)]]), r * 0.06);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = look.belly;
  ctx.fill(ellipse(cx, cy + r * 0.75, r * 0.6, r * 0.45));
  ctx.restore();
  // Eyes.
  const ey = cy - r * 0.15 * tall;
  const eyes: Array<[number, number, number]> =
    look.eyes === 1 ? [[0, ey, 0.32]] : look.eyes === 2 ? [[-0.32, ey, 0.22], [0.32, ey, 0.22]] : [[-0.4, ey + r * 0.05, 0.19], [0.4, ey + r * 0.05, 0.19], [0, ey - r * 0.22, 0.2]];
  for (const [ex, eyy, er] of eyes) {
    if (mood === 'sleepy') {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.arc(cx + ex * r, eyy, er * r * 0.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      continue;
    }
    ink(ctx, circle(cx + ex * r, eyy, er * r), C.white, r * 0.045);
    ctx.fillStyle = C.ink;
    const pr = er * r * (mood === 'wow' ? 0.4 : 0.55);
    ctx.fill(circle(cx + ex * r + er * r * 0.12, eyy + er * r * 0.1, pr));
    ctx.fillStyle = '#ffffff';
    ctx.fill(circle(cx + ex * r - er * r * 0.05, eyy - er * r * 0.15, pr * 0.4));
  }
  // Mouth.
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const my = cy + r * 0.35;
  if (mood === 'wow') {
    ctx.fillStyle = C.ink;
    ctx.fill(ellipse(cx, my, r * 0.1, r * 0.13));
  } else if (mood === 'think') {
    ctx.moveTo(cx - r * 0.15, my);
    ctx.lineTo(cx + r * 0.15, my - r * 0.04);
    ctx.stroke();
  } else {
    ctx.arc(cx, my - r * 0.12, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(C.pink, 0.6);
  ctx.fill(ellipse(cx - r * 0.6, cy + r * 0.25, r * 0.13, r * 0.08));
  ctx.fill(ellipse(cx + r * 0.6, cy + r * 0.25, r * 0.13, r * 0.08));
  if (look.extra === 'scarf') {
    ink(ctx, roundRect(cx - r * 0.85, cy + r * 0.48, r * 1.7, r * 0.26, r * 0.12), C.orange, r * 0.05);
    ink(ctx, roundRect(cx + r * 0.35, cy + r * 0.55, r * 0.26, r * 0.55, r * 0.1), C.orange, r * 0.05);
  }
  if (look.extra === 'bow') {
    ink(ctx, poly([cx + r * 0.5, cy - r * 0.65, cx + r * 0.2, cy - r * 0.85, cx + r * 0.2, cy - r * 0.45]), C.yellow, r * 0.04);
    ink(ctx, poly([cx + r * 0.5, cy - r * 0.65, cx + r * 0.8, cy - r * 0.85, cx + r * 0.8, cy - r * 0.45]), C.yellow, r * 0.04);
  }
  if (look.extra === 'leaf') {
    const p = new Path2D();
    p.moveTo(cx, cy - r * 0.75);
    p.quadraticCurveTo(cx - r * 0.45, cy - r * 1.05, cx - r * 0.1, cy - r * 1.3);
    p.quadraticCurveTo(cx + r * 0.25, cy - r * 1.0, cx, cy - r * 0.75);
    ink(ctx, p, C.green, r * 0.04);
  }
}

// ------------------------------------------------------------------ Player astronaut

export const SKIN_TONES = ['#f5d0b5', '#e8b48f', '#c68a5e', '#a8714e', '#8d5a3b', '#5e3a24'];
export const SUIT_COLORS = ['#f4f7ff', '#ff5d73', '#ff9f43', '#ffe066', '#2ed47a', '#4dd4ff', '#4c7dff', '#9b6bff', '#ff7ad9', '#4a4e6e'];
export const HAIR_COLORS = ['#2b1a12', '#5a3825', '#a8662f', '#e8c36a', '#d9572b', '#1a1a2e', '#9b6bff', '#ff7ad9', '#4dd4ff'];
export const HELMETS = ['round', 'visor', 'ears', 'antenna', 'star', 'fin'] as const;
export const FACES = ['smile', 'grin', 'wow', 'wink', 'cool'] as const;
export const HAIR_STYLES = ['short', 'curly', 'long', 'bun', 'spiky', 'bob', 'puff', 'bald'] as const;

function drawPlayerFace(ctx: Ctx, cx: number, cy: number, s: number, face: string): void {
  const eye = C.ink;
  ctx.fillStyle = eye;
  ctx.strokeStyle = eye;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.08;
  const ex = s * 0.36;
  if (face === 'cool') {
    ink(ctx, roundRect(cx - s * 0.7, cy - s * 0.32, s * 1.4, s * 0.32, s * 0.12), C.ink, 0);
    ctx.fillStyle = rgba('#ffffff', 0.5);
    ctx.fillRect(cx - s * 0.55, cy - s * 0.26, s * 0.25, s * 0.06);
  } else {
    for (const sx of [-1, 1]) {
      if (face === 'wink' && sx === 1) {
        ctx.beginPath();
        ctx.arc(cx + sx * ex, cy - s * 0.12, s * 0.12, 1.1 * Math.PI, 1.9 * Math.PI);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = eye;
      ctx.fill(ellipse(cx + sx * ex, cy - s * 0.12, s * 0.12, s * (face === 'wow' ? 0.18 : 0.15)));
      ctx.fillStyle = '#ffffff';
      ctx.fill(circle(cx + sx * ex - s * 0.04, cy - s * 0.18, s * 0.045));
    }
  }
  ctx.fillStyle = rgba(C.pink, 0.55);
  ctx.fill(ellipse(cx - s * 0.6, cy + s * 0.12, s * 0.12, s * 0.07));
  ctx.fill(ellipse(cx + s * 0.6, cy + s * 0.12, s * 0.12, s * 0.07));
  ctx.beginPath();
  if (face === 'wow') {
    ctx.fillStyle = eye;
    ctx.fill(ellipse(cx, cy + s * 0.25, s * 0.1, s * 0.12));
  } else if (face === 'grin') {
    const p = new Path2D();
    p.moveTo(cx - s * 0.28, cy + s * 0.12);
    p.quadraticCurveTo(cx, cy + s * 0.55, cx + s * 0.28, cy + s * 0.12);
    p.closePath();
    ink(ctx, p, '#ffffff', s * 0.07);
  } else {
    ctx.arc(cx, cy + s * 0.05, s * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

function helmetExtras(ctx: Ctx, helmet: string, cx: number, cy: number, r: number, accent: string): void {
  switch (helmet) {
    case 'ears':
      for (const sx of [-1, 1]) ink(ctx, poly([cx + sx * r * 0.45, cy - r * 0.8, cx + sx * r * 0.85, cy - r * 1.25, cx + sx * r * 0.95, cy - r * 0.45]), accent, 3);
      break;
    case 'antenna':
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.3, cy - r * 0.9);
      ctx.lineTo(cx + r * 0.5, cy - r * 1.35);
      ctx.stroke();
      glowDot(ctx, cx + r * 0.5, cy - r * 1.38, r * 0.25, accent);
      ink(ctx, circle(cx + r * 0.5, cy - r * 1.38, r * 0.11), accent, 2);
      break;
    case 'star':
      ink(ctx, softStar(cx, cy - r * 1.02, 5, r * 0.32, r * 0.15), C.yellow, 2.5);
      break;
    case 'fin':
      ink(ctx, poly([cx - r * 0.2, cy - r * 0.95, cx + r * 0.1, cy - r * 1.4, cx + r * 0.5, cy - r * 0.85]), accent, 3);
      break;
    default:
      break;
  }
}

/** Front-facing astronaut bust for dialogue and the creator. */
export function drawAstronautBust(ctx: Ctx, look: AstronautLook, cx: number, cy: number, r: number): void {
  const sh = new Path2D();
  sh.moveTo(cx - r * 1.55, cy + r * 2.2);
  sh.quadraticCurveTo(cx - r * 1.5, cy + r * 0.95, cx, cy + r * 0.9);
  sh.quadraticCurveTo(cx + r * 1.5, cy + r * 0.95, cx + r * 1.55, cy + r * 2.2);
  sh.closePath();
  ink(ctx, sh, linear(ctx, cx - r, 0, cx + r, 0, [[0, shade(look.suit, 0.15)], [1, shade(look.suit, -0.2)]]), 3);
  ink(ctx, roundRect(cx - r * 0.5, cy + r * 1.25, r, r * 0.55, r * 0.12), look.accent, 2.5);
  ctx.fillStyle = C.lime;
  ctx.fill(circle(cx - r * 0.25, cy + r * 1.5, r * 0.09));
  ctx.fillStyle = C.red;
  ctx.fill(circle(cx + r * 0.05, cy + r * 1.5, r * 0.09));
  if (look.outfit === 'scarf') ink(ctx, roundRect(cx - r * 0.9, cy + r * 0.8, r * 1.8, r * 0.3, r * 0.14), C.red, 2.5);
  if (look.outfit === 'cape') {
    ink(ctx, poly([cx - r * 1.3, cy + r * 1.0, cx - r * 0.6, cy + r * 0.85, cx - r * 1.4, cy + r * 2.2]), C.red, 2.5);
    ink(ctx, poly([cx + r * 1.3, cy + r * 1.0, cx + r * 0.6, cy + r * 0.85, cx + r * 1.4, cy + r * 2.2]), C.red, 2.5);
  }
  // Helmet shell.
  helmetExtras(ctx, look.helmet, cx, cy, r, look.accent);
  ink(ctx, circle(cx, cy, r * 1.05), radial(ctx, cx - r * 0.3, cy - r * 0.4, r * 0.1, r * 1.2, [[0, '#ffffff'], [0.7, look.suit === '#f4f7ff' ? C.steel : shade(look.suit, 0.45)], [1, shade(look.suit, -0.1)]]), 3.5);
  // Visor with face.
  const visor = roundRect(cx - r * 0.78, cy - r * 0.62, r * 1.56, r * 1.3, r * 0.58);
  ink(ctx, visor, rgba('#0d1b3d', 0.9), 3);
  ctx.save();
  ctx.clip(visor);
  const face = look.skin;
  drawHairBack(ctx, { skin: face, hair: look.hair, hairStyle: look.hairStyle as HumanLook['hairStyle'], outfit: look.suit }, cx, cy + r * 0.12, r * 0.62);
  ink(ctx, circle(cx, cy + r * 0.12, r * 0.62), face, 2.5);
  drawPlayerFace(ctx, cx, cy + r * 0.2, r * 0.42, look.face);
  drawHairFront(ctx, { skin: face, hair: look.hair, hairStyle: look.hairStyle as HumanLook['hairStyle'], outfit: look.suit }, cx, cy + r * 0.12, r * 0.62);
  ctx.fillStyle = rgba('#a8e8ff', 0.18);
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = rgba('#ffffff', 0.55);
  ctx.fill(ellipse(cx - r * 0.42, cy - r * 0.35, r * 0.24, r * 0.1, -0.6));
  ctx.restore();
  if (look.helmet === 'visor') ink(ctx, roundRect(cx - r * 0.9, cy - r * 0.78, r * 1.8, r * 0.22, r * 0.1), look.accent, 2.5);
}

export type AstroPose = 'idle' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'jump' | 'fall' | 'push';
export const ASTRO_POSES: AstroPose[] = ['idle', 'walk0', 'walk1', 'walk2', 'walk3', 'jump', 'fall', 'push'];

/** Side view (facing right) explorer for the platformer. Box is 72 x 88, feet at bottom. */
export function drawAstronautSide(ctx: Ctx, look: AstronautLook, pose: AstroPose, w: number, h: number): void {
  const cx = w / 2;
  const foot = h - 3;
  const suit = look.suit;
  const dark = shade(suit, -0.25);
  let legA = 0;
  let legB = 0;
  let arm = 0;
  let bob = 0;
  switch (pose) {
    case 'walk0': legA = 0.5; legB = -0.5; arm = -0.5; break;
    case 'walk1': legA = 0.15; legB = -0.15; arm = -0.15; bob = -2; break;
    case 'walk2': legA = -0.5; legB = 0.5; arm = 0.5; break;
    case 'walk3': legA = -0.15; legB = 0.15; arm = 0.15; bob = -2; break;
    case 'jump': legA = -0.7; legB = 0.3; arm = -1.4; break;
    case 'fall': legA = 0.35; legB = -0.35; arm = -0.9; break;
    case 'push': legA = -0.6; legB = 0.4; arm = -1.55; break;
    default: break;
  }
  const hipY = foot - 22 + bob;
  const leg = (ang: number, color: string) => {
    ctx.save();
    ctx.translate(cx - 2, hipY);
    ctx.rotate(ang);
    ink(ctx, roundRect(-7, -2, 14, 22, 6), color, 3);
    ink(ctx, roundRect(-8, 15, 18, 9, 4), C.dark, 3);
    ctx.restore();
  };
  // Cape behind.
  if (look.outfit === 'cape') ink(ctx, poly([cx - 6, hipY - 30, cx - 26, hipY + 10 + bob, cx - 6, hipY + 4]), C.red, 3);
  leg(legB, dark);
  // Backpack.
  ink(ctx, roundRect(cx - 26, hipY - 36, 16, 30, 6), look.outfit === 'jetpack' ? C.orange : C.steel, 3);
  if (look.outfit === 'jetpack') ink(ctx, roundRect(cx - 24, hipY - 8, 12, 8, 3), C.dark, 2);
  // Back arm.
  ctx.save();
  ctx.translate(cx - 2, hipY - 30);
  ctx.rotate(-arm * 0.8);
  ink(ctx, roundRect(-5, 0, 11, 20, 5), dark, 3);
  ctx.restore();
  // Body.
  ink(ctx, roundRect(cx - 14, hipY - 36, 28, 38, 11), linear(ctx, cx - 14, 0, cx + 14, 0, [[0, shade(suit, 0.15)], [1, shade(suit, -0.15)]]), 3);
  ctx.fillStyle = look.accent;
  ctx.fillRect(cx - 12, hipY - 14, 24, 5);
  ink(ctx, roundRect(cx + 1, hipY - 30, 10, 9, 3), look.accent, 2);
  if (look.outfit === 'scarf') ink(ctx, roundRect(cx - 14, hipY - 38, 28, 8, 4), C.red, 2.5);
  leg(legA, suit);
  // Front arm.
  ctx.save();
  ctx.translate(cx + 4, hipY - 30);
  ctx.rotate(arm);
  ink(ctx, roundRect(-5, 0, 11, 20, 5), suit, 3);
  ink(ctx, circle(0.5, 21, 5.5), look.accent, 2.5);
  ctx.restore();
  // Helmet.
  const hy = hipY - 52;
  const hr = 20;
  helmetExtras(ctx, look.helmet, cx + 2, hy, hr, look.accent);
  ink(ctx, circle(cx + 2, hy, hr), radial(ctx, cx - 4, hy - 8, 2, hr * 1.3, [[0, '#ffffff'], [0.7, suit === '#f4f7ff' ? C.steel : shade(suit, 0.45)], [1, shade(suit, -0.1)]]), 3);
  const visor = roundRect(cx - 3, hy - 11, 22, 21, 9);
  ink(ctx, visor, rgba('#0d1b3d', 0.92), 2.5);
  ctx.save();
  ctx.clip(visor);
  ink(ctx, circle(cx + 9, hy + 1, 10), look.skin, 0);
  ctx.fillStyle = C.ink;
  if (look.face === 'cool') ctx.fillRect(cx + 7, hy - 3, 11, 4);
  else ctx.fill(ellipse(cx + 13, hy - 1, 2.2, 3));
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.arc(cx + 12, hy + 3, 4, 0.1 * Math.PI, 0.6 * Math.PI);
  ctx.stroke();
  if (look.hairStyle !== 'bald') {
    ctx.fillStyle = look.hair;
    ctx.fill(ellipse(cx + 6, hy - 9, 10, 5, -0.2));
  }
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fill(ellipse(cx + 3, hy - 6, 4, 2, -0.6));
  ctx.restore();
  if (look.helmet === 'visor') ink(ctx, roundRect(cx - 4, hy - 15, 24, 5, 2), look.accent, 2);
}

/** Side-view rover (Venus/Mercury). Box 96 x 72, wheels at bottom. frame rotates wheel spokes. */
export function drawRover(ctx: Ctx, w: number, h: number, frame: number, color: string = C.orange): void {
  const base = h - 20;
  // Mast + camera head.
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.68, base - 22);
  ctx.lineTo(w * 0.68, base - 40);
  ctx.stroke();
  ink(ctx, roundRect(w * 0.6, base - 52, 26, 16, 6), C.steel, 3);
  ink(ctx, circle(w * 0.6 + 20, base - 44, 5), C.cyan, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill(circle(w * 0.6 + 19, base - 45.5, 1.6));
  // Solar panel.
  ink(ctx, roundRect(w * 0.08, base - 34, w * 0.5, 8, 3), C.blue, 3);
  // Body.
  ink(ctx, roundRect(w * 0.1, base - 28, w * 0.75, 26, 8), linear(ctx, 0, base - 28, 0, base, [[0, shade(color, 0.25)], [1, shade(color, -0.2)]]), 3);
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.fillRect(w * 0.16, base - 22, w * 0.4, 4);
  // Wheels.
  for (const x of [0.2, 0.48, 0.76]) {
    const wx = w * x;
    const wy = base + 6;
    ink(ctx, circle(wx, wy, 12), C.dark, 3);
    ink(ctx, circle(wx, wy, 5), C.steel, 2);
    ctx.strokeStyle = C.steel;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = frame * (Math.PI / 6) + (k * Math.PI) / 3;
      ctx.moveTo(wx + Math.cos(a) * 6, wy + Math.sin(a) * 6);
      ctx.lineTo(wx + Math.cos(a) * 10, wy + Math.sin(a) * 10);
    }
    ctx.stroke();
  }
}

/** Dialogue portrait for a character. */
export function drawPortrait(ctx: Ctx, ch: CharacterDef, w: number, h: number, mood: Mood = 'happy', player?: AstronautLook): void {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  ctx.save();
  const disc = circle(cx, cy, R - 3);
  ctx.fillStyle = radial(ctx, cx - R * 0.3, cy - R * 0.4, R * 0.1, R * 1.2, [[0, shade(ch.bg, 0.35)], [1, shade(ch.bg, -0.25)]]);
  ctx.fill(disc);
  ctx.clip(disc);
  ctx.fillStyle = rgba('#ffffff', 0.15);
  for (let i = 0; i < 6; i++) ctx.fill(softStar(cx + Math.cos(i * 1.1) * R * 0.75, cy + Math.sin(i * 1.7) * R * 0.7, 4, R * 0.07, R * 0.025, 0));
  const r = R * 0.38;
  switch (ch.kind) {
    case 'human':
      drawHumanBust(ctx, ch.human!, cx, cy - R * 0.08, r, mood);
      break;
    case 'robot':
      drawRobotHead(ctx, cx, cy + R * 0.12, R / 95, ch.id === 'pots' ? C.orange : C.cyan, mood, ch.id === 'pots');
      break;
    case 'tuggy':
      ctx.save();
      ctx.translate(cx - R * 0.8, cy - R * 0.8);
      drawTuggy(ctx, R * 1.6, R * 1.6, mood);
      ctx.restore();
      break;
    case 'alien':
      drawAlienBody(ctx, ch.alien!, cx, cy + R * 0.2, R * 0.55, mood);
      break;
    case 'elder':
      drawAlienBody(ctx, ch.alien!, cx, cy + R * 0.35, R * 0.5, mood, true);
      break;
    case 'critter':
      glowDot(ctx, cx, cy, R * 0.8, '#fff2a8');
      ink(ctx, softStar(cx, cy, 4, R * 0.55, R * 0.2, 0), '#fff7b3', 3);
      cuteFace(ctx, cx, cy + R * 0.02, R * 0.16, { mood });
      break;
    case 'player':
      if (player) drawAstronautBust(ctx, player, cx, cy - R * 0.05, r * 1.05);
      break;
  }
  ctx.restore();
  ctx.lineWidth = Math.max(3, R * 0.06);
  ctx.strokeStyle = C.ink;
  ctx.stroke(disc);
}

/** NPC standing in a level (side-ish view, facing right). Box w x h, feet at bottom. */
export function drawNpcSide(ctx: Ctx, ch: CharacterDef, w: number, h: number, frame = 0): void {
  switch (ch.kind) {
    case 'human': {
      const hl = ch.human!;
      const look: AstronautLook = { name: ch.name, suit: hl.outfit, accent: '#ffe066', helmet: 'round', skin: hl.skin, hair: hl.hair, hairStyle: hl.hairStyle === 'pony' ? 'long' : hl.hairStyle, face: 'smile', outfit: 'none' };
      ctx.save();
      ctx.translate((w - 72) / 2, h - 88);
      drawAstronautSide(ctx, look, frame ? 'walk1' : 'idle', 72, 88);
      ctx.restore();
      break;
    }
    case 'robot': {
      const s = Math.min(w, h) / 110;
      for (const x of [w * 0.3, w * 0.7]) ink(ctx, circle(x, h - 10, 9 * s * 1.2), C.dark, 3);
      ink(ctx, roundRect(w * 0.25, h * 0.55, w * 0.5, h * 0.33, 10), linear(ctx, 0, 0, 0, h, [[0, '#ffffff'], [1, C.steel]]), 3);
      ctx.save();
      ctx.translate(w / 2, h * 0.36);
      ctx.scale(0.55, 0.55);
      drawRobotHeadPublic(ctx, ch.id === 'pots' ? C.orange : C.cyan, ch.id === 'pots');
      ctx.restore();
      break;
    }
    case 'tuggy':
      drawTuggy(ctx, w, h);
      break;
    case 'alien':
      drawAlienBody(ctx, ch.alien!, w / 2, h * 0.62 + (frame ? 2 : 0), Math.min(w, h) * 0.34, 'happy');
      for (const s of [-1, 1]) ink(ctx, ellipse(w / 2 + s * w * 0.16, h - 5, w * 0.12, 5), shade(ch.alien!.body, -0.2), 2.5);
      break;
    case 'elder':
      drawAlienBody(ctx, ch.alien!, w / 2, h * 0.66, Math.min(w, h) * 0.3, 'happy', true);
      for (const s of [-1, 1]) ink(ctx, ellipse(w / 2 + s * w * 0.14, h - 5, w * 0.11, 5), shade(ch.alien!.body, -0.2), 2.5);
      break;
    case 'critter':
      glowDot(ctx, w / 2, h * 0.5, w * 0.45, '#fff2a8');
      ink(ctx, softStar(w / 2, h * 0.5, 4, w * 0.3, w * 0.1, 0), '#fff7b3', 3);
      break;
    default:
      break;
  }
}

function drawRobotHeadPublic(ctx: Ctx, color: string, chef: boolean): void {
  drawRobotHead(ctx, 0, 0, 1, color, 'happy', chef);
}
