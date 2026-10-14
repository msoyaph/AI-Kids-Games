/** npx tsx scripts/portrait-sheet.ts [out.png] — every named character's portrait in every expression (review). */
import { drawPortrait, PORTRAIT_EXPRS } from '../src/art/portraits';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { CAST, townsLook } from '../src/data/cast';
import { writePng } from './png';

const out = process.argv[2] ?? 'reports/tmp/portraits.png';
const looks = [...Object.values(CAST).map(c => c.look), ...['ana', 'bo', 'cy', 'dee'].map(s => townsLook(s))];
const sheet = new PixelCanvas(PORTRAIT_EXPRS.length * 36, looks.length * 36).fill(0xfbecd2);
looks.forEach((look, i) => PORTRAIT_EXPRS.forEach((e, j) => sheet.blit(drawPortrait(look, e), j * 36 + 2, i * 36 + 2)));
writePng(out, sheet, 3);
console.log(`wrote ${out}`);
