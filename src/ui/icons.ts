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
