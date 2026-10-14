/** npx tsx scripts/accessory-sheet.ts [out.png] [size] — every accessory on a spread of Agentmon shapes (review). */
import { dress } from '../src/art/accessories';
import { creatureFace, drawCreature } from '../src/art/creatures';
import { spritePad } from '../src/art/painter';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { ACCESSORIES } from '../src/data/accessories';
import { writePng } from './png';

const out = process.argv[2] ?? 'reports/tmp/accessories.png';
const size = Number(process.argv[3] ?? 64) as 32 | 64;
const ids = ['spinnet', 'druzling', 'buzzbill', 'lullatee', 'hailcastle', 'scarfpaw', 'zestle', 'puffbeetle', 'stonebloom', 'glimmerpod', 'chinspark', 'verdanyan'];
const cell = size + 2 * spritePad(size) + 2;
const sheet = new PixelCanvas(ACCESSORIES.length * cell, ids.length * cell).fill(0xfbecd2);
ids.forEach((id, i) => ACCESSORIES.forEach((a, j) => sheet.blit(dress(drawCreature(id, size), a, size, spritePad(size), creatureFace(id, size)), j * cell + 1, i * cell + 1)));
writePng(out, sheet, size === 64 ? 1 : 2);
console.log(`wrote ${out}`);
