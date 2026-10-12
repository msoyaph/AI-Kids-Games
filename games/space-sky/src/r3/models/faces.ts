import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { markShared } from '../dispose';

/**
 * Face sheets for 3D characters: a 4x2 grid of 128px expressions drawn on a canvas, applied to a decal
 * on the front of the head. Changing expression just moves the texture offset (no re-upload), so blinking
 * and talking cost nothing. Sheets are cached per face style and shared.
 */
export type Expression = 'happy' | 'talk' | 'wow' | 'think' | 'sleepy' | 'blink' | 'cheer' | 'talk2';
export const EXPRESSIONS: Expression[] = ['happy', 'talk', 'wow', 'think', 'sleepy', 'blink', 'cheer', 'talk2'];

export type FaceStyle =
  | { kind: 'human'; base: 'smile' | 'grin' | 'wow' | 'wink' | 'cool'; blush: boolean; brows: string }
  | { kind: 'alien'; eyes: 1 | 2 | 3; elder: boolean }
  | { kind: 'robot'; color: string }
  | { kind: 'critter' };

const INK = '#20124d';
const CELL = 128;

function keyOf(f: FaceStyle): string {
  switch (f.kind) {
    case 'human':
      return `h:${f.base}:${f.blush}:${f.brows}`;
    case 'alien':
      return `a:${f.eyes}:${f.elder}`;
    case 'robot':
      return `r:${f.color}`;
    default:
      return 'c';
  }
}

