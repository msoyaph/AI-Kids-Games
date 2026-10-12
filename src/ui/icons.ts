// Procedural item icons drawn with canvas 2D (cached as data URLs). No image assets.
import { item } from '../data/registry';
import type { IconSpec } from '../data/types';

const SIZE = 96;
const cache = new Map<string, string>();
/** Optional hook to render 3D thumbnails (furniture) — set by the renderer. */
export let thumbProvider: ((id: string) => string | null) | null = null;
export function setThumbProvider(f: (id: string) => string | null): void {
  thumbProvider = f;
}

const css = (c: number) => '#' + (c & 0xffffff).toString(16).padStart(6, '0');
function shade(c: number, t: number): string {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const f = (v: number) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

type Ctx = CanvasRenderingContext2D;

function blob(ctx: Ctx, fill: string, stroke: string, path: () => void, lw = 4): void {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.roundRect(x, y, w, h, r);
}

function highlight(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ell(ctx, x, y, r, r * 0.6, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
}

function eye(ctx: Ctx, x: number, y: number, r = 4): void {
  ctx.beginPath();
  ell(ctx, x, y, r, r);
  ctx.fillStyle = '#2c2433';
  ctx.fill();
  ctx.beginPath();
  ell(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.35);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawIcon(ctx: Ctx, spec: IconSpec): void {
  const c = spec.c, c2 = spec.c2 ?? spec.c, c3 = spec.c3 ?? c2;
  const F = css(c), F2 = css(c2), F3 = css(c3);
  const S = shade(c, -0.35), S2 = shade(c2, -0.35);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (spec.v && drawClothing(ctx, spec)) return;
  switch (spec.s) {
    case 'fish':
    case 'eel':
    case 'puffer': {
      if (spec.s === 'eel') {
        blob(ctx, F, S, () => {
          ctx.moveTo(14, 54);
          ctx.bezierCurveTo(26, 30, 40, 70, 56, 46);
          ctx.bezierCurveTo(66, 32, 78, 38, 84, 46);
          ctx.bezierCurveTo(78, 56, 66, 50, 58, 60);
          ctx.bezierCurveTo(42, 82, 28, 46, 14, 62);
          ctx.closePath();
        });
        eye(ctx, 76, 44, 3);
        break;
      }
      const puff = spec.s === 'puffer';
      blob(ctx, F2, S2, () => {
        ctx.moveTo(26, 48);
        ctx.lineTo(8, 32);
        ctx.lineTo(10, 64);
        ctx.closePath();
      });
      blob(ctx, F, S, () => ell(ctx, 50, 48, puff ? 30 : 32, puff ? 28 : 19));
      if (puff)
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(50 + Math.cos(a) * 28, 48 + Math.sin(a) * 26);
          ctx.lineTo(50 + Math.cos(a) * 36, 48 + Math.sin(a) * 33);
          ctx.strokeStyle = S;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      blob(ctx, F2, S2, () => {
        ctx.moveTo(44, 32);
        ctx.quadraticCurveTo(52, 18, 60, 30);
        ctx.closePath();
      }, 3);
      ctx.beginPath();
      ctx.moveTo(40, 40);
      ctx.quadraticCurveTo(46, 50, 40, 60);
      ctx.strokeStyle = F3;
      ctx.lineWidth = 4;
      ctx.stroke();
      highlight(ctx, 46, 38, 9);
      eye(ctx, 68, 44, 4);
      break;
    }
    case 'ray':
      blob(ctx, F, S, () => {
        ctx.moveTo(48, 16);
        ctx.quadraticCurveTo(86, 40, 84, 50);
        ctx.quadraticCurveTo(60, 56, 48, 70);
        ctx.quadraticCurveTo(36, 56, 12, 50);
        ctx.quadraticCurveTo(10, 40, 48, 16);
      });
      ctx.beginPath();
      ctx.moveTo(48, 68);
      ctx.quadraticCurveTo(50, 80, 60, 88);
      ctx.strokeStyle = S;
      ctx.lineWidth = 3;
      ctx.stroke();
      highlight(ctx, 42, 34, 9);
      eye(ctx, 42, 30, 3);
      eye(ctx, 54, 30, 3);
      break;
    case 'jelly':
      blob(ctx, F, S, () => {
        ctx.moveTo(18, 50);
        ctx.bezierCurveTo(18, 14, 78, 14, 78, 50);
        ctx.closePath();
      });
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(26 + k * 11, 50);
        ctx.bezierCurveTo(22 + k * 11, 62, 32 + k * 11, 70, 26 + k * 11, 84);
        ctx.strokeStyle = F2;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      highlight(ctx, 38, 30, 10);
      break;
    case 'crab':
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(48 + s * 18, 58 + k * 5);
          ctx.lineTo(48 + s * 36, 66 + k * 7);
          ctx.strokeStyle = S;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        blob(ctx, F, S, () => ell(ctx, 48 + s * 30, 34, 10, 8, s * 0.5), 3);
      }
      blob(ctx, F, S, () => ell(ctx, 48, 56, 26, 18));
      eye(ctx, 40, 42, 4);
      eye(ctx, 56, 42, 4);
      highlight(ctx, 40, 52, 8);
      break;
    case 'beetle':
    case 'firefly':
    case 'ant': {
      for (let k = 0; k < 3; k++)
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(48, 40 + k * 10);
          ctx.lineTo(48 + s * 28, 34 + k * 14);
          ctx.strokeStyle = '#4a4058';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      if (spec.s === 'ant') {
        blob(ctx, F, S, () => ell(ctx, 48, 28, 10, 9));
        blob(ctx, F, S, () => ell(ctx, 48, 46, 8, 9));
        blob(ctx, F, S, () => ell(ctx, 48, 68, 14, 16));
      } else {
        blob(ctx, F2, S2, () => ell(ctx, 48, 26, 12, 9));
        blob(ctx, F, S, () => ell(ctx, 48, 56, 22, 26));
        ctx.beginPath();
        ctx.moveTo(48, 32);
        ctx.lineTo(48, 82);
        ctx.strokeStyle = S;
        ctx.lineWidth = 3;
        ctx.stroke();
        if (spec.s === 'firefly') {
          ctx.beginPath();
          ell(ctx, 48, 74, 14, 10);
          ctx.fillStyle = 'rgba(255,240,140,0.9)';
          ctx.shadowColor = '#ffe27a';
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ell(ctx, 38, 52, 4, 4);
          ell(ctx, 58, 62, 4, 4);
          ctx.fillStyle = F3;
          ctx.fill();
        }
        highlight(ctx, 40, 46, 8);
      }
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(48 + s * 4, 20);
        ctx.quadraticCurveTo(48 + s * 12, 8, 48 + s * 20, 10);
        ctx.strokeStyle = '#4a4058';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    }
    case 'butterfly':
    case 'moth':
      for (const s of [-1, 1]) {
        blob(ctx, F, S, () => ell(ctx, 48 + s * 20, 36, 20, spec.s === 'moth' ? 16 : 20, s * 0.4));
        blob(ctx, F2, S2, () => ell(ctx, 48 + s * 16, 62, 13, 12, -s * 0.3));
        ctx.beginPath();
        ell(ctx, 48 + s * 22, 34, 5, 5);
        ctx.fillStyle = F3;
        ctx.fill();
      }
      blob(ctx, '#5a4a66', '#3a3046', () => ell(ctx, 48, 50, 5, 22), 2);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(48, 30);
        ctx.quadraticCurveTo(48 + s * 8, 14, 48 + s * 16, 12);
        ctx.strokeStyle = '#3a3046';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    case 'dragonfly':
      for (const s of [-1, 1])
        for (const k of [0, 1]) blob(ctx, 'rgba(230,245,255,0.85)', S2, () => ell(ctx, 48 + s * 22, 34 + k * 14, 22, 6, s * (k ? 0.25 : -0.15)), 2);
      blob(ctx, F, S, () => rr(ctx, 44, 20, 8, 66, 4));
      blob(ctx, F2, S2, () => ell(ctx, 48, 20, 9, 8));
      break;
    case 'bee':
      for (const s of [-1, 1]) blob(ctx, 'rgba(235,248,255,0.9)', '#9fb4c8', () => ell(ctx, 48 + s * 16, 28, 14, 10, s * 0.5), 2);
      blob(ctx, F, S, () => ell(ctx, 48, 54, 24, 20));
      for (const x of [40, 54]) {
        ctx.fillStyle = F2;
        ctx.fillRect(x, 36, 6, 36);
      }
      eye(ctx, 64, 50, 3);
      highlight(ctx, 40, 46, 7);
      break;
    case 'hopper':
      blob(ctx, F, S, () => ell(ctx, 46, 52, 30, 13, -0.15));
      blob(ctx, F2, S2, () => {
        ctx.moveTo(30, 54);
        ctx.lineTo(18, 30);
        ctx.lineTo(40, 48);
        ctx.closePath();
      }, 3);
      ctx.beginPath();
      ctx.moveTo(40, 60);
      ctx.lineTo(28, 80);
      ctx.moveTo(54, 62);
      ctx.lineTo(62, 80);
      ctx.strokeStyle = S;
      ctx.lineWidth = 3;
      ctx.stroke();
      eye(ctx, 70, 44, 4);
      break;
    case 'snail':
      blob(ctx, F2, S2, () => {
        ctx.moveTo(14, 72);
        ctx.quadraticCurveTo(60, 80, 84, 66);
        ctx.quadraticCurveTo(88, 50, 80, 48);
        ctx.lineTo(70, 66);
        ctx.closePath();
      });
      blob(ctx, F, S, () => ell(ctx, 42, 50, 24, 22));
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.2) {
        const r = 2 + a * 1.6;
        ctx.lineTo(42 + Math.cos(a) * r, 50 + Math.sin(a) * r);
      }
      ctx.strokeStyle = S;
      ctx.lineWidth = 3;
      ctx.stroke();
      eye(ctx, 82, 40, 3);
      break;
    case 'spider':
      for (let k = 0; k < 4; k++)
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(48, 50);
          ctx.quadraticCurveTo(48 + s * 24, 26 + k * 12, 48 + s * 38, 36 + k * 14);
          ctx.strokeStyle = S;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      blob(ctx, F, S, () => ell(ctx, 48, 58, 18, 20));
      blob(ctx, F2, S2, () => ell(ctx, 48, 34, 11, 10));
      eye(ctx, 44, 32, 2.5);
      eye(ctx, 52, 32, 2.5);
      break;
    case 'bone':
      blob(ctx, F, S, () => {
        rr(ctx, 26, 40, 44, 16, 8);
      });
      for (const [x, y] of [
        [24, 40],
        [24, 56],
        [72, 40],
        [72, 56],
      ] as const)
        blob(ctx, F, S, () => ell(ctx, x, y, 10, 10));
      ctx.fillStyle = F;
      ctx.fillRect(26, 42, 44, 12);
      highlight(ctx, 40, 44, 8);
      break;
    case 'skull':
      blob(ctx, F, S, () => {
        ctx.moveTo(20, 50);
        ctx.bezierCurveTo(16, 14, 80, 14, 78, 46);
        ctx.lineTo(84, 62);
        ctx.lineTo(56, 70);
        ctx.lineTo(54, 80);
        ctx.lineTo(26, 76);
        ctx.closePath();
      });
      blob(ctx, F2, S2, () => ell(ctx, 52, 42, 9, 8), 2);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = '#fff8ea';
        ctx.fillRect(58 + k * 6, 62, 4, 6);
      }
      highlight(ctx, 34, 30, 9);
      break;
    case 'shellFossil':
    case 'rock':
    case 'stone':
    case 'ore':
    case 'clay': {
      blob(ctx, F, S, () => {
        ctx.moveTo(18, 62);
        ctx.lineTo(24, 34);
        ctx.lineTo(46, 20);
        ctx.lineTo(72, 28);
        ctx.lineTo(82, 54);
        ctx.lineTo(66, 76);
        ctx.lineTo(32, 78);
        ctx.closePath();
      });
      if (spec.s === 'shellFossil') {
        ctx.beginPath();
        for (let a = 0; a < 14; a += 0.2) {
          const r = 1 + a * 1.9;
          ctx.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r);
        }
        ctx.strokeStyle = F2;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (spec.s === 'ore')
        for (const [x, y] of [
          [40, 40],
          [58, 56],
          [36, 62],
        ] as const) {
          ctx.beginPath();
          ell(ctx, x, y, 6, 5);
          ctx.fillStyle = F2;
          ctx.fill();
        }
      highlight(ctx, 40, 36, 10);
      break;
    }
    case 'fruit':
      blob(ctx, F, S, () => ell(ctx, 48, 54, 28, 26));
      ctx.beginPath();
      ctx.moveTo(48, 30);
      ctx.lineTo(50, 16);
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 4;
      ctx.stroke();
      blob(ctx, '#8fd18a', '#5a9a56', () => ell(ctx, 60, 20, 10, 5, -0.4), 2);
      highlight(ctx, 38, 44, 10);
      break;
    case 'branch':
      ctx.beginPath();
      ctx.moveTo(14, 78);
      ctx.lineTo(80, 18);
      ctx.moveTo(48, 48);
      ctx.lineTo(70, 56);
      ctx.moveTo(34, 62);
      ctx.lineTo(30, 40);
      ctx.strokeStyle = S;
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = F;
      ctx.lineWidth = 7;
      ctx.stroke();
      blob(ctx, '#8fd18a', '#5a9a56', () => ell(ctx, 74, 58, 8, 5, 0.3), 2);
      break;
    case 'log':
      blob(ctx, F, S, () => rr(ctx, 14, 30, 60, 38, 12));
      blob(ctx, F2, S, () => ell(ctx, 74, 49, 12, 19));
      ctx.beginPath();
      ell(ctx, 74, 49, 6, 10);
      ctx.strokeStyle = S;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case 'fiber':
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(30 + k * 8, 84);
        ctx.quadraticCurveTo(24 + k * 10, 50, 36 + k * 7, 14 + (k % 2) * 8);
        ctx.strokeStyle = k % 2 ? F : S;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      break;
    case 'shell':
      blob(ctx, F, S, () => {
        ctx.moveTo(48, 80);
        ctx.lineTo(16, 40);
        ctx.quadraticCurveTo(48, 0, 80, 40);
        ctx.closePath();
      });
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(48, 78);
        ctx.lineTo(48 + k * 13, 26 + Math.abs(k) * 4);
        ctx.strokeStyle = F2;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      highlight(ctx, 40, 34, 8);
      break;
    case 'flower':
      ctx.beginPath();
      ctx.moveTo(48, 86);
      ctx.lineTo(48, 50);
      ctx.strokeStyle = F2;
      ctx.lineWidth = 5;
      ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        blob(ctx, F, shade(c, -0.25), () => ell(ctx, 48 + Math.cos(a) * 16, 38 + Math.sin(a) * 16, 13, 11, a), 3);
      }
      blob(ctx, '#ffd45c', '#d9a63a', () => ell(ctx, 48, 38, 9, 9), 2);
      break;
    case 'seed':
      blob(ctx, '#e8d2a6', '#b39a6e', () => {
        ctx.moveTo(24, 30);
        ctx.lineTo(72, 30);
        ctx.lineTo(76, 82);
        ctx.lineTo(20, 82);
        ctx.closePath();
      });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        blob(ctx, F, shade(c, -0.25), () => ell(ctx, 48 + Math.cos(a) * 9, 56 + Math.sin(a) * 9, 7, 6, a), 2);
      }
      blob(ctx, '#ffd45c', '#d9a63a', () => ell(ctx, 48, 56, 5, 5), 1);
      break;
    case 'sapling':
      blob(ctx, '#c9a27a', '#8a6a4a', () => rr(ctx, 30, 62, 36, 22, 6));
      ctx.beginPath();
      ctx.moveTo(48, 64);
      ctx.lineTo(48, 34);
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 5;
      ctx.stroke();
      blob(ctx, F, S, () => ell(ctx, 36, 34, 14, 9, -0.4), 3);
      blob(ctx, F, S, () => ell(ctx, 60, 28, 14, 9, 0.4), 3);
      break;
    case 'net':
      ctx.beginPath();
      ctx.moveTo(20, 84);
      ctx.lineTo(56, 44);
      ctx.strokeStyle = F;
      ctx.lineWidth = 7;
      ctx.stroke();
      blob(ctx, 'rgba(255,255,255,0.5)', F2, () => ell(ctx, 64, 32, 20, 20), 5);
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(52 + k * 6, 16);
        ctx.lineTo(56 + k * 6, 48);
      }
      ctx.strokeStyle = 'rgba(160,160,180,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 'rod':
      ctx.beginPath();
      ctx.moveTo(14, 86);
      ctx.quadraticCurveTo(50, 40, 80, 12);
      ctx.strokeStyle = F;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(80, 12);
      ctx.lineTo(80, 60);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      blob(ctx, '#f27c7c', '#c45a5a', () => ell(ctx, 80, 64, 6, 6), 2);
      blob(ctx, F2, S2, () => ell(ctx, 30, 70, 8, 8), 2);
      break;
    case 'shovel':
      ctx.beginPath();
      ctx.moveTo(22, 18);
      ctx.lineTo(56, 58);
      ctx.strokeStyle = F;
      ctx.lineWidth = 7;
      ctx.stroke();
      blob(ctx, F2, S2, () => {
        ctx.moveTo(52, 54);
        ctx.lineTo(70, 50);
        ctx.quadraticCurveTo(90, 76, 82, 84);
        ctx.quadraticCurveTo(70, 90, 50, 70);
        ctx.closePath();
      });
      break;
    case 'axe':
      ctx.beginPath();
      ctx.moveTo(26, 86);
      ctx.lineTo(60, 20);
      ctx.strokeStyle = F;
      ctx.lineWidth = 7;
      ctx.stroke();
      blob(ctx, F2, S2, () => {
        ctx.moveTo(52, 22);
        ctx.quadraticCurveTo(84, 14, 82, 40);
        ctx.quadraticCurveTo(70, 44, 60, 40);
        ctx.closePath();
      });
      break;
    case 'can':
      blob(ctx, F2, S2, () => rr(ctx, 22, 38, 42, 40, 10));
      blob(ctx, F2, S2, () => {
        ctx.moveTo(60, 50);
        ctx.lineTo(86, 32);
        ctx.lineTo(88, 38);
        ctx.lineTo(62, 62);
        ctx.closePath();
      }, 3);
      ctx.beginPath();
      ctx.arc(32, 36, 14, Math.PI, 0);
      ctx.strokeStyle = F;
      ctx.lineWidth = 5;
      ctx.stroke();
      highlight(ctx, 34, 48, 8);
      break;
    case 'ladder':
      for (const x of [30, 64]) {
        ctx.beginPath();
        ctx.moveTo(x, 10);
        ctx.lineTo(x, 88);
        ctx.strokeStyle = F;
        ctx.lineWidth = 7;
        ctx.stroke();
      }
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(30, 20 + k * 16);
        ctx.lineTo(64, 20 + k * 16);
        ctx.strokeStyle = F2;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      break;
    case 'furniture':
      blob(ctx, F, S, () => rr(ctx, 20, 30, 56, 40, 8));
      blob(ctx, F2, S2, () => rr(ctx, 14, 22, 68, 14, 6), 3);
      for (const x of [26, 64]) {
        ctx.fillStyle = S;
        ctx.fillRect(x, 70, 6, 14);
      }
      highlight(ctx, 34, 44, 8);
      break;
    case 'wall':
    case 'floor':
      blob(ctx, F, S, () => (spec.s === 'wall' ? rr(ctx, 18, 12, 60, 72, 6) : (ctx.moveTo(48, 20), ctx.lineTo(88, 48), ctx.lineTo(48, 76), ctx.lineTo(8, 48), ctx.closePath())));
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = F2;
      ctx.lineWidth = 6;
      for (let k = -4; k < 8; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 14, 0);
        ctx.lineTo(k * 14 + 40, 96);
        ctx.stroke();
      }
      ctx.restore();
      break;
    case 'scroll':
    case 'letter':
      blob(ctx, F, S, () => rr(ctx, 16, 28, 64, 44, 6));
      ctx.beginPath();
      ctx.moveTo(16, 30);
      ctx.lineTo(48, 54);
      ctx.lineTo(80, 30);
      ctx.strokeStyle = S;
      ctx.lineWidth = 3;
      ctx.stroke();
      blob(ctx, F2, S2, () => ell(ctx, 48, 54, 7, 7), 2);
      break;
    case 'bottle':
      blob(ctx, F, S, () => {
        ctx.moveTo(40, 12);
        ctx.lineTo(56, 12);
        ctx.lineTo(56, 30);
        ctx.quadraticCurveTo(76, 36, 74, 56);
        ctx.lineTo(74, 80);
        ctx.quadraticCurveTo(48, 90, 22, 80);
        ctx.lineTo(22, 56);
        ctx.quadraticCurveTo(20, 36, 40, 30);
        ctx.closePath();
      });
      blob(ctx, F2, '#c9b48a', () => rr(ctx, 34, 46, 28, 26, 4), 2);
      blob(ctx, '#c9945f', '#8a6a4a', () => rr(ctx, 40, 6, 16, 10, 3), 2);
      highlight(ctx, 34, 44, 6);
      break;
    case 'gem':
      blob(ctx, F, S, () => {
        ctx.moveTo(48, 12);
        ctx.lineTo(80, 40);
        ctx.lineTo(48, 86);
        ctx.lineTo(16, 40);
        ctx.closePath();
      });
      ctx.beginPath();
      ctx.moveTo(16, 40);
      ctx.lineTo(80, 40);
      ctx.moveTo(48, 12);
      ctx.lineTo(36, 40);
      ctx.lineTo(48, 86);
      ctx.lineTo(60, 40);
      ctx.lineTo(48, 12);
      ctx.strokeStyle = F2;
      ctx.lineWidth = 2;
      ctx.stroke();
      highlight(ctx, 38, 30, 8);
      break;
    case 'key':
      blob(ctx, F, S, () => ell(ctx, 30, 36, 16, 16));
      ctx.beginPath();
      ell(ctx, 30, 36, 6, 6);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(42, 46);
      ctx.lineTo(80, 80);
      ctx.moveTo(66, 66);
      ctx.lineTo(74, 58);
      ctx.moveTo(74, 74);
      ctx.lineTo(82, 66);
      ctx.strokeStyle = S;
      ctx.lineWidth = 7;
      ctx.stroke();
      blob(ctx, F2, S2, () => ell(ctx, 18, 22, 8, 5, -0.6), 2);
      break;
    case 'bag':
      blob(ctx, F, S, () => {
        ctx.moveTo(34, 30);
        ctx.quadraticCurveTo(10, 84, 48, 86);
        ctx.quadraticCurveTo(86, 84, 62, 30);
        ctx.closePath();
      });
      blob(ctx, F2, S2, () => rr(ctx, 34, 22, 28, 10, 4), 3);
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = S;
      ctx.textAlign = 'center';
      ctx.fillText('✦', 48, 70);
      break;
    case 'lantern':
      blob(ctx, F, S, () => ell(ctx, 48, 52, 26, 30));
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(48 + k * 12, 24);
        ctx.quadraticCurveTo(48 + k * 20, 52, 48 + k * 12, 80);
        ctx.strokeStyle = S;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      blob(ctx, '#6f6a8a', '#4a4560', () => rr(ctx, 38, 16, 20, 8, 3), 2);
      ctx.beginPath();
      ell(ctx, 48, 54, 10, 12);
      ctx.fillStyle = F2;
      ctx.shadowColor = F2;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case 'hat':
      blob(ctx, F, S, () => ell(ctx, 48, 62, 38, 12));
      blob(ctx, F, S, () => {
        ctx.moveTo(26, 62);
        ctx.quadraticCurveTo(26, 26, 48, 26);
        ctx.quadraticCurveTo(70, 26, 70, 62);
        ctx.closePath();
      });
      ctx.fillStyle = F2;
      ctx.fillRect(27, 50, 42, 8);
      break;
    case 'glasses':
      for (const x of [30, 66]) blob(ctx, 'rgba(220,240,255,0.7)', F, () => ell(ctx, x, 50, 15, 14), 5);
      ctx.beginPath();
      ctx.moveTo(44, 48);
      ctx.quadraticCurveTo(48, 42, 52, 48);
      ctx.strokeStyle = F;
      ctx.lineWidth = 5;
      ctx.stroke();
      break;
    case 'book':
      blob(ctx, F, S, () => rr(ctx, 20, 16, 56, 66, 6));
      blob(ctx, F2, S2, () => rr(ctx, 26, 22, 44, 54, 4), 2);
      ctx.fillStyle = S;
      ctx.fillRect(20, 16, 8, 66);
      break;
    case 'shirt':
      blob(ctx, F, S, () => {
        ctx.moveTo(32, 18);
        ctx.lineTo(14, 30);
        ctx.lineTo(22, 44);
        ctx.lineTo(30, 40);
        ctx.lineTo(30, 80);
        ctx.lineTo(66, 80);
        ctx.lineTo(66, 40);
        ctx.lineTo(74, 44);
        ctx.lineTo(82, 30);
        ctx.lineTo(64, 18);
        ctx.quadraticCurveTo(48, 30, 32, 18);
        ctx.closePath();
      });
      ctx.fillStyle = F2;
      for (const [x, y] of [[40, 50], [56, 58], [44, 68]] as const) {
        ctx.beginPath();
        ell(ctx, x, y, 4, 4);
        ctx.fill();
      }
      break;
    case 'pants':
      blob(ctx, F, S, () => {
        ctx.moveTo(28, 16);
        ctx.lineTo(68, 16);
        ctx.lineTo(72, 82);
        ctx.lineTo(54, 82);
        ctx.lineTo(48, 40);
        ctx.lineTo(42, 82);
        ctx.lineTo(24, 82);
        ctx.closePath();
      });
      ctx.fillStyle = F2;
      ctx.fillRect(28, 16, 40, 7);
      break;
    case 'dress':
      blob(ctx, F, S, () => {
        ctx.moveTo(36, 14);
        ctx.lineTo(60, 14);
        ctx.lineTo(62, 38);
        ctx.lineTo(80, 82);
        ctx.lineTo(16, 82);
        ctx.lineTo(34, 38);
        ctx.closePath();
      });
      ctx.fillStyle = F2;
      ctx.fillRect(33, 36, 30, 6);
      for (const [x, y] of [[34, 64], [50, 70], [64, 62]] as const) {
        ctx.beginPath();
        ell(ctx, x, y, 4, 4);
        ctx.fill();
      }
      break;
    case 'shoes':
      for (const [x, y] of [[30, 46], [58, 60]] as const) {
        blob(ctx, F, S, () => {
          ctx.moveTo(x - 12, y - 18);
          ctx.lineTo(x + 2, y - 18);
          ctx.lineTo(x + 4, y - 4);
          ctx.quadraticCurveTo(x + 24, y - 2, x + 24, y + 10);
          ctx.lineTo(x - 12, y + 10);
          ctx.closePath();
        });
        ctx.fillStyle = F2;
        ctx.fillRect(x - 12, y + 6, 36, 5);
      }
      break;
    case 'mystery':
    default:
      blob(ctx, F, S, () => ell(ctx, 48, 50, 32, 28));
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = S2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 48, 52);
      break;
  }
}

