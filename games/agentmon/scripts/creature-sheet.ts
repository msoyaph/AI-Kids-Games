/**
 * Review sheet of every Agentmon (node only):
 *   npx tsx scripts/creature-sheet.ts [out.png] [--poses] [--small] [--shimmer]
 * Default: all 52 at 32×32 in Field Guide order, numbered, 4× scale.
 */
import { drawCreature } from '../src/art/creatures';
import { POSES } from '../src/art/painter';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { SPECIES_LIST } from '../src/data/species';
import { drawNumber, writePng } from './png';

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--')) ?? 'reports/tmp/creatures.png';
const posesMode = args.includes('--poses');
const small = args.includes('--small');
const shimmer = args.includes('--shimmer');
const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',');

const list = only ? SPECIES_LIST.filter(s => only.includes(s.id)) : SPECIES_LIST;
const poses = posesMode ? Object.keys(POSES) : ['idle'];
const cell = 40;
const cols = posesMode ? poses.length * (small ? 2 : 1) : 8;
const rows = posesMode ? list.length : Math.ceil(list.length / cols);
const sheet = new PixelCanvas(cols * cell, rows * cell);
sheet.fill(0x3a3656);
list.forEach((s, i) => {
  if (posesMode) {
    poses.forEach((name, j) => {
      const pc = drawCreature(s.id, 32, POSES[name]!, shimmer);
      sheet.blit(pc, j * cell + 4, i * cell + 6);
      if (small) sheet.blit(drawCreature(s.id, 16, POSES[name]!, shimmer), (poses.length + j) * cell + 12, i * cell + 14);
    });
    drawNumber(sheet, s.num, 1, i * cell + 1);
  } else {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    const pc = drawCreature(s.id, small ? 16 : 32, POSES.idle!, shimmer);
    sheet.blit(pc, x + (small ? 12 : 4), y + (small ? 14 : 6));
    drawNumber(sheet, s.num, x + 1, y + 1);
  }
});
writePng(out, sheet, 4);
console.log(`wrote ${out} (${list.length} Agentmon)`);
