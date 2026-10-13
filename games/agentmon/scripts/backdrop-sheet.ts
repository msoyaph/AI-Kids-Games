/** npx tsx scripts/backdrop-sheet.ts [out.png] — every battle backdrop at every time of day, with two friends (review). */
import { BG_H, BG_W, drawBackdrop, GROUND_Y } from '../src/art/backdrops';
import { drawCreature } from '../src/art/creatures';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { DAY_TIMES } from '../src/core/world/daytime';
import { writePng } from './png';

const out = process.argv[2] ?? 'reports/tmp/backdrops.png';
const kinds = ['meadow', 'town', 'beach', 'forest', 'mountain', 'desert', 'snow', 'sky', 'cave', 'trial', 'indoor'] as const;
const sheet = new PixelCanvas(BG_W * DAY_TIMES.length, BG_H * kinds.length).fill(0);
kinds.forEach((k, i) => DAY_TIMES.forEach((time, j) => {
  const x = j * BG_W, y = i * BG_H;
  sheet.blit(drawBackdrop(k, time), x, y);
  sheet.blit(drawCreature('spinnet').flipped(), x + 50, y + GROUND_Y - 28);
  sheet.blit(drawCreature('kernip'), x + 160, y + GROUND_Y - 28);
}));
writePng(out, sheet, 1);
console.log(`wrote ${out}`);
