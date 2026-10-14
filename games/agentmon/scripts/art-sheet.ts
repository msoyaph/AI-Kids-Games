/** npx tsx scripts/art-sheet.ts <what> [out.png] — review sheets: chars | icons | props | ground | battle */
import { drawCharacter, type CharLook } from '../src/art/characters';
import { elementIcon, itemIcon, statusIcon } from '../src/art/icons';
import { PixelCanvas } from '../src/art/pixelcanvas';
import { ELEMENTS, STATUSES } from '../src/core/types';
import { ITEMS } from '../src/data/items';
import { writePng } from './png';
import { bakeGround, tallGrassTuft } from '../src/art/ground';
import { beacon, boulder, bush, caveMouth, crate, fence, flowerPot, house, iceWall, lamp, lighthouse, lureTower, machine, rock, sign, stairsDown, tree, vines, bench } from '../src/art/props';
import { P } from '../src/art/palette';
import { TER_BY_CHAR } from '../src/data/terrain';

const what = process.argv[2] ?? 'chars';
const out = process.argv[3] ?? `reports/tmp/${what}.png`;
let sheet: PixelCanvas;
if (what === 'chars') {
  const looks: CharLook[] = [
    { skin: 0, hair: 0, hairColor: 0, outfit: 0, agent: true },
    { skin: 3, hair: 1, hairColor: 3, outfit: 1, agent: true },
    { skin: 5, hair: 3, hairColor: 0, outfit: 2, agent: true },
    { skin: 2, hair: 2, hairColor: 4, outfit: 4, agent: true },
    { skin: 1, hair: 4, hairColor: 5, outfit: 5, glasses: true, coat: 0xf2f0ec, elder: true },
    { skin: 4, hair: 5, hairColor: 2, outfit: 3, hat: 'cap', hatColor: 0x4f7fd9, kid: true },
    { skin: 0, hair: 7, hairColor: 6, outfit: 6, hat: 'sunhat', hatColor: 0xffd84a },
    { skin: 3, hair: 6, hairColor: 1, outfit: 7, scarf: 0xd9604f, hat: 'beanie', hatColor: 0x9a5fb8 },
  ];
  sheet = new PixelCanvas(4 * 3 * 20, looks.length * 28).fill(0x74c464);
  looks.forEach((look, i) => { for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) sheet.blit(drawCharacter(look, d, f), (d * 3 + f) * 20 + 2, i * 28 + 2); });
} else if (what === 'scene') {
  // a small test scene: a town corner by the sea, a route, a cliff and a cave
  const rows = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~ssssssssssssss~~~~~~~~~~~',
    '~~~~ssssssssss..ssssssss~~~~~~~~',
    '~~sssss.......:....sssssss~~~~~~',
    '~ss.......====:=====....ssss~~~~',
    'ss......=======:=====.....sss~~~',
    's..""..=========:====......ss~~~',
    '...""..=========:=====......s~~~',
    '.......====:::::::====.......s~~',
    '.......====:==========.........#',
    '..,,,,.....:..............###.##',
    '.,,,,,,....:.............####.##',
    '.,,,,,,,...:::::::::.....#####..',
    '..,,,,,,...........::....####..c',
    '...,,,,.............::...###..cc',
    '*****.....bbbb.......:.......ccc',
    '*iiii*....~~~~........:...ccccdd',
  ];
  const ground = bakeGround({ w: rows[0]!.length, h: rows.length, at: (x, y) => TER_BY_CHAR[rows[y]![x]!] ?? 'grass' });
  sheet = ground;
  sheet.blit(house(4, 3, { roof: P.roofRed, wall: P.wallCream }, 1, 'home'), 8 * 16, 1 * 16 + 4);
  sheet.blit(house(3, 3, { roof: P.roofGreen, wall: P.wallWhite }, 1, 'rest'), 15 * 16, 1 * 16 + 4);
  sheet.blit(house(3, 3, { roof: P.roofBlue, wall: P.wallPeach }, 1, 'shop'), 18 * 16, 4 * 16 + 4);
  for (const [x, y, k] of [[1, 7, 'round'], [3, 9, 'round'], [0, 12, 'pine'], [6, 14, 'blossom'], [24, 10, 'autumn'], [27, 13, 'palm'], [2, 15, 'snowpine']] as const) sheet.blit(tree(k, x * 7 + y), x * 16 - 4, y * 16 - 16);
  for (let x = 2; x < 7; x++) for (let y = 11; y < 16; y++) if (rows[y]![x] === ',') sheet.blit(tallGrassTuft(0), x * 16, y * 16);
  sheet.blit(sign(), 12 * 16, 9 * 16).blit(lamp(), 14 * 16, 7 * 16).blit(bush(1, true), 22 * 16, 12 * 16).blit(rock(3), 21 * 16, 14 * 16);
  sheet.blit(boulder(), 17 * 16, 15 * 16).blit(vines(), 18 * 16, 15 * 16).blit(iceWall(), 5 * 16, 16 * 16).blit(machine(true), 25 * 16, 16 * 16);
  sheet.blit(beacon(true), 4 * 16, 1 * 16 + 8).blit(beacon(false), 26 * 16, 1 * 16 + 8).blit(lighthouse(true), 1 * 16, -16).blit(lureTower(true), 22 * 16, -8);
  sheet.blit(caveMouth(), 28 * 16, 9 * 16).blit(fence('h'), 12 * 16, 13 * 16).blit(fence('h'), 13 * 16, 13 * 16).blit(flowerPot(2), 7 * 16, 9 * 16).blit(crate(), 23 * 16, 5 * 16).blit(bench(), 16 * 16, 10 * 16).blit(stairsDown(), 30 * 16, 16 * 16);
} else {
  const items = Object.keys(ITEMS);
  sheet = new PixelCanvas(16 * 16, 16 * 4).fill(0x3a3656);
  ELEMENTS.forEach((e, i) => { sheet.blit(elementIcon(e), i * 16 + 2, 2); sheet.blit(elementIcon(e, true), i * 16 + 2, 18); });
  STATUSES.forEach((s, i) => sheet.blit(statusIcon(s), (i + 9) * 16 + 2, 2));
  items.forEach((id, i) => sheet.blit(itemIcon(id), (i % 16) * 16 + 2, 34 + Math.floor(i / 16) * 14));
}
writePng(out, sheet, 4);
console.log('wrote', out);
