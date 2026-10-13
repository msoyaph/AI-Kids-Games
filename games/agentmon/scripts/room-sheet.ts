/** npx tsx scripts/room-sheet.ts [trialId] — render Trial rooms with their pieces (review). */
import { bakeRoom, block, colorGate, colorSwitch, crystal, door, emitter, iceBlock, mirror, platformSprite, vineWall } from '../src/art/trial-art';
import { drawCharacter, playerLook } from '../src/art/characters';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { parseRoom, platformTiles, traceBeams } from '../src/core/puzzle/puzzle';
import { TRIALS } from '../src/data/trials';
import { writePng } from './png';

const only = process.argv[2];
const list = TRIALS.filter(t => !only || t.id === only);
const rooms = list.flatMap(t => t.rooms.map(r => ({ t, r })));
const cellW = 13 * 16 + 8, cellH = 11 * 16 + 8, cols = 4;
const sheet = new PixelCanvas(cellW * cols, cellH * Math.ceil(rooms.length / cols)).fill(0x20203a);
rooms.forEach(({ t, r }, i) => {
  const room = parseRoom(r);
  const ox = (i % cols) * cellW + 4, oy = Math.floor(i / cols) * cellH + 4;
  sheet.blit(bakeRoom(room, t.theme), ox, oy);
  const beams = traceBeams(room, room.start);
  for (const b of beams.path) { const x = (b.i % room.w) * 16 + ox, y = Math.floor(b.i / room.w) * 16 + oy; if (b.dir === 0 || b.dir === 3) sheet.rect(x + 7, y, 2, 16, 0xfff3b0); else sheet.rect(x, y + 7, 16, 2, 0xfff3b0); }
  room.grid.forEach((ch, k) => {
    const x = (k % room.w) * 16 + ox, y = Math.floor(k / room.w) * 16 + oy;
    if (ch === 'p' || ch === 't' || ch === 'y') sheet.blit(colorSwitch(ch), x, y);
    if (ch === 'P' || ch === 'T' || ch === 'Y') sheet.blit(colorGate(ch.toLowerCase() as 'p', false), x, y);
    if (ch === 'D') sheet.blit(door(false, t.theme), x, y);
    if (ch === 'L') sheet.blit(emitter((r.emitters ?? []).find(e => e.y * room.w + e.x === k)?.dir ?? 2), x, y);
    if (ch === '/' || ch === '\\') sheet.blit(mirror(ch, false), x, y);
    if (ch === 'm') sheet.blit(mirror('/', true), x, y);
    if (ch === 'n') sheet.blit(mirror('\\', true), x, y);
    if (ch === 'C') sheet.blit(crystal(beams.lit.has(k)), x, y);
    if (ch === 'V') sheet.blit(vineWall(), x, y);
    if (ch === 'I') sheet.blit(iceBlock(), x, y);
  });
  for (const pt of platformTiles(room, 0)) sheet.blit(platformSprite(t.theme), (pt % room.w) * 16 + ox, Math.floor(pt / room.w) * 16 + oy);
  for (const b of room.start.blocks) sheet.blit(block(t.theme), (b % room.w) * 16 + ox, Math.floor(b / room.w) * 16 + oy);
  sheet.blit(drawCharacter(playerLook(1, 0, 0, 0), 0, 0), room.start.x * 16 + ox, room.start.y * 16 + oy - 8);
});
writePng(`reports/tmp/rooms${only ? `-${only}` : ''}.png`, sheet, 2);
console.log(rooms.length, 'rooms');
