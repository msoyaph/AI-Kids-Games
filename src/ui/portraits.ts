// Canvas-drawn character portraits with simple expressions (no image assets).
import type { CharacterLook } from '../data/villagers';
import type { Expr } from '../sim/talk';
import type { Appearance } from '../sim/state';
import type { ClothSlot } from '../data/clothing';
import type { ClothVisual } from '../sim/wardrobe';
import { HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES } from '../render/models/character';

const cache = new Map<string, string>();
const S = 160;

const css = (c: number) => '#' + (c & 0xffffff).toString(16).padStart(6, '0');
function shade(c: number, t: number): string {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const f = (v: number) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

type Ctx = CanvasRenderingContext2D;

function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function tri(ctx: Ctx, pts: [number, number][], fill: string, stroke?: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawEars(ctx: Ctx, look: CharacterLook, F: string, A: string, O: string): void {
  switch (look.species) {
    case 'redpanda':
    case 'lemur':
      for (const s of [-1, 1]) tri(ctx, [[80 + s * 34, 50], [80 + s * 62, 22], [80 + s * 58, 66]], F, O), tri(ctx, [[80 + s * 40, 50], [80 + s * 57, 32], [80 + s * 54, 58]], A);
      break;
    case 'bat':
      for (const s of [-1, 1]) tri(ctx, [[80 + s * 26, 50], [80 + s * 58, 2], [80 + s * 56, 62]], F, O), tri(ctx, [[80 + s * 32, 48], [80 + s * 54, 16], [80 + s * 52, 54]], '#f3b7c2');
      break;
    case 'quokka':
    case 'opossum':
    case 'capybara':
    case 'badger':
      for (const s of [-1, 1]) ell(ctx, 80 + s * 50, 46, look.species === 'capybara' ? 10 : 16, look.species === 'capybara' ? 9 : 16, look.species === 'opossum' ? '#3b3340' : F, O), look.species !== 'opossum' && ell(ctx, 80 + s * 50, 46, 8, 8, A);
      break;
    case 'armadillo':
      for (const s of [-1, 1]) tri(ctx, [[80 + s * 26, 46], [80 + s * 40, 10], [80 + s * 50, 46]], F, O);
      break;
    case 'axolotl':
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(80 + s * 50, 70 + k * 14);
        ctx.quadraticCurveTo(80 + s * 76, 52 + k * 16, 80 + s * 78, 40 + k * 22);
        ctx.lineWidth = 9;
        ctx.strokeStyle = A;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      break;
    case 'pangolin':
      for (let k = 0; k < 3; k++) ell(ctx, 80, 34 + k * 12, 46 - k * 6, 14, shade(look.fur, -0.12 - k * 0.05), O);
      break;
    default:
      for (const s of [-1, 1]) ell(ctx, 80 + s * 56, 82, 10, 14, F, O);
  }
}

function drawMuzzle(ctx: Ctx, look: CharacterLook, F: string, A: string, O: string): void {
  switch (look.species) {
    case 'heron':
      tri(ctx, [[66, 104], [94, 104], [80, 152]], '#f5c45e', '#c9952f');
      for (const s of [-1, 0, 1]) tri(ctx, [[80 + s * 10, 46], [80 + s * 10 + 8, 46], [80 + s * 22, 10]], A, O);
      break;
    case 'platypus':
      ell(ctx, 80, 112, 30, 14, '#6b6070', '#4a4058');
      break;
    case 'capybara':
      ell(ctx, 80, 110, 34, 22, shade(look.fur, -0.06), O);
      ell(ctx, 80, 100, 14, 6, '#5a4038');
      break;
    case 'pangolin':
    case 'armadillo':
    case 'opossum':
      ell(ctx, 80, 112, 18, 16, A, O);
      ell(ctx, 80, 104, 7, 5, look.species === 'opossum' ? '#f7a1b5' : '#4a3a3a');
      break;
    case 'badger':
      ell(ctx, 80, 110, 22, 18, A, O);
      ell(ctx, 80, 101, 7, 5, '#2a2a2a');
      ctx.fillStyle = A;
      ctx.fillRect(72, 30, 16, 60);
      break;
    case 'redpanda':
    case 'quokka':
      ell(ctx, 80, 108, 24, 18, A, O);
      ell(ctx, 80, 100, 6, 5, '#3a2a2a');
      break;
    case 'lemur':
      ell(ctx, 80, 94, 44, 30, A);
      ell(ctx, 80, 112, 10, 9, '#3b3340');
      break;
    default:
      void F;
  }
}

function drawEyes(ctx: Ctx, expr: Expr, y: number, spread: number, big: boolean): void {
  const ink = '#2c2433';
  for (const s of [-1, 1]) {
    const x = 80 + s * spread;
    ctx.lineCap = 'round';
    switch (expr) {
      case 'happy':
      case 'love':
        ctx.beginPath();
        ctx.arc(x, y + 4, 9, Math.PI * 1.15, Math.PI * 1.85);
        ctx.lineWidth = 5;
        ctx.strokeStyle = ink;
        ctx.stroke();
        break;
      case 'sleepy':
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 2);
        ctx.lineTo(x + 9, y + 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = ink;
        ctx.stroke();
        break;
      case 'angry':
        ell(ctx, x, y + 2, 7, 8, ink);
        ctx.beginPath();
        ctx.moveTo(x - 10 * s, y - 12);
        ctx.lineTo(x + 8 * s, y - 6);
        ctx.lineWidth = 5;
        ctx.strokeStyle = ink;
        ctx.stroke();
        break;
      case 'surprised':
        ell(ctx, x, y, 9, 11, '#fff', ink);
        ell(ctx, x, y + 1, 5, 6, ink);
        break;
      case 'sad':
        ell(ctx, x, y + 2, 7, 8, ink);
        ctx.beginPath();
        ctx.moveTo(x - 9, y - 10 - s * 3);
        ctx.lineTo(x + 9, y - 10 + s * 3);
        ctx.lineWidth = 4;
        ctx.strokeStyle = ink;
        ctx.stroke();
        break;
      case 'smug':
        ell(ctx, x, y + 2, 7, 6, ink);
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 4);
        ctx.lineTo(x + 10, y - 4);
        ctx.lineWidth = 5;
        ctx.strokeStyle = ink;
        ctx.stroke();
        break;
      default:
        ell(ctx, x, y, big ? 9 : 7, big ? 11 : 9, ink);
        ell(ctx, x - 2.5, y - 3.5, 3, 3, '#fff');
    }
  }
}

function drawMouth(ctx: Ctx, expr: Expr, y: number): void {
  const ink = '#7a4a4a';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  switch (expr) {
    case 'happy':
    case 'love':
      ctx.arc(80, y - 4, 10, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.fillStyle = '#c45a6a';
      ctx.fill();
      break;
    case 'sad':
      ctx.arc(80, y + 8, 8, 1.2 * Math.PI, 1.8 * Math.PI);
      break;
    case 'surprised':
      ell(ctx, 80, y + 2, 6, 7, '#9a4a55');
      return;
    case 'angry':
      ctx.moveTo(72, y + 2);
      ctx.lineTo(88, y);
      break;
    case 'smug':
      ctx.moveTo(72, y);
      ctx.quadraticCurveTo(84, y + 6, 90, y - 4);
      break;
    case 'sleepy':
      ell(ctx, 80, y + 2, 4, 4, '#9a4a55');
      return;
    default:
      ctx.arc(80, y - 2, 7, 0.2 * Math.PI, 0.8 * Math.PI);
  }
  ctx.stroke();
}

/** Portrait of a character look with an expression, as a data URL. */
export function portraitURL(key: string, look: CharacterLook, expr: Expr = 'neutral'): string {
  const k = `${key}|${expr}`;
  const hit = cache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const F = css(look.fur), A = css(look.accent), O = shade(look.fur, -0.3);
  // shoulders / outfit
  ell(ctx, 80, 168, 62, 36, css(look.outfit), shade(look.outfit, -0.25));
  drawEars(ctx, look, F, A, O);
  const wide = look.species === 'axolotl' || look.species === 'capybara';
  ell(ctx, 80, 88, wide ? 60 : 54, 50, F, O);
  if (look.species === 'armadillo') {
    ctx.beginPath();
    ctx.ellipse(80, 72, 54, 36, 0, Math.PI, Math.PI * 2);
    ctx.fillStyle = shade(look.fur, -0.18);
    ctx.fill();
  }
  drawMuzzle(ctx, look, F, A, O);
  const muzzleLow = ['platypus', 'capybara', 'pangolin', 'armadillo', 'opossum', 'badger', 'redpanda', 'quokka', 'lemur'].includes(look.species);
  drawEyes(ctx, expr, 82, look.species === 'capybara' ? 24 : 20, look.eyes === 1 || look.species === 'lemur' || look.species === 'bat');
  if (look.blush || expr === 'love' || expr === 'happy') {
    ell(ctx, 80 - 34, 100, 10, 6, 'rgba(255,140,160,0.55)');
    ell(ctx, 80 + 34, 100, 10, 6, 'rgba(255,140,160,0.55)');
  }
  if (!muzzleLow || expr !== 'neutral') drawMouth(ctx, expr, muzzleLow ? 122 : 108);
  if (expr === 'love') {
    ctx.fillStyle = '#ff6f8f';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('♥', 120, 40);
  }
  if (expr === 'surprised') {
    ctx.fillStyle = '#5b4a68';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('!', 128, 42);
  }
  if (expr === 'sleepy') {
    ctx.fillStyle = '#8a7ad9';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('z', 124, 40);
  }
  const url = cv.toDataURL('image/png');
  cache.set(k, url);
  return url;
}

/**
 * The player's portrait: face, hair and what they're wearing. Used on save cards,
 * the Glowpad header and the wardrobe.
 */
export function playerPortraitURL(look: Appearance, clothes: Partial<Record<ClothSlot, ClothVisual>> = {}): string {
  const k = `player|${JSON.stringify(look)}|${JSON.stringify(clothes)}`;
  const hit = cache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0]!;
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]!;
  const top = clothes.dress ?? clothes.top;
  const shirt = top?.color ?? OUTFIT_COLORS[look.outfit] ?? OUTFIT_COLORS[0]!;
  const H = css(hair), HO = shade(hair, -0.3);
  // shoulders + shirt pattern
  ell(ctx, 80, 168, 62, 36, css(shirt), shade(shirt, -0.25));
  if (top && top.pattern !== 'plain') {
    ctx.fillStyle = css(top.color2);
    if (top.pattern === 'stripe' || top.pattern === 'check') for (const y of [148, 162]) ctx.fillRect(24, y, 112, 6);
    else for (const [x, y] of [[56, 150], [100, 156], [78, 166]] as const) ell(ctx, x, y, 6, 6, css(top.color2));
  }
  if (clothes.bag?.shape === 'backpack' || clothes.bag?.shape === 'satchel') {
    ctx.strokeStyle = css(clothes.bag.color2);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(48, 136);
    ctx.lineTo(clothes.bag.shape === 'satchel' ? 112 : 48, 168);
    ctx.stroke();
  }
  // back hair (long styles)
  if (look.hair === 1 || look.hair === 3) ell(ctx, 80, 100, 58, 52, H, HO);
  // face
  ell(ctx, 80, 90, 50, 48, css(skin), shade(skin, -0.25));
  for (const s of [-1, 1]) ell(ctx, 80 + s * 50, 94, 8, 10, css(skin), shade(skin, -0.25));
  // hair on top (cap, bob, tuft, ponytail, bun, buzz)
  ctx.beginPath();
  ctx.ellipse(80, 72, 54, look.hair === 5 ? 30 : 38, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fillStyle = H;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = HO;
  ctx.stroke();
  if (look.hair === 2) for (const x of [64, 80, 96]) tri(ctx, [[x - 8, 40], [x + 8, 40], [x, 18]], H, HO);
  if (look.hair === 4) ell(ctx, 80, 30, 18, 16, H, HO);
  if (look.hair === 3) ell(ctx, 124, 112, 10, 22, H, HO);
  // eyes, blush, smile
  drawEyes(ctx, 'happy', 94, 20, look.eyes === 1 || look.eyes === 3);
  if (look.blush) {
    ell(ctx, 80 - 32, 106, 9, 5, 'rgba(255,140,160,0.55)');
    ell(ctx, 80 + 32, 106, 9, 5, 'rgba(255,140,160,0.55)');
  }
  drawMouth(ctx, 'happy', 114);
  // glasses
  const gl = clothes.glasses;
  if (gl) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = css(gl.color);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (gl.shape === 'square' || gl.shape === 'shades') ctx.rect(80 + s * 20 - 13, 84, 26, 18);
      else ctx.ellipse(80 + s * 20, 94, 14, 12, 0, 0, Math.PI * 2);
      if (gl.shape === 'shades') {
        ctx.fillStyle = css(gl.color);
        ctx.fill();
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(73, 92);
    ctx.lineTo(87, 92);
    ctx.stroke();
  }
  // hat
  const hat = clothes.hat;
  if (hat) {
    const HC = css(hat.color), HO2 = shade(hat.color, -0.3), H2 = css(hat.color2);
    switch (hat.shape) {
      case 'sunhat':
        ell(ctx, 80, 52, 76, 14, HC, HO2);
        ell(ctx, 80, 40, 40, 24, HC, HO2);
        ctx.fillStyle = H2;
        ctx.fillRect(42, 44, 76, 8);
        break;
      case 'bow':
        tri(ctx, [[80, 34], [44, 18], [44, 50]], HC, HO2);
        tri(ctx, [[80, 34], [116, 18], [116, 50]], HC, HO2);
        ell(ctx, 80, 34, 10, 10, H2, HO2);
        break;
      case 'flowercrown':
        for (let i = 0; i < 7; i++) ell(ctx, 34 + i * 15, 50 + Math.abs(i - 3) * 2, 9, 9, [H2, '#ffa8c8', '#fdfbf4'][i % 3]!, HO2);
        break;
      case 'crown':
        tri(ctx, [[46, 52], [46, 22], [62, 38], [80, 16], [98, 38], [114, 22], [114, 52]], HC, HO2);
        ell(ctx, 80, 44, 7, 7, H2);
        break;
      case 'party':
        tri(ctx, [[58, 50], [102, 50], [84, 0]], HC, HO2);
        ell(ctx, 84, 4, 8, 8, H2);
        break;
      case 'beret':
        ell(ctx, 84, 40, 54, 20, HC, HO2, -0.15);
        break;
      default: {
        // cap / beanie / bucket
        ctx.beginPath();
        ctx.ellipse(80, 58, 56, 42, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = HC;
        ctx.fill();
        ctx.strokeStyle = HO2;
        ctx.stroke();
        if (hat.shape === 'cap') ell(ctx, 80, 58, 50, 9, H2, HO2);
        else if (hat.shape === 'beanie') {
          ctx.fillStyle = H2;
          ctx.fillRect(26, 50, 108, 10);
          ell(ctx, 80, 14, 11, 11, H2, HO2);
        } else ell(ctx, 80, 58, 66, 10, HC, HO2);
      }
    }
  }
  const url = cv.toDataURL('image/png');
  cache.set(k, url);
  return url;
}
