import type { AbilityId } from '../data/heroes';
import type { HeroSpecialKind } from '../data/tuning';

const cache = new Map<string, string>();

/** Line-art glyphs for commander abilities and hero specials (DOM data URLs). */
export function commandIconUrl(kind: AbilityId | HeroSpecialKind, color: string, size = 48): string {
  const key = `${kind}:${color}@${size}`;
  let url = cache.get(key);
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.scale(size / 32, size / 32);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (pts: [number, number][], close = false): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (close) ctx.closePath();
    ctx.stroke();
  };
  switch (kind) {
    case 'meteor':
      // falling crystal with trail
      line([[6, 6], [15, 15]]);
      line([[10, 4], [17, 11]]);
      line([[4, 10], [11, 17]]);
      line([[18, 13], [26, 18], [22, 27], [13, 23]], true);
      break;
    case 'chrono':
      ctx.beginPath();
      ctx.arc(16, 17, 10, 0, Math.PI * 2);
      ctx.stroke();
      line([[16, 17], [16, 10]]);
      line([[16, 17], [21, 20]]);
      line([[12, 4], [20, 4]]);
      break;
    case 'funds':
      line([[16, 4], [26, 10], [26, 22], [16, 28], [6, 22], [6, 10]], true);
      line([[11, 12], [16, 21], [21, 12]]);
      break;
    case 'rally':
      line([[8, 26], [8, 6]]);
      line([[8, 6], [24, 10], [8, 15]]);
      line([[14, 26], [20, 20], [26, 26]]);
      break;
    case 'quake':
      line([[4, 22], [10, 16], [14, 22], [19, 12], [23, 20], [28, 14]]);
      line([[6, 28], [26, 28]]);
      break;
    case 'mark':
      ctx.beginPath();
      ctx.arc(16, 16, 9, 0, Math.PI * 2);
      ctx.stroke();
      line([[16, 3], [16, 9]]);
      line([[16, 23], [16, 29]]);
      line([[3, 16], [9, 16]]);
      line([[23, 16], [29, 16]]);
      ctx.beginPath();
      ctx.arc(16, 16, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'repair':
      line([[9, 23], [20, 12]]);
      ctx.beginPath();
      ctx.arc(23, 9, 5, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();
      line([[6, 26], [9, 23]]);
      line([[22, 22], [22, 28]]);
      line([[19, 25], [25, 25]]);
      break;
  }
  url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
