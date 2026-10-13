/** npx tsx scripts/backdrop-sheet.ts — every battle backdrop with two friends on it (review). */
import { BG_H, BG_W, drawBackdrop, GROUND_Y } from '../src/art/backdrops';
import { drawCreature } from '../src/art/creatures';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { writePng } from './png';

const kinds = ['meadow', 'beach', 'forest', 'cave', 'mountain', 'desert', 'snow', 'sky', 'trial', 'town', 'indoor'] as const;
const sheet = new PixelCanvas(BG_W * 3, BG_H * 4).fill(0);
kinds.forEach((k, i) => {
  const bg = drawBackdrop(k);
  const x = (i % 3) * BG_W, y = Math.floor(i / 3) * BG_H;
  sheet.blit(bg, x, y);
  sheet.blit(drawCreature('spinnet').flipped(), x + 50, y + GROUND_Y - 28);
  sheet.blit(drawCreature('kernip'), x + 160, y + GROUND_Y - 28);
});
writePng('reports/tmp/backdrops.png', sheet, 2);
console.log('ok');
