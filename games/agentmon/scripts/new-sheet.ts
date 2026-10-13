/**
 * Review sheet of the Agentmon 1.1 drafts (node only):
 *   npx tsx scripts/new-sheet.ts [out.png] [--poses] [--shimmer]
 */
import { NEW_RECIPES } from '../src/art/creatures-new';
import { Painter, POSES, WHITE } from '../src/art/painter';
import { hueShift, PixelCanvas } from '../src/art/pixelcanvas';
import { drawNumber, writePng } from './png';

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--')) ?? 'reports/tmp/new-creatures.png';
const posesMode = args.includes('--poses');
const shimmer = args.includes('--shimmer');
const ids = Object.keys(NEW_RECIPES);
const draw = (id: string, size: 16 | 32, pose: string) => {
  const p = new Painter(size);
  NEW_RECIPES[id]!(p, POSES[pose]!);
  if (shimmer) p.recolor(c => (c === WHITE ? c : hueShift(c, 150)));
  return p.finish();
};
const cell = 40;
const poses = posesMode ? Object.keys(POSES) : ['idle'];
const cols = posesMode ? poses.length + 1 : 9;
const rows = posesMode ? ids.length : Math.ceil(ids.length / cols);
const sheet = new PixelCanvas(cols * cell, rows * cell).fill(0x3a3656);
ids.forEach((id, i) => {
  if (posesMode) {
    poses.forEach((pose, j) => sheet.blit(draw(id, 32, pose), j * cell + 4, i * cell + 6));
    sheet.blit(draw(id, 16, 'idle'), poses.length * cell + 12, i * cell + 14);
    drawNumber(sheet, 53 + i, 1, i * cell + 1);
  } else {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    sheet.blit(draw(id, 32, 'idle'), x + 4, y + 6);
    drawNumber(sheet, 53 + i, x + 1, y + 1);
  }
});
writePng(out, sheet, 4);
console.log(`wrote ${out} (${ids.length} drafts)`);