// ---------------------------------------------------------------- clothing (shape + pattern)

function starPath(ctx: Ctx, x: number, y: number, R: number, r: number): void {
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const d = k % 2 ? r : R;
    if (k) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

function heartPath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.closePath();
}

function dot(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  ell(ctx, x, y, r, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A clothing pattern, drawn inside the current clip around (cx, cy). */
function clothPattern(ctx: Ctx, p: string | undefined, col: string, cx: number, cy: number): void {
  if (!p || p === 'plain') return;
  ctx.fillStyle = col;
  if (p === 'stripe') for (let y = cy - 44; y < 96; y += 12) ctx.fillRect(0, y, 96, 5);
  else if (p === 'check') {
    ctx.globalAlpha = 0.55;
    for (let y = 0; y < 96; y += 10) for (let x = (y / 10) % 2 ? 10 : 0; x < 96; x += 20) ctx.fillRect(x, y, 10, 10);
    ctx.globalAlpha = 1;
  } else if (p === 'heart') {
    ctx.beginPath();
    heartPath(ctx, cx, cy, 12);
    ctx.fill();
  } else {
    const spots: [number, number][] = [[-12, -14], [12, -8], [-6, 6], [16, 12], [-16, 22], [6, 26], [26, -22], [-26, 0]];
    for (const [dx, dy] of spots) {
      const x = cx + dx, y = cy + dy;
      if (p === 'dots') dot(ctx, x, y, 3.5, col);
      else if (p === 'stars') {
        ctx.beginPath();
        starPath(ctx, x, y, 5.5, 2.4);
        ctx.fill();
      } else if (p === 'flower') {
        for (let k = 0; k < 5; k++) dot(ctx, x + Math.cos(k * 1.2566) * 3, y + Math.sin(k * 1.2566) * 3, 2.3, col);
        dot(ctx, x, y, 1.6, '#fff6c2');
      } else if (p === 'leaf') {
        ctx.beginPath();
        ell(ctx, x, y, 5, 2.4, -0.7);
        ctx.fill();
      }
    }
  }
}

/** Fill a garment outline, lay its pattern inside it, then outline it again. */
function garment(ctx: Ctx, spec: IconSpec, path: () => void, cx = 48, cy = 52): void {
  const F = css(spec.c), S = shade(spec.c, -0.35);
  blob(ctx, F, S, path);
  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  clothPattern(ctx, spec.p, css(spec.c2 ?? spec.c), cx, cy);
  ctx.restore();
  ctx.beginPath();
  path();
  ctx.lineWidth = 4;
  ctx.strokeStyle = S;
  ctx.stroke();
}

function line(ctx: Ctx, pts: number[], col: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k]!, pts[k + 1]!);
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Clothing icons drawn by shape, so a hoodie, a raincoat and a tee all look different. */
function drawClothing(ctx: Ctx, spec: IconSpec): boolean {
  const F = css(spec.c), F2 = css(spec.c2 ?? spec.c), S = shade(spec.c, -0.35), S2 = shade(spec.c2 ?? spec.c, -0.35), Fd = shade(spec.c, -0.15);
  const glass = 'rgba(220,240,255,0.7)';
  const longTop = (hem: number, flare: number) => () => {
    ctx.moveTo(32, 18);
    ctx.lineTo(16, 26);
    ctx.lineTo(10, 72);
    ctx.lineTo(22, 74);
    ctx.lineTo(28, 42);
    ctx.lineTo(28 - flare, hem);
    ctx.lineTo(68 + flare, hem);
    ctx.lineTo(68, 42);
    ctx.lineTo(74, 74);
    ctx.lineTo(86, 72);
    ctx.lineTo(80, 26);
    ctx.lineTo(64, 18);
    ctx.quadraticCurveTo(48, 30, 32, 18);
    ctx.closePath();
  };
  const tee = () => {
    ctx.moveTo(32, 18);
    ctx.lineTo(14, 30);
    ctx.lineTo(22, 44);
    ctx.lineTo(30, 40);
    ctx.lineTo(30, 80);
    ctx.lineTo(66, 80);
    ctx.lineTo(66, 40);
    ctx.lineTo(74, 44);
    ctx.lineTo(82, 30);
    ctx.lineTo(64, 18);
    ctx.quadraticCurveTo(48, 30, 32, 18);
    ctx.closePath();
  };
  const hood = (fill: string) => blob(ctx, fill, S, () => ell(ctx, 48, 20, 17, 9));
  const collar = (fill: string) => {
    blob(ctx, fill, S2, () => {
      ctx.moveTo(33, 18);
      ctx.lineTo(47, 29);
      ctx.lineTo(38, 33);
      ctx.closePath();
    }, 2);
    blob(ctx, fill, S2, () => {
      ctx.moveTo(63, 18);
      ctx.lineTo(49, 29);
      ctx.lineTo(58, 33);
      ctx.closePath();
    }, 2);
  };
  const legs = (top: number, hem: number) => () => {
    ctx.moveTo(28, top);
    ctx.lineTo(68, top);
    ctx.lineTo(72, hem);
    ctx.lineTo(54, hem);
    ctx.lineTo(48, top + 24);
    ctx.lineTo(42, hem);
    ctx.lineTo(24, hem);
    ctx.closePath();
  };
  const boot = (x: number, y: number, tall: number) => () => {
    ctx.moveTo(x - 10, y - tall);
    ctx.lineTo(x + 6, y - tall);
    ctx.lineTo(x + 6, y - 4);
    ctx.quadraticCurveTo(x + 24, y - 2, x + 24, y + 10);
    ctx.lineTo(x - 10, y + 10);
    ctx.closePath();
  };
  switch (spec.v) {
    // ---- tops
    case 'tee':
      garment(ctx, spec, tee, 48, 54);
      return true;
    case 'tank':
      garment(ctx, spec, () => {
        ctx.moveTo(32, 14);
        ctx.lineTo(40, 14);
        ctx.quadraticCurveTo(48, 30, 56, 14);
        ctx.lineTo(64, 14);
        ctx.quadraticCurveTo(64, 34, 70, 40);
        ctx.lineTo(70, 82);
        ctx.lineTo(26, 82);
        ctx.lineTo(26, 40);
        ctx.quadraticCurveTo(32, 34, 32, 14);
        ctx.closePath();
      }, 48, 56);
      return true;
    case 'hoodie':
      hood(Fd);
      garment(ctx, spec, longTop(80, 0), 48, 50);
      ctx.beginPath();
      rr(ctx, 36, 58, 24, 12, 4);
      ctx.strokeStyle = S;
      ctx.lineWidth = 3;
      ctx.stroke();
      line(ctx, [44, 27, 43, 42], F2, 3);
      line(ctx, [52, 27, 53, 42], F2, 3);
      return true;
    case 'sweater':
      garment(ctx, spec, longTop(80, 0), 48, 50);
      blob(ctx, F2, S2, () => rr(ctx, 28, 72, 40, 8, 3), 2);
      line(ctx, [32, 18, 40, 26, 48, 28, 56, 26, 64, 18], F2, 4);
      return true;
    case 'jacket':
      garment(ctx, spec, longTop(80, 0), 48, 50);
      line(ctx, [48, 28, 48, 80], S, 3);
      collar(F2);
      for (const x of [36, 60]) line(ctx, [x - 5, 60, x + 5, 60], S, 3);
      return true;
    case 'raincoat':
      hood(F);
      garment(ctx, spec, longTop(86, 4), 48, 52);
      line(ctx, [48, 28, 48, 86], S, 2);
      for (const y of [40, 54, 68]) blob(ctx, F2, S2, () => rr(ctx, 44, y - 2, 8, 5, 2), 2);
      return true;
    case 'buttonup':
      garment(ctx, spec, tee, 48, 54);
      collar(F2 === F ? '#fdfbf4' : F2);
      line(ctx, [48, 30, 48, 80], S, 2);
      for (const y of [40, 52, 64]) dot(ctx, 48, y, 2.6, S);
      return true;
    // ---- bottoms
    case 'pants':
      garment(ctx, spec, legs(16, 84), 48, 48);
      blob(ctx, F2, S2, () => rr(ctx, 28, 16, 40, 7, 2), 2);
      return true;
    case 'shorts':
      garment(ctx, spec, legs(24, 64), 48, 44);
      blob(ctx, F2, S2, () => rr(ctx, 28, 24, 40, 7, 2), 2);
      return true;
    case 'skirt':
      garment(ctx, spec, () => {
        ctx.moveTo(30, 24);
        ctx.lineTo(66, 24);
        ctx.lineTo(82, 74);
        ctx.quadraticCurveTo(48, 84, 14, 74);
        ctx.closePath();
      }, 48, 52);
      blob(ctx, F2, S2, () => rr(ctx, 29, 22, 38, 7, 2), 2);
      return true;
    case 'overalls':
      line(ctx, [36, 24, 30, 10], F, 5);
      line(ctx, [60, 24, 66, 10], F, 5);
      garment(ctx, spec, legs(42, 86), 48, 62);
      garment(ctx, spec, () => rr(ctx, 34, 20, 28, 26, 4), 48, 32);
      for (const x of [38, 58]) dot(ctx, x, 25, 3, F2);
      ctx.beginPath();
      rr(ctx, 40, 30, 16, 10, 2);
      ctx.strokeStyle = S;
      ctx.lineWidth = 2;
      ctx.stroke();
      return true;
    // ---- dresses
    case 'sundress':
      line(ctx, [39, 26, 37, 10], S, 3);
      line(ctx, [57, 26, 59, 10], S, 3);
      garment(ctx, spec, () => {
        ctx.moveTo(36, 24);
        ctx.lineTo(60, 24);
        ctx.lineTo(62, 40);
        ctx.lineTo(82, 84);
        ctx.lineTo(14, 84);
        ctx.lineTo(34, 40);
        ctx.closePath();
      }, 48, 60);
      blob(ctx, F2, S2, () => rr(ctx, 33, 37, 30, 6, 2), 2);
      return true;
    case 'puffdress':
      for (const x of [28, 68]) blob(ctx, F, S, () => ell(ctx, x, 26, 10, 9));
      garment(ctx, spec, () => {
        ctx.moveTo(36, 16);
        ctx.lineTo(60, 16);
        ctx.lineTo(62, 40);
        ctx.quadraticCurveTo(90, 66, 86, 86);
        ctx.lineTo(10, 86);
        ctx.quadraticCurveTo(6, 66, 34, 40);
        ctx.closePath();
      }, 48, 62);
      blob(ctx, F2, S2, () => rr(ctx, 33, 37, 30, 6, 2), 2);
      return true;
    case 'longdress':
      garment(ctx, spec, () => {
        ctx.moveTo(38, 10);
        ctx.lineTo(58, 10);
        ctx.lineTo(60, 34);
        ctx.lineTo(74, 90);
        ctx.lineTo(22, 90);
        ctx.lineTo(36, 34);
        ctx.closePath();
      }, 48, 58);
      blob(ctx, F2, S2, () => rr(ctx, 35, 31, 26, 6, 2), 2);
      return true;
    // ---- hats
    case 'cap':
      garment(ctx, spec, () => {
        ctx.moveTo(20, 62);
        ctx.quadraticCurveTo(20, 28, 48, 28);
        ctx.quadraticCurveTo(74, 28, 74, 62);
        ctx.closePath();
      }, 46, 46);
      blob(ctx, F2, S2, () => ell(ctx, 72, 63, 20, 6));
      dot(ctx, 48, 28, 4, F2);
      return true;
    case 'beanie':
      garment(ctx, spec, () => {
        ctx.moveTo(24, 64);
        ctx.quadraticCurveTo(24, 26, 48, 26);
        ctx.quadraticCurveTo(72, 26, 72, 64);
        ctx.closePath();
      }, 48, 46);
      blob(ctx, F2, S2, () => rr(ctx, 20, 58, 56, 14, 6));
      for (let x = 28; x <= 68; x += 8) line(ctx, [x, 61, x, 69], S2, 2);
      blob(ctx, F2, S2, () => ell(ctx, 48, 22, 9, 9));
      return true;
    case 'sunhat':
      blob(ctx, F, S, () => ell(ctx, 48, 62, 44, 12));
      garment(ctx, spec, () => {
        ctx.moveTo(28, 62);
        ctx.quadraticCurveTo(28, 32, 48, 32);
        ctx.quadraticCurveTo(68, 32, 68, 62);
        ctx.closePath();
      }, 48, 46);
      ctx.fillStyle = F2;
      ctx.fillRect(29, 50, 38, 7);
      for (let k = 0; k < 5; k++) dot(ctx, 62 + Math.cos(k * 1.2566) * 3.5, 53 + Math.sin(k * 1.2566) * 3.5, 2.8, '#ff9fb8');
      dot(ctx, 62, 53, 2, '#ffe27a');
      return true;
    case 'bucket':
      garment(ctx, spec, () => {
        ctx.moveTo(30, 30);
        ctx.lineTo(66, 30);
        ctx.lineTo(72, 60);
        ctx.lineTo(24, 60);
        ctx.closePath();
      }, 48, 44);
      blob(ctx, F, S, () => {
        ctx.moveTo(24, 58);
        ctx.lineTo(72, 58);
        ctx.lineTo(86, 74);
        ctx.lineTo(10, 74);
        ctx.closePath();
      });
      ctx.fillStyle = F2;
      ctx.fillRect(26, 51, 44, 6);
      return true;
    case 'beret':
      blob(ctx, F, S, () => rr(ctx, 45, 26, 6, 8, 2), 3);
      garment(ctx, spec, () => ell(ctx, 48, 50, 34, 17, -0.12), 48, 50);
      line(ctx, [22, 60, 74, 54], Fd, 3);
      return true;
    case 'crown':
      blob(ctx, F, S, () => {
        ctx.moveTo(20, 72);
        ctx.lineTo(20, 34);
        ctx.lineTo(34, 52);
        ctx.lineTo(48, 26);
        ctx.lineTo(62, 52);
        ctx.lineTo(76, 34);
        ctx.lineTo(76, 72);
        ctx.closePath();
      });
      for (const [x, y] of [[20, 32], [48, 24], [76, 32]] as const) dot(ctx, x, y, 4, F2);
      for (const [x, y] of [[34, 62], [48, 58], [62, 62]] as const) dot(ctx, x, y, 4.5, F2);
      highlight(ctx, 30, 46, 5);
      return true;
    case 'party':
      garment(ctx, spec, () => {
        ctx.moveTo(48, 14);
        ctx.lineTo(72, 78);
        ctx.quadraticCurveTo(48, 86, 24, 78);
        ctx.closePath();
      }, 48, 56);
      blob(ctx, F2, S2, () => ell(ctx, 48, 13, 7, 7), 3);
      return true;
    case 'bow':
      for (const sx of [-1, 1])
        blob(ctx, F, S, () => {
          ctx.moveTo(48, 50);
          ctx.quadraticCurveTo(48 + sx * 20, 22, 48 + sx * 34, 32);
          ctx.lineTo(48 + sx * 34, 68);
          ctx.quadraticCurveTo(48 + sx * 20, 78, 48, 50);
          ctx.closePath();
        });
      blob(ctx, F2, S2, () => rr(ctx, 41, 41, 14, 18, 5), 3);
      return true;
    case 'flowercrown':
      line(ctx, [10, 50, 28, 60, 48, 63, 68, 60, 86, 50], '#6fae5a', 7);
      for (let k = 0; k < 5; k++) {
        const x = 14 + k * 17, y = 50 + Math.sin((k / 4) * Math.PI) * 11;
        if (k < 4) blob(ctx, '#8fd18a', '#5f9a4e', () => ell(ctx, x + 9, y + 7, 7, 3.4, 0.4), 2);
        for (let a = 0; a < 5; a++) dot(ctx, x + Math.cos(a * 1.2566) * 6.5, y + Math.sin(a * 1.2566) * 6.5, 5.5, k % 2 ? F2 : F);
        dot(ctx, x, y, 3.6, '#ffe27a');
      }
      return true;
    // ---- glasses
    case 'round':
    case 'square':
    case 'star':
    case 'heart':
    case 'shades':
    case 'goggles': {
      const lens = spec.v === 'shades' ? '#3b3552' : glass;
      if (spec.v === 'goggles') line(ctx, [6, 50, 90, 50], F2, 8);
      for (const x of [30, 66])
        blob(ctx, lens, F, () => {
          if (spec.v === 'square' || spec.v === 'shades') rr(ctx, x - 15, 38, 30, 24, 6);
          else if (spec.v === 'star') starPath(ctx, x, 51, 17, 8);
          else if (spec.v === 'heart') heartPath(ctx, x, 50, 13);
          else ell(ctx, x, 50, spec.v === 'goggles' ? 16 : 15, spec.v === 'goggles' ? 16 : 14);
        }, spec.v === 'goggles' ? 6 : 5);
      if (spec.v === 'shades') for (const x of [24, 60]) line(ctx, [x, 44, x + 6, 44], 'rgba(255,255,255,0.6)', 3);
      ctx.beginPath();
      ctx.moveTo(44, 48);
      ctx.quadraticCurveTo(48, 42, 52, 48);
      ctx.strokeStyle = F;
      ctx.lineWidth = 5;
      ctx.stroke();
      return true;
    }
    // ---- shoes
    case 'sneakers':
      return false;
    case 'boots':
    case 'rainboots':
      for (const [x, y] of [[30, 52], [58, 66]] as const) {
        garment(ctx, spec, boot(x, y, 34), x + 4, y - 10);
        ctx.fillStyle = spec.v === 'boots' ? F2 : S;
        ctx.fillRect(x - 10, y + 6, 34, 5);
        if (spec.v === 'boots') blob(ctx, F2, S2, () => rr(ctx, x - 12, y - 36, 20, 7, 3), 2);
        else line(ctx, [x - 5, y - 28, x - 5, y - 10], 'rgba(255,255,255,0.55)', 3);
      }
      return true;
    case 'sandals':
      for (const [x, y] of [[28, 40], [56, 62]] as const) {
        for (const dx of [0, 16]) {
          ctx.beginPath();
          ctx.ellipse(x + dx, y + 4, 8, 12, 0, Math.PI, 0);
          ctx.strokeStyle = S;
          ctx.lineWidth = 9;
          ctx.stroke();
          ctx.strokeStyle = F;
          ctx.lineWidth = 6;
          ctx.stroke();
        }
        blob(ctx, F2, S2, () => rr(ctx, x - 14, y + 2, 46, 12, 6), 3);
      }
      return true;
    case 'slippers':
      for (const [x, y] of [[30, 46], [60, 62]] as const) {
        garment(ctx, spec, () => ell(ctx, x + 4, y + 2, 20, 11), x + 4, y + 2);
        blob(ctx, F2, S2, () => ell(ctx, x - 2, y - 4, 11, 6), 2);
        dot(ctx, x + 14, y - 4, 5, F2);
      }
      return true;
    // ---- bags
    case 'backpack':
      ctx.beginPath();
      ctx.ellipse(48, 26, 12, 10, 0, Math.PI, 0);
      ctx.strokeStyle = S;
      ctx.lineWidth = 5;
      ctx.stroke();
      garment(ctx, spec, () => rr(ctx, 22, 24, 52, 60, 16), 48, 50);
      blob(ctx, F2, S2, () => rr(ctx, 30, 56, 36, 22, 7), 3);
      line(ctx, [30, 62, 66, 62], S2, 2);
      return true;
    case 'satchel':
      ctx.beginPath();
      ctx.moveTo(22, 46);
      ctx.quadraticCurveTo(48, -4, 74, 46);
      ctx.strokeStyle = F2;
      ctx.lineWidth = 5;
      ctx.stroke();
      garment(ctx, spec, () => rr(ctx, 16, 42, 64, 42, 8), 48, 66);
      blob(ctx, Fd, S, () => {
        ctx.moveTo(16, 46);
        ctx.lineTo(80, 46);
        ctx.lineTo(80, 60);
        ctx.quadraticCurveTo(48, 70, 16, 60);
        ctx.closePath();
      }, 3);
      blob(ctx, F2, S2, () => rr(ctx, 43, 58, 10, 9, 2), 2);
      return true;
    case 'basket':
      ctx.beginPath();
      ctx.moveTo(24, 50);
      ctx.quadraticCurveTo(48, 0, 72, 50);
      ctx.strokeStyle = S;
      ctx.lineWidth = 6;
      ctx.stroke();
      blob(ctx, F, S, () => {
        ctx.moveTo(16, 46);
        ctx.lineTo(80, 46);
        ctx.lineTo(70, 84);
        ctx.lineTo(26, 84);
        ctx.closePath();
      });
      for (const y of [58, 70]) line(ctx, [20, y, 76, y], S, 2);
      for (let x = 30; x <= 66; x += 12) line(ctx, [x, 48, x - 1, 82], S, 2);
      blob(ctx, F2, S2, () => rr(ctx, 14, 42, 68, 8, 4), 2);
      return true;
    default:
      return false;
  }
}

export function iconSpecURL(spec: IconSpec, key?: string): string {
  const k = key ?? JSON.stringify(spec);
  const hit = cache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  drawIcon(ctx, spec);
  const url = cv.toDataURL('image/png');
  cache.set(k, url);
  return url;
}

export function iconURL(id: string): string {
  const def = item(id);
  if (def.cat === 'furniture' && thumbProvider) {
    const hit = cache.get('3d:' + id);
    if (hit) return hit;
    const url = thumbProvider(id);
    if (url) {
      cache.set('3d:' + id, url);
      return url;
    }
  }
  return iconSpecURL(def.icon, id);
}

export function iconImg(id: string, cls = 'icon'): HTMLImageElement {
  const img = document.createElement('img');
  img.className = cls;
  img.src = iconURL(id);
  img.alt = item(id).name;
  img.draggable = false;
  return img;
}