function eyePair(g: CanvasRenderingContext2D, cx: number, cy: number, gap: number, e: Expression, wink: boolean, size = 1): void {
  for (const s of [-1, 1]) {
    const x = cx + s * gap;
    g.save();
    g.translate(x, cy);
    g.scale(size, size);
    if (e === 'blink' || e === 'cheer' || (wink && s > 0 && e === 'happy')) {
      // Closed happy eyes: little arches.
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath();
      if (e === 'blink') {
        g.moveTo(-10, 2);
        g.lineTo(10, 2);
      } else g.arc(0, 6, 11, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else if (e === 'sleepy') {
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(0, 4, 10, 6, 0, 0, Math.PI);
      g.fill();
    } else {
      const ry = e === 'wow' ? 15 : 13;
      const rx = e === 'wow' ? 11 : 9.5;
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(-3, -5, 3.6, 0, Math.PI * 2);
      g.arc(3.5, 3, 1.6, 0, Math.PI * 2);
      g.fill();
      if (e === 'think') {
        // Looking up and to the side.
        g.fillStyle = INK;
      }
    }
    g.restore();
  }
}

function mouth(g: CanvasRenderingContext2D, cx: number, cy: number, e: Expression, base: string): void {
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 5.5;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (e === 'talk' || e === 'talk2' || e === 'wow') {
    const open = e === 'talk2' ? 7 : e === 'talk' ? 11 : 13;
    g.beginPath();
    g.ellipse(cx, cy + 2, e === 'wow' ? 9 : 12, open, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff7a9a';
    g.beginPath();
    g.ellipse(cx, cy + 2 + open * 0.45, e === 'wow' ? 5 : 7, open * 0.4, 0, 0, Math.PI * 2);
    g.fill();
  } else if (e === 'think') {
    g.beginPath();
    g.moveTo(cx - 9, cy + 4);
    g.quadraticCurveTo(cx, cy, cx + 10, cy + 2);
    g.stroke();
  } else if (e === 'sleepy') {
    g.beginPath();
    g.arc(cx, cy, 6, 0, Math.PI * 2);
    g.stroke();
  } else if (e === 'cheer' || base === 'grin') {
    g.beginPath();
    g.moveTo(cx - 16, cy - 3);
    g.quadraticCurveTo(cx, cy - 2, cx + 16, cy - 3);
    g.quadraticCurveTo(cx, cy + 22, cx - 16, cy - 3);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(cx - 10, cy - 2, 20, 4);
  } else if (base === 'cool') {
    g.beginPath();
    g.moveTo(cx - 12, cy + 2);
    g.quadraticCurveTo(cx + 2, cy + 12, cx + 14, cy - 2);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(cx, cy - 4, 13, Math.PI * 0.18, Math.PI * 0.82);
    g.stroke();
  }
}

function drawCell(g: CanvasRenderingContext2D, f: FaceStyle, e: Expression): void {
  const cx = CELL / 2;
  if (f.kind === 'robot') {
    // A glowing screen face.
    g.fillStyle = '#10163a';
    g.beginPath();
    g.roundRect(8, 18, CELL - 16, CELL - 36, 22);
    g.fill();
    g.fillStyle = f.color;
    g.strokeStyle = f.color;
    g.lineWidth = 8;
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      const x = cx + s * 24;
      if (e === 'blink' || e === 'cheer') {
        g.beginPath();
        g.moveTo(x - 9, 56);
        g.lineTo(x + 9, 56);
        g.stroke();
      } else if (e === 'wow') {
        g.beginPath();
        g.arc(x, 54, 11, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.beginPath();
        g.roundRect(x - 7, 44, 14, e === 'sleepy' ? 8 : 22, 7);
        g.fill();
      }
    }
    g.beginPath();
    if (e === 'talk' || e === 'wow') g.ellipse(cx, 86, 12, 8, 0, 0, Math.PI * 2);
    else if (e === 'talk2') g.ellipse(cx, 86, 12, 4, 0, 0, Math.PI * 2);
    else {
      g.lineWidth = 6;
      g.arc(cx, 76, 16, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();
      return;
    }
    g.fill();
    return;
  }
  if (f.kind === 'critter') {
    eyePair(g, cx, 56, 18, e, false, 0.8);
    mouth(g, cx, 84, e, 'smile');
    return;
  }
  if (f.kind === 'alien') {
    const n = f.eyes;
    const ey = 50;
    if (n === 1) {
      // One big eye.
      g.save();
      g.translate(cx, ey);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(0, 0, 26, 24, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = INK;
      g.stroke();
      if (e === 'blink' || e === 'cheer' || e === 'sleepy') {
        g.fillStyle = 'rgba(0,0,0,0)';
        g.beginPath();
        g.moveTo(-20, 2);
        g.lineTo(20, 2);
        g.stroke();
      } else {
        g.fillStyle = INK;
        g.beginPath();
        g.arc(e === 'think' ? 6 : 0, e === 'think' ? -6 : 2, e === 'wow' ? 12 : 10, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-3, -3, 4, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    } else {
      const xs = n === 3 ? [-30, 0, 30] : [-20, 20];
      for (let i = 0; i < xs.length; i++) {
        const big = n === 3 && i === 1;
        g.save();
        g.translate(cx + xs[i], ey - (big ? 8 : 0));
        const r = big ? 17 : n === 3 ? 13 : 15;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = 3.5;
        g.strokeStyle = INK;
        g.stroke();
        if (e === 'blink' || e === 'cheer' || e === 'sleepy' || (f.elder && e === 'happy')) {
          g.beginPath();
          g.arc(0, 2, r * 0.7, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        } else {
          g.fillStyle = INK;
          g.beginPath();
          g.arc(e === 'think' ? 3 : 0, e === 'think' ? -4 : 2, e === 'wow' ? r * 0.62 : r * 0.52, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#fff';
          g.beginPath();
          g.arc(-2, -2, 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
      }
    }
    // Cheeks.
    g.fillStyle = 'rgba(255, 110, 160, 0.45)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * 38, 80, 10, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    mouth(g, cx, 86, e, 'smile');
    return;
  }
  // Human / cadet.
  const wink = f.base === 'wink';
  if (f.base === 'cool' && (e === 'happy' || e === 'talk' || e === 'talk2')) {
    // Shades!
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(cx - 40, 40, 80, 22, 10);
    g.fill();
    g.fillStyle = '#4dd4ff';
    g.fillRect(cx - 34, 44, 22, 6);
  } else eyePair(g, cx, 52, 22, e === 'happy' && f.base === 'wow' ? 'wow' : e, wink);
  // Brows.
  g.strokeStyle = f.brows;
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const lift = e === 'wow' ? -8 : e === 'think' ? (s < 0 ? -6 : 0) : 0;
    g.beginPath();
    g.moveTo(cx + s * 13, 32 + lift);
    g.quadraticCurveTo(cx + s * 22, 27 + lift, cx + s * 31, 31 + lift);
    g.stroke();
  }
  if (f.blush) {
    g.fillStyle = 'rgba(255, 110, 140, 0.42)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * 36, 74, 10, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  mouth(g, cx, 84, e, f.base);
}

const sheets = new Map<string, CanvasTexture>();

/** The shared face sheet for a style. */
export function faceSheet(f: FaceStyle): CanvasTexture {
  const key = keyOf(f);
  let t = sheets.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = CELL * 4;
    c.height = CELL * 2;
    const g = c.getContext('2d')!;
    EXPRESSIONS.forEach((e, i) => {
      g.save();
      g.translate((i % 4) * CELL, Math.floor(i / 4) * CELL);
      g.beginPath();
      g.rect(0, 0, CELL, CELL);
      g.clip();
      drawCell(g, f, e);
      g.restore();
    });
    t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    markShared(t);
    sheets.set(key, t);
  }
  return t;
}

/** A per-character view of a shared sheet (own offset, same GPU image). */
export function faceTexture(f: FaceStyle): Texture {
  const t = faceSheet(f).clone();
  t.repeat.set(0.25, 0.5);
  setExpression(t, 'happy');
  return t;
}

export function setExpression(t: Texture, e: Expression): void {
  const i = EXPRESSIONS.indexOf(e);
  t.offset.set((i % 4) * 0.25, 0.5 - Math.floor(i / 4) * 0.5);
}
