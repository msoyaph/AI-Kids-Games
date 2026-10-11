import type { Trait } from '../data/traits';
import { t } from '../i18n';
import { h, img } from './dom';

const cache = new Map<string, string>();

/**
 * Small line-art glyphs for construct abilities (DOM data URLs). Shape carries
 * the meaning, colour is secondary (colour-blind safe).
 */
export function traitIconUrl(trait: Trait, size = 32): string {
  const key = `${trait}@${size}`;
  let url = cache.get(key);
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const s = size / 32;
  ctx.scale(s, s);
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const col = trait === 'boss' ? '#ff4d6a' : trait === 'repairs' ? '#3dffa0' : trait === 'ward' || trait === 'elemental' || trait === 'shifting' ? '#c49bff' : '#ffc845';
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  const path = (pts: [number, number][], close = false): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (close) ctx.closePath();
    ctx.stroke();
  };
  switch (trait) {
    case 'boss': // crown
      path([[6, 23], [6, 11], [12, 17], [16, 8], [20, 17], [26, 11], [26, 23]], true);
      break;
    case 'flying': // wing
      path([[5, 20], [13, 11], [27, 8], [22, 14], [27, 15], [20, 20], [24, 22], [5, 20]]);
      break;
    case 'fast': // double chevron
      path([[7, 8], [14, 16], [7, 24]]);
      path([[16, 8], [23, 16], [16, 24]]);
      break;
    case 'armored': // shield
      path([[16, 5], [26, 9], [24, 20], [16, 27], [8, 20], [6, 9]], true);
      path([[16, 9], [16, 23]]);
      break;
    case 'ward': // hexagon
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = 16 + Math.cos(a) * 10;
        const y = 16 + Math.sin(a) * 10;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(16, 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'repairs': // plus
      path([[16, 6], [16, 26]]);
      path([[6, 16], [26, 16]]);
      break;
    case 'splits': // three diverging arrows
      path([[16, 26], [16, 14]]);
      path([[16, 14], [8, 6]]);
      path([[16, 14], [24, 6]]);
      path([[16, 14], [16, 5]]);
      break;
    case 'shifting': // cycle arrows
      ctx.beginPath();
      ctx.arc(16, 16, 9, -0.3, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(16, 16, 9, Math.PI * 0.95 + 0.1, Math.PI * 1.9);
      ctx.stroke();
      path([[24, 10], [25, 15], [20, 14]]);
      break;
    case 'elemental': // diamond core
      path([[16, 5], [26, 16], [16, 27], [6, 16]], true);
      ctx.beginPath();
      ctx.arc(16, 16, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** Chip with the trait glyph and its name. */
export function traitChip(trait: Trait): HTMLElement {
  return h('span.chip.trait', null, img(traitIconUrl(trait, 28), ''), t(`trait.${trait}`));
}
