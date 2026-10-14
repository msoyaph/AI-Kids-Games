/**
 * Review sheet: each Agentmon at 32 px (shown at 2×) beside its 64 px battle sprite (node only):
 *   npx tsx scripts/size-compare.ts [out.png] [id ...]
 */
import { drawCreature } from '../src/art/creatures';
import { POSES, spritePad } from '../src/art/painter';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { writePng } from './png';

const args = process.argv.slice(2);
const out = args.find(a => a.endsWith('.png')) ?? 'reports/tmp/size-compare.png';
const ids = args.filter(a => !a.endsWith('.png'));
const list = ids.length ? ids : ['spinnet', 'druzling', 'buzzbill', 'lullatee', 'hailcastle', 'puffbeetle', 'stonebloom', 'pyrolanterne'];
const poses = ['idle', 'blink', 'happy', 'hit', 'nap'];
const up2 = (pc: PixelCanvas) => {
  const o = new PixelCanvas(pc.w * 2, pc.h * 2);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.px[y * o.w + x] = pc.px[(y >> 1) * pc.w + (x >> 1)]!;
  return o;
};
const pad = spritePad(64), cell = 64 + 2 * pad + 2;
const sheet = new PixelCanvas((poses.length + 1) * cell, list.length * cell).fill(0x3a3656);
list.forEach((id, i) => {
  sheet.blit(up2(drawCreature(id, 32)), pad + 1, i * cell + pad + 1);
  poses.forEach((pose, j) => sheet.blit(drawCreature(id, 64, POSES[pose]!), (j + 1) * cell + 1, i * cell + 1));
});
writePng(out, sheet, 2);
console.log(`wrote ${out}`);
