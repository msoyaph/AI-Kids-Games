/**
 * The first 52 Agentmon as drawing recipes (the 1.1 ones are in creatures-more.ts) (32×32 design space, ground at y≈30, facing left; the battle
 * scene mirrors the player's side). Each recipe draws the body, calls p.shade(), then the face in
 * the given pose. Designs are original and reviewed for lookalikes (games/agentmon/CLAUDE.md, IP log).
 */
import { darken, hueShift, lighten, mix, type PixelCanvas } from './pixelcanvas';
import { Painter, POSES, WHITE, type Pose } from './painter';
import { NEW_RECIPES } from './creatures-more';

type Recipe = (p: Painter, pose: Pose) => void;

const C = {
  ink: 0x2a1f3d,
  cream: 0xfff3d6,
  white: 0xf8fbff,
  pink: 0xff9bb0,
};

// ---------------------------------------------------------------------------------------------
// Gust: maple seeds
const SEED = 0xc98a4b, MAPLE_WING = 0x9fe0b8, MAPLE_VEIN = 0x5fae86, AUTUMN = 0xf08a4b, AUTUMN_VEIN = 0xc0582a;

const spinnet: Recipe = (p, pose) => {
  p.poly([[13, 14], [19, 7], [26, 2], [30, 5], [27, 12], [20, 18]], MAPLE_WING);
  p.line(16, 14, 28, 4, MAPLE_VEIN).line(19, 15, 28, 8, MAPLE_VEIN);
  p.ellipse(9, 29, 2, 1.5, darken(SEED, 0.2)).ellipse(15, 29, 2, 1.5, darken(SEED, 0.2));
  p.ellipse(12, 21, 8, 7.5, SEED);
  p.shade();
  p.eyes(7, 17, 7, 3, pose).mouth(11, 24, pose).blush(5, 22).blush(16, 22);
};

const twirlwing: Recipe = (p, pose) => {
  // two seed wings out to the sides and a little down, like a propeller
  p.poly([[8, 18], [3, 20], [0, 24], [2, 26], [8, 22]], MAPLE_WING);
  p.poly([[24, 18], [29, 20], [32, 24], [30, 26], [24, 22]], MAPLE_WING);
  p.line(8, 19, 1, 25, MAPLE_VEIN).line(24, 19, 31, 25, MAPLE_VEIN);
  p.ellipse(12, 29, 2, 1.5, darken(SEED, 0.2)).ellipse(19, 29, 2, 1.5, darken(SEED, 0.2));
  p.ellipse(16, 19, 9, 9, SEED);
  p.paintEllipse(16, 24, 6, 3.5, lighten(SEED, 0.25));
  p.ellipse(16, 10, 2.5, 1.5, darken(SEED, 0.15));
  p.shade();
  p.eyes(10, 15, 8, 3, pose).mouth(15, 22, pose).blush(8, 20).blush(20, 20);
};

const maplegale: Recipe = (p, pose) => {
  // a long two-blade rotor on top, spinning in the wind, and a maple-leaf collar
  p.stroke([[25, 30], [29, 26], [27, 22], [30, 18]], 1, 0xc9f2e0);
  p.poly([[16, 7], [3, 3], [0, 6], [4, 8], [15, 9]], AUTUMN).poly([[16, 7], [29, 3], [32, 6], [28, 8], [17, 9]], AUTUMN);
  p.line(15, 8, 2, 5, AUTUMN_VEIN).line(17, 8, 30, 5, AUTUMN_VEIN);
  p.dot(1, 1, 0xd8fff1).dot(3, 0, 0xd8fff1).dot(29, 0, 0xd8fff1).dot(31, 1, 0xd8fff1);
  p.ellipse(16, 8, 2, 2, darken(SEED, 0.15));
  p.ellipse(11, 30, 2.5, 1.5, darken(SEED, 0.2)).ellipse(21, 30, 2.5, 1.5, darken(SEED, 0.2));
  p.ellipse(16, 20, 9, 9.5, SEED);
  p.poly([[16, 21], [8, 22], [10, 25], [7, 28], [12, 27], [16, 30], [20, 27], [25, 28], [22, 25], [24, 22]], AUTUMN);
  p.line(16, 22, 16, 29, AUTUMN_VEIN);
  p.shade();
  p.eyes(11, 14, 7, 3, pose).mouth(15, 19, pose).blush(9, 18).blush(21, 18);
};

// ---------------------------------------------------------------------------------------------
// Stone: geodes
const ROCK = 0xb59a7e, ROCK_D = 0x8f765f, AME = 0xb07ae8, AME_L = 0xdcb6ff, QUARTZ = 0xf2ecf8;

const druzling: Recipe = (p, pose) => {
  // a plain pebble with a crack across its tummy where purple crystals peek out
  p.ellipse(10, 29, 2.5, 1.5, ROCK_D).ellipse(20, 29, 2.5, 1.5, ROCK_D);
  p.ellipse(15, 19, 11, 10, ROCK);
  p.dot(22, 13, lighten(ROCK, 0.2)).dot(7, 16, ROCK_D).dot(23, 23, ROCK_D);
  p.shade();
  p.poly([[8, 24], [11, 22], [13, 25], [16, 22], [19, 25], [22, 22], [23, 25], [20, 27.5], [10, 27.5]], AME);
  p.poly([[11, 24], [13, 23], [13, 26]], AME_L).poly([[17, 24], [19, 23], [19, 26]], AME_L);
  p.shine(12, 24).shine(18, 24);
  p.eyes(9, 14, 8, 3, pose).mouth(14, 20, pose).blush(7, 19).blush(21, 19);
};

const druzette: Recipe = (p, pose) => {
  // its tummy has opened into a geode window, lined with sparkly crystals
  p.ellipse(8, 29, 2.5, 1.5, ROCK_D).ellipse(23, 29, 2.5, 1.5, ROCK_D);
  p.ellipse(3, 19, 2.5, 3, ROCK).ellipse(29, 19, 2.5, 3, ROCK);
  p.ellipse(16, 18, 13, 11, ROCK);
  p.dot(25, 10, lighten(ROCK, 0.2)).dot(6, 12, ROCK_D);
  p.shade();
  p.ellipse(16, 22, 7.5, 5.5, ROCK_D);
  p.ellipse(16, 22, 6.5, 4.5, QUARTZ);
  p.ellipse(16, 22.5, 5, 3.2, AME);
  p.poly([[12, 24], [13, 20], [15, 24]], AME_L).poly([[16, 25], [17.5, 20], [19, 25]], AME_L).poly([[19, 23], [20, 21], [21, 24]], AME_L);
  p.shine(13, 21).shine(17, 21);
  p.eyes(9, 11, 9, 3, pose).mouth(15, 16, pose).blush(7, 15).blush(23, 15);
};

const druzarch: Recipe = (p, pose) => {
  // a cut-open geode shell stands behind it like a shield, glittering inside
  p.ellipse(16, 14, 15, 13, ROCK_D);
  p.ellipse(16, 14, 13.5, 11.5, QUARTZ);
  p.ellipse(16, 14, 12, 10, AME);
  for (const [x, y] of [[6, 10], [9, 5], [14, 3], [19, 3], [24, 5], [27, 10], [5, 16], [27, 16]] as const) p.poly([[x - 1.5, y + 2], [x, y - 2], [x + 1.5, y + 2]], AME_L);
  p.ellipse(9, 29, 4, 2.5, ROCK_D).ellipse(23, 29, 4, 2.5, ROCK_D);
  p.ellipse(16, 21, 10, 8.5, ROCK);
  p.ellipse(6, 23, 3, 3.5, ROCK).ellipse(26, 23, 3, 3.5, ROCK);
  p.paintEllipse(16, 25, 6, 3, lighten(ROCK, 0.15));
  p.shade();
  p.shine(9, 6).shine(20, 4).shine(26, 9);
  p.eyes(10, 17, 9, 3, pose).mouth(15, 23, pose).blush(8, 21).blush(23, 21);
};

// ---------------------------------------------------------------------------------------------
// Volt: platypuses
const PLAT = 0x9a6440, PLAT_L = 0xc9915f, BILL = 0xf5c830, BILL_D = 0xc79a12, SPARK = 0xfff07a;

const zigzag = (p: Painter, x: number, y: number, w: number, c: number) => {
  for (let i = 0; i < w; i++) p.dot(x + i, y + (i % 2), c);
};

const buzzbill: Recipe = (p, pose) => {
  p.poly([[20, 24], [30, 22], [31, 28], [21, 29]], darken(PLAT, 0.1));
  zigzag(p, 23, 25, 6, BILL);
  p.ellipse(10, 29, 2.5, 1.5, darken(PLAT, 0.2)).ellipse(19, 29, 2.5, 1.5, darken(PLAT, 0.2));
  p.ellipse(15, 21, 9, 8, PLAT);
  p.paintEllipse(15, 25, 6, 3.5, PLAT_L);
  // flat bill with a zigzag edge
  p.ellipse(6, 22, 6, 3, BILL);
  zigzag(p, 1, 24, 10, BILL_D);
  p.dot(3, 21, BILL_D).dot(5, 21, BILL_D);
  p.shade();
  p.eyes(9, 15, 7, 3, pose).blush(14, 19);
  if (pose.mouth === 'open' || pose.mouth === 'o') p.mouth(6, 25, pose);
};

const zipbill: Recipe = (p, pose) => {
  p.poly([[20, 21], [31, 17], [31, 25], [22, 27]], darken(PLAT, 0.1));
  zigzag(p, 23, 22, 7, BILL);
  p.ellipse(9, 29, 2.5, 1.5, darken(PLAT, 0.2)).ellipse(20, 29, 2.5, 1.5, darken(PLAT, 0.2));
  p.ellipse(15, 21, 10, 8, PLAT);
  p.poly([[12, 13], [15, 15], [17, 13], [20, 15], [22, 14]], BILL);
  p.paintEllipse(14, 25, 7, 3.5, PLAT_L);
  p.ellipse(5, 20, 6, 3, BILL);
  zigzag(p, 0, 22, 10, BILL_D);
  p.shade();
  p.eyes(9, 13, 7, 3, pose).blush(14, 18);
  if (pose.mouth === 'open' || pose.mouth === 'o') p.mouth(5, 23, pose);
};

const voltabill: Recipe = (p, pose) => {
  // standing tall, surfing a storm wave
  p.poly([[1, 29], [8, 25], [22, 25], [31, 29], [26, 31], [5, 31]], 0x7fc6f2);
  p.poly([[19, 17], [30, 9], [31, 17], [22, 22]], darken(PLAT, 0.1));
  zigzag(p, 22, 13, 8, BILL);
  p.dot(29, 8, SPARK).dot(31, 11, SPARK).dot(27, 7, SPARK);
  p.ellipse(10, 25, 2.5, 2, darken(PLAT, 0.2)).ellipse(20, 25, 2.5, 2, darken(PLAT, 0.2));
  p.ellipse(15, 17, 9, 9, PLAT);
  p.paintEllipse(14, 21, 6, 4.5, PLAT_L);
  p.poly([[11, 9], [14, 11], [16, 8], [19, 11], [21, 9]], BILL);
  p.ellipse(5, 14, 6, 3, BILL);
  zigzag(p, 0, 16, 10, BILL_D);
  p.ellipse(7, 21, 2, 1.5, PLAT).ellipse(23, 20, 2, 1.5, PLAT);
  p.shade();
  p.eyes(9, 8, 7, 3, pose).blush(14, 12);
  if (pose.mouth === 'open' || pose.mouth === 'o') p.mouth(5, 17, pose);
};

// ---------------------------------------------------------------------------------------------
// Flare: popcorn
const KERNEL = 0xf2b33d, KERNEL_D = 0xd18a22, PUFF = 0xfff6e2, BUTTER = 0xfff0b8, EMBER = 0xff7a3d;

const puffCloud = (p: Painter, cx: number, cy: number, r: number, c: number) => {
  p.circle(cx - r * 0.8, cy + r * 0.2, r * 0.75, c).circle(cx + r * 0.8, cy + r * 0.2, r * 0.75, c).circle(cx, cy - r * 0.35, r * 0.85, c).circle(cx, cy + r * 0.35, r * 0.8, c);
};

const kernip: Recipe = (p, pose) => {
  p.ellipse(11, 29, 2, 1.5, KERNEL_D).ellipse(18, 29, 2, 1.5, KERNEL_D);
  p.poly([[15, 30], [7, 26], [6, 18], [10, 13], [20, 13], [24, 18], [23, 26]], KERNEL);
  p.paintPoly([[15, 30], [12, 28], [18, 28]], 0xffe08a);
  puffCloud(p, 15, 10, 6, PUFF);
  p.shade();
  p.eyes(9, 17, 7, 3, pose).mouth(13, 23, pose).blush(8, 22).blush(18, 22);
};

const poplet: Recipe = (p, pose) => {
  p.ellipse(10, 29, 2.5, 1.5, KERNEL_D).ellipse(21, 29, 2.5, 1.5, KERNEL_D);
  puffCloud(p, 16, 19, 11, PUFF);
  p.paintEllipse(16, 13, 9, 4, BUTTER);
  p.ellipse(16, 6, 4, 2.5, KERNEL).poly([[13, 6], [16, 2], [19, 6]], KERNEL);
  p.paintEllipse(6, 23, 2, 1.5, KERNEL).paintEllipse(26, 15, 1.5, 1.5, KERNEL).paintEllipse(25, 25, 1.5, 1, KERNEL).paintEllipse(9, 12, 1.2, 1, KERNEL);
  p.shade(0.8);
  p.eyes(10, 16, 8, 3, pose).mouth(15, 22, pose).blush(8, 21).blush(21, 21);
};

const fluffkorn: Recipe = (p, pose) => {
  // a golden kernel-shell cup, overflowing with buttery popcorn and a warm glow
  for (const [x, y, r] of [[7, 9, 4.5], [13, 5, 5], [20, 5, 5], [26, 9, 4.5], [16, 9, 5], [10, 12, 4], [23, 12, 4]] as const) p.circle(x, y, r, BUTTER);
  for (const [x, y] of [[6, 7], [14, 3], [22, 4], [27, 10], [17, 9]] as const) p.paintEllipse(x, y, 1.4, 1.1, KERNEL);
  p.ellipse(9, 30, 3, 1.5, KERNEL_D).ellipse(23, 30, 3, 1.5, KERNEL_D);
  p.poly([[3, 13], [29, 13], [26, 28], [6, 28]], KERNEL);
  for (const x of [9, 14, 19, 24]) p.paintPoly([[x, 13], [x + 2, 13], [x + 1.5, 28], [x - 0.5, 28]], 0xffc85a);
  p.paintEllipse(16, 25, 7, 3, mix(EMBER, KERNEL, 0.4));
  p.shade(0.8);
  p.eyes(9, 16, 10, 3, pose).mouth(15, 22, pose).blush(7, 21).blush(23, 21);
};

// ---------------------------------------------------------------------------------------------
// Leaf: leafcutter ants
const ANT = 0xc4643c, ANT_D = 0x93452a, LEAF = 0x5fc44f, LEAF_D = 0x3d8f35;

const antLegs = (p: Painter, y: number, xs: number[]) => { for (const x of xs) p.line(x, y, x - 1, y + 4, ANT_D); };

const snipsy: Recipe = (p, pose) => {
  // leaf umbrella on a stick
  p.line(19, 6, 18, 20, LEAF_D);
  p.poly([[8, 7], [14, 2], [22, 1], [29, 5], [24, 8], [16, 9]], LEAF);
  p.line(10, 6, 27, 4, LEAF_D);
  antLegs(p, 24, [11, 15, 19]);
  p.ellipse(20, 24, 5, 4, ANT);
  p.ellipse(10, 21, 7, 6.5, ANT);
  p.line(7, 15, 4, 11, ANT_D).line(12, 15, 13, 10, ANT_D).dot(4, 10, ANT_D).dot(13, 9, ANT_D);
  p.shade();
  p.eyes(6, 18, 6, 3, pose).mouth(9, 24, pose).blush(5, 23).blush(14, 23);
};

const leafhauler: Recipe = (p, pose) => {
  p.poly([[11, 13], [17, 3], [27, 1], [31, 8], [26, 15], [17, 17]], LEAF);
  p.line(13, 13, 29, 4, LEAF_D).line(19, 9, 21, 15, LEAF_D).line(23, 6, 27, 11, LEAF_D);
  antLegs(p, 25, [10, 14, 19, 23]);
  p.ellipse(23, 23, 6, 5, ANT);
  p.ellipse(16, 22, 4, 4, ANT);
  p.ellipse(8, 20, 7, 6.5, ANT);
  p.line(5, 14, 2, 9, ANT_D).line(10, 14, 11, 8, ANT_D);
  p.shade();
  p.eyes(4, 17, 6, 3, pose).mouth(7, 23, pose).blush(3, 22).blush(12, 22);
};

const canopant: Recipe = (p, pose) => {
  // stands tall with a leaf banner and a leafy cape
  p.line(26, 3, 26, 29, LEAF_D);
  p.poly([[26, 3], [31, 5], [31, 12], [26, 13]], LEAF);
  p.poly([[13, 14], [24, 15], [25, 27], [12, 27]], LEAF);
  p.ellipse(13, 29, 2.5, 1.5, ANT_D).ellipse(20, 29, 2.5, 1.5, ANT_D);
  p.ellipse(16, 23, 6, 6, ANT);
  p.paintEllipse(16, 25, 4, 3, lighten(ANT, 0.25));
  p.ellipse(15, 12, 7, 6.5, ANT);
  p.line(24, 18, 26, 14, ANT).line(9, 18, 6, 21, ANT);
  p.line(12, 6, 9, 1, ANT_D).line(17, 6, 19, 1, ANT_D);
  p.shade();
  p.eyes(10, 9, 7, 3, pose).mouth(14, 15, pose).blush(9, 14).blush(19, 14);
};

// ---------------------------------------------------------------------------------------------
// Gust: hummingbirds
const HUM = 0x48c9a4, HUM_L = 0xbff0dc, HUM_BEAK = 0x2f2a3c, PETAL = 0xff8fc0, WINGBLUR = 0xd8fff1;

const hummet: Recipe = (p, pose) => {
  p.poly([[17, 14], [28, 6], [30, 10], [20, 17]], WINGBLUR);
  p.poly([[21, 22], [29, 26], [26, 28], [19, 25]], darken(HUM, 0.1));
  p.ellipse(15, 19, 8, 8, HUM);
  p.paintEllipse(13, 23, 5, 4, HUM_L);
  p.line(7, 19, 1, 21, HUM_BEAK);
  // flower hat
  p.circle(11, 10, 2.5, PETAL).circle(16, 9, 2.5, PETAL).circle(14, 7, 2.5, PETAL).circle(14, 11, 2, PETAL).circle(14, 9, 1.5, 0xffe066);
  p.ellipse(13, 30, 1.5, 1, HUM_BEAK).ellipse(17, 30, 1.5, 1, HUM_BEAK);
  p.shade();
  p.eyes(9, 15, 6, 3, pose).blush(10, 20);
  if (pose.mouth === 'open') p.dot(7, 20, 0xf0687e);
};

const whirrbird: Recipe = (p, pose) => {
  p.poly([[16, 13], [27, 2], [31, 4], [21, 16]], WINGBLUR).poly([[18, 15], [30, 11], [30, 15], [21, 18]], WINGBLUR);
  p.poly([[20, 21], [31, 27], [28, 30], [25, 27], [18, 24]], darken(HUM, 0.15));
  p.ellipse(14, 18, 8, 7.5, HUM);
  p.paintEllipse(12, 22, 5, 3.5, HUM_L);
  p.paintPoly([[9, 14], [18, 12], [21, 16], [12, 17]], mix(HUM, 0x7f6fe0, 0.35));
  p.line(6, 17, 0, 18, HUM_BEAK);
  p.ellipse(11, 29, 1.5, 1, HUM_BEAK).ellipse(16, 29, 1.5, 1, HUM_BEAK);
  p.shade();
  p.eyes(8, 13, 6, 3, pose).blush(9, 18);
};

const galehum: Recipe = (p, pose) => {
  // shimmering feathers and long tail streamers
  p.stroke([[20, 22], [26, 26], [30, 31]], 0.8, 0x9f8cf0).stroke([[20, 23], [24, 29], [25, 31]], 0.8, 0x6fd6ff);
  p.poly([[15, 11], [24, 1], [30, 1], [22, 14]], WINGBLUR).poly([[18, 14], [31, 9], [31, 14], [21, 17]], 0xbfe9ff);
  p.ellipse(14, 17, 8, 8, mix(HUM, 0x6fa0ff, 0.25));
  p.paintEllipse(12, 21, 5, 4, HUM_L);
  p.paintPoly([[8, 12], [18, 9], [22, 15], [11, 16]], mix(HUM, 0xa07fe8, 0.5));
  p.poly([[11, 9], [12, 3], [14, 8]], 0xa07fe8).poly([[13, 9], [16, 4], [16, 9]], 0xff9bd2);
  p.line(6, 16, 0, 17, HUM_BEAK);
  p.ellipse(11, 28, 1.5, 1, HUM_BEAK).ellipse(16, 28, 1.5, 1, HUM_BEAK);
  p.shade();
  p.eyes(8, 12, 6, 3, pose).blush(9, 17);
};

// ---------------------------------------------------------------------------------------------
// Stone: wombats
const WOM = 0xa77b52, WOM_L = 0xd6ad82, NOSE = 0x4a3540;

const burrowby: Recipe = (p, pose) => {
  p.ellipse(8, 28, 3, 2, darken(WOM, 0.2)).ellipse(21, 28, 3, 2, darken(WOM, 0.2));
  p.ellipse(16, 20, 12, 9, WOM);
  p.circle(7, 11, 2.5, WOM).circle(18, 11, 2.5, WOM);
  p.paintEllipse(7, 11, 1.2, 1.2, WOM_L);
  p.paintEllipse(15, 25, 8, 4, WOM_L);
  p.shade();
  p.ellipse(6, 20, 3, 2.5, NOSE).shine(5, 19);
  p.eyes(7, 15, 7, 3, pose).mouth(7, 24, pose).blush(12, 20);
};

const burrowbat: Recipe = (p, pose) => {
  p.ellipse(7, 28, 4, 2.5, darken(WOM, 0.2)).ellipse(23, 28, 4, 2.5, darken(WOM, 0.2));
  p.dot(4, 29, 0xf3e3c8).dot(6, 30, 0xf3e3c8).dot(8, 30, 0xf3e3c8);
  p.ellipse(17, 19, 13, 10, WOM);
  p.circle(7, 9, 3, WOM).circle(19, 9, 3, WOM);
  p.paintEllipse(7, 9, 1.5, 1.5, WOM_L);
  p.paintEllipse(16, 24, 9, 5, WOM_L);
  p.shade();
  p.ellipse(5, 19, 3.5, 3, NOSE).shine(4, 18);
  p.eyes(6, 14, 8, 3, pose).mouth(6, 24, pose).blush(13, 19);
};

const bouldwom: Recipe = (p, pose) => {
  p.ellipse(6, 29, 4, 2, darken(WOM, 0.2)).ellipse(25, 29, 4, 2, darken(WOM, 0.2));
  p.ellipse(18, 15, 13, 10, 0x9b9aa8);
  p.ellipse(13, 9, 4, 3, 0xb3b2c0).ellipse(24, 12, 3, 3, 0x8a8998);
  p.ellipse(14, 22, 12, 8, WOM);
  p.circle(5, 13, 2.5, WOM);
  p.paintEllipse(13, 26, 8, 3, WOM_L);
  p.shade();
  p.ellipse(4, 21, 3, 2.5, NOSE).shine(3, 20);
  p.eyes(5, 16, 7, 3, pose).mouth(6, 25, pose).blush(11, 21);
};

// ---------------------------------------------------------------------------------------------
// Tide: manatees
const MANA = 0x8fb3d9, MANA_L = 0xc8dcf0, SEAGRASS = 0x5fbf73, CORAL = 0xff8f8a;

const lullakin: Recipe = (p, pose) => {
  p.ellipse(27, 25, 4, 3, darken(MANA, 0.1));
  p.ellipse(16, 21, 12, 8, MANA);
  p.paintEllipse(14, 25, 8, 3.5, MANA_L);
  p.ellipse(12, 28, 3, 1.5, darken(MANA, 0.15));
  p.ellipse(6, 21, 5, 4, lighten(MANA, 0.1));
  // sea-grass scarf
  p.poly([[11, 14], [20, 14], [21, 17], [11, 17]], SEAGRASS).poly([[18, 16], [21, 22], [18, 23]], SEAGRASS);
  p.shade();
  p.dot(3, 21, darken(MANA, 0.35)).dot(4, 23, darken(MANA, 0.35)).dot(8, 23, darken(MANA, 0.35));
  p.eyes(5, 16, 7, 3, pose).mouth(5, 24, pose).blush(12, 19);
};

const lullatee: Recipe = (p, pose) => {
  p.stroke([[28, 6], [27, 12], [29, 18]], 0.8, SEAGRASS).stroke([[24, 3], [24, 10]], 0.8, SEAGRASS);
  p.ellipse(28, 22, 4, 4, darken(MANA, 0.1));
  p.ellipse(16, 19, 13, 9, MANA);
  p.paintEllipse(15, 23, 9, 4, MANA_L);
  p.ellipse(11, 27, 3.5, 1.8, darken(MANA, 0.15)).ellipse(19, 28, 3, 1.5, darken(MANA, 0.15));
  p.ellipse(5, 19, 5, 4.5, lighten(MANA, 0.1));
  p.shade();
  p.dot(2, 19, darken(MANA, 0.35)).dot(3, 21, darken(MANA, 0.35)).dot(7, 22, darken(MANA, 0.35));
  p.eyes(5, 13, 7, 3, pose).mouth(4, 22, pose).blush(12, 17);
};

const grandatee: Recipe = (p, pose) => {
  p.ellipse(28, 21, 4, 5, darken(MANA, 0.1));
  p.ellipse(16, 20, 14, 10, MANA);
  p.paintEllipse(15, 25, 10, 4, MANA_L);
  p.ellipse(10, 29, 4, 2, darken(MANA, 0.15)).ellipse(21, 29, 3.5, 1.8, darken(MANA, 0.15));
  p.ellipse(5, 19, 5, 4.5, lighten(MANA, 0.1));
  // coral crown
  p.stroke([[11, 11], [10, 6], [8, 4]], 0.9, CORAL).stroke([[10, 7], [13, 4]], 0.8, CORAL).stroke([[16, 10], [16, 3]], 0.9, CORAL).stroke([[16, 6], [19, 3]], 0.8, CORAL).stroke([[20, 11], [22, 6]], 0.9, CORAL);
  p.shade();
  p.dot(2, 19, darken(MANA, 0.35)).dot(3, 21, darken(MANA, 0.35)).dot(7, 22, darken(MANA, 0.35));
  p.eyes(5, 14, 7, 3, pose).mouth(4, 22, pose).blush(12, 18);
};

// ---------------------------------------------------------------------------------------------
// Tide: tardigrades
const TARD = 0x9ad0f0, TARD_D = 0x6fa8d0, MOSS = 0x7bbf5a, MOSS_D = 0x5a9a40, DEW = 0xd6f4ff;

const tardLegs = (p: Painter, y: number, xs: number[], c: number) => { for (const x of xs) p.ellipse(x, y, 1.8, 2, c); };

const dewpud: Recipe = (p, pose) => {
  tardLegs(p, 27, [7, 12, 18, 23], TARD_D);
  p.ellipse(15, 20, 12, 8, TARD);
  for (const x of [10, 15, 20]) p.paintEllipse(x, 16, 0.6, 5, lighten(TARD, 0.18));
  p.shade();
  p.eyes(5, 17, 6, 3, pose).blush(4, 22).blush(11, 22);
  p.mouth(7, 24, pose.mouth === 'smile' ? { ...pose, mouth: 'o' } : pose);
};

const mossbub: Recipe = (p, pose) => {
  tardLegs(p, 27, [6, 11, 17, 22, 26], TARD_D);
  p.ellipse(16, 20, 13, 8, TARD);
  for (const x of [10, 16, 22]) p.paintEllipse(x, 22, 0.6, 4, lighten(TARD, 0.18));
  // fuzzy tufts of moss, not a shell
  for (const [x, y, r, c] of [[10, 13, 3, MOSS], [15, 11, 3.5, MOSS], [21, 12, 3, MOSS_D], [26, 15, 2.5, MOSS], [13, 15, 2.2, MOSS_D], [19, 15, 2.5, MOSS]] as const) p.circle(x, y, r, c);
  p.shade();
  p.eyes(5, 18, 6, 3, pose).blush(4, 23).blush(11, 23);
  p.mouth(7, 25, pose.mouth === 'smile' ? { ...pose, mouth: 'o' } : pose);
};

const hardigrade: Recipe = (p, pose) => {
  tardLegs(p, 28, [5, 10, 16, 22, 27], TARD_D);
  p.ellipse(16, 21, 14, 8, TARD);
  for (const x of [11, 17, 23]) p.paintEllipse(x, 23, 0.6, 4, lighten(TARD, 0.18));
  for (const [x, y, r, c] of [[9, 14, 3, MOSS], [14, 11, 3.5, MOSS], [20, 10, 3.5, MOSS_D], [26, 13, 3, MOSS], [12, 16, 2.4, MOSS_D], [18, 15, 2.6, MOSS], [24, 17, 2.4, MOSS_D]] as const) p.circle(x, y, r, c);
  p.circle(12, 10, 2, DEW).circle(19, 7, 2.2, DEW).circle(26, 11, 2, DEW).circle(16, 14, 1.6, DEW);
  p.shade();
  p.shine(11, 9).shine(18, 6).shine(25, 10);
  p.eyes(5, 19, 6, 3, pose).blush(4, 24).blush(11, 24);
  p.mouth(7, 26, pose.mouth === 'smile' ? { ...pose, mouth: 'o' } : pose);
};

// ---------------------------------------------------------------------------------------------
// Leaf: ferns
const FERN = 0x6cc24a, FERN_D = 0x3f8f2f, FERN_L = 0xa8e07a;

const fiddlit: Recipe = (p, pose) => {
  p.ellipse(10, 29, 3, 1.5, FERN_D).ellipse(20, 29, 3, 1.5, FERN_D);
  p.ellipse(15, 24, 6, 5, FERN);
  p.circle(15, 12, 9, FERN);
  p.paintEllipse(14, 13, 7, 7, lighten(FERN, 0.12));
  p.shade();
  // its head is a curled-up fiddlehead: a spiral round the face
  for (let a = 0; a < 540; a += 12) {
    const r = 8.6 - a / 75, rad = ((a - 60) * Math.PI) / 180;
    p.dot(15 + Math.cos(rad) * r, 12 + Math.sin(rad) * r, FERN_D);
  }
  p.eyes(10, 10, 7, 3, pose).mouth(14, 16, pose).blush(9, 15).blush(19, 15);
};

const frond = (p: Painter, pts: readonly [number, number][], c: number) => {
  p.stroke(pts, 0.6, darken(c, 0.25));
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]!, [bx, by] = pts[i + 1]!;
    for (let t = 0.2; t < 1; t += 0.35) {
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      p.ellipse(x, y - 1.5, 1.2, 1.6, c).ellipse(x, y + 1.5, 1.2, 1.6, c);
    }
  }
};

const frondle: Recipe = (p, pose) => {
  // feathery fronds droop from its shoulders; its head is still curled a little
  frond(p, [[11, 17], [5, 20], [2, 26]], FERN_L);
  frond(p, [[21, 17], [27, 20], [30, 26]], FERN_L);
  p.ellipse(11, 29, 3, 1.5, FERN_D).ellipse(20, 29, 3, 1.5, FERN_D);
  p.ellipse(16, 23, 7, 6, FERN);
  p.circle(16, 12, 8, FERN);
  p.stroke([[18, 2], [22, 3], [23, 7], [20, 8], [19, 5]], 0.9, FERN_D);
  p.shade();
  p.eyes(10, 10, 7, 3, pose).mouth(14, 16, pose).blush(9, 15).blush(19, 15);
};

const fernadore: Recipe = (p, pose) => {
  frond(p, [[16, 12], [8, 5], [2, 2]], FERN_L);
  frond(p, [[16, 11], [16, 3], [16, 0]], FERN_L);
  frond(p, [[16, 12], [24, 5], [30, 2]], FERN_L);
  frond(p, [[14, 16], [5, 16], [0, 19]], FERN_L);
  frond(p, [[18, 16], [27, 16], [31, 19]], FERN_L);
  p.ellipse(10, 29, 4, 2, MOSS_D).ellipse(22, 29, 4, 2, MOSS_D);
  p.ellipse(16, 21, 9, 9, FERN);
  p.paintEllipse(16, 25, 6, 4, FERN_L);
  p.shade();
  p.eyes(10, 16, 9, 3, pose).mouth(15, 22, pose).blush(8, 21).blush(22, 21);
};

// ---------------------------------------------------------------------------------------------
// Glow: glowworms
const GRUB = 0xf0dcef, GRUB_D = 0xc9a8d2, GLOWBLUE = 0x8ff5e6, NIGHT = 0x3b3f78, STARDOT = 0xfff3a0;

const gleamgrub: Recipe = (p, pose) => {
  p.circle(26, 23, 4, GLOWBLUE);
  p.circle(21, 23, 4.5, GRUB).circle(16, 22, 5, GRUB);
  p.circle(10, 20, 7, GRUB);
  p.ellipse(14, 28, 1.5, 1, GRUB_D).ellipse(19, 28, 1.5, 1, GRUB_D).ellipse(8, 27, 1.5, 1, GRUB_D);
  p.paintEllipse(21, 21, 0.6, 4, GRUB_D).paintEllipse(16, 20, 0.6, 4, GRUB_D);
  p.line(7, 14, 5, 10, GRUB_D).line(11, 13, 12, 9, GRUB_D);
  p.shade();
  p.shine(26, 21);
  p.eyes(5, 17, 6, 3, pose).mouth(8, 23, pose).blush(4, 22).blush(12, 22);
};

const silklight: Recipe = (p, pose) => {
  // hangs from a silk thread, with glowing beads on more threads
  p.line(14, 0, 14, 10, 0xe8e8ff);
  for (const [x, len] of [[5, 14], [24, 18], [28, 11]] as const) {
    p.line(x, 0, x, len, 0xe8e8ff);
    for (let y = 3; y <= len; y += 4) p.dot(x, y, GLOWBLUE);
  }
  p.circle(14, 24, 4, GLOWBLUE);
  p.circle(14, 19, 5, GRUB);
  p.circle(14, 13, 6.5, GRUB);
  p.paintEllipse(14, 19, 4, 0.6, GRUB_D);
  p.shade();
  p.shine(14, 23);
  p.eyes(10, 11, 6, 3, pose).mouth(13, 17, pose).blush(9, 16).blush(17, 16);
};

const starwisp: Recipe = (p, pose) => {
  // a long glowing silk scarf
  p.stroke([[22, 17], [27, 21], [29, 27], [26, 31]], 0.9, GLOWBLUE).stroke([[20, 18], [22, 25], [19, 31]], 0.7, lighten(GLOWBLUE, 0.3));
  p.circle(25, 13, 4, GLOWBLUE);
  p.circle(20, 15, 5, NIGHT).circle(14, 17, 6, NIGHT);
  p.circle(9, 19, 7.5, NIGHT);
  p.paintEllipse(9, 23, 5, 3, mix(NIGHT, GRUB, 0.35));
  for (const [x, y] of [[13, 13], [18, 12], [21, 16], [16, 18], [11, 14]] as const) p.dot(x, y, STARDOT);
  p.ellipse(8, 28, 1.5, 1, NIGHT).ellipse(14, 28, 1.5, 1, NIGHT);
  p.shade();
  p.shine(25, 11);
  for (const [x, y] of [[13, 13], [18, 12], [21, 16]] as const) p.shine(x, y);
  p.eyes(4, 16, 6, 3, pose, 0x3fd6c6).mouth(7, 22, pose).blush(3, 21).blush(11, 21);
};

// ---------------------------------------------------------------------------------------------
// Glow: fluorite
const FL_TOP = 0xd8b4ff, FL_LEFT = 0xa070e8, FL_RIGHT = 0x7a50c8, FL_GREEN = 0x7fe0a8, FL_BLUE = 0x7fb8ff;

const cube = (p: Painter, x: number, y: number, s: number, top: number, left: number, right: number) => {
  // isometric-ish cube: top rhombus, left and right faces
  p.poly([[x, y + s * 0.5], [x + s, y], [x + s * 2, y + s * 0.5], [x + s, y + s]], top);
  p.poly([[x, y + s * 0.5], [x + s, y + s], [x + s, y + s * 2.1], [x, y + s * 1.6]], left);
  p.poly([[x + s, y + s], [x + s * 2, y + s * 0.5], [x + s * 2, y + s * 1.6], [x + s, y + s * 2.1]], right);
};

const glintle: Recipe = (p, pose) => {
  p.ellipse(11, 29, 2, 1.5, FL_RIGHT).ellipse(21, 29, 2, 1.5, FL_RIGHT);
  cube(p, 5, 7, 11, FL_TOP, FL_LEFT, FL_RIGHT);
  p.shine(10, 12).shine(11, 12).shine(17, 9);
  p.eyes(8, 20, 6, 3, pose).mouth(11, 26, pose).blush(7, 25).blush(15, 25);
};

const prismble: Recipe = (p, pose) => {
  p.ellipse(10, 30, 2, 1.2, FL_RIGHT).ellipse(20, 30, 2, 1.2, FL_RIGHT);
  cube(p, 6, 14, 9, FL_TOP, FL_LEFT, FL_RIGHT);
  cube(p, 9, 5, 6, lighten(FL_GREEN, 0.3), FL_GREEN, darken(FL_GREEN, 0.2));
  cube(p, 12, 0, 4, lighten(FL_BLUE, 0.3), FL_BLUE, darken(FL_BLUE, 0.2));
  p.shine(10, 18).shine(14, 8).shine(15, 2);
  p.eyes(8, 25, 6, 2, pose).blush(7, 28).blush(14, 28);
};

const fluorelle: Recipe = (p, pose) => {
  // a striped diamond crystal with little cube hands
  p.poly([[16, 1], [27, 14], [16, 30], [5, 14]], FL_LEFT);
  p.paintPoly([[16, 1], [27, 14], [16, 30]], FL_RIGHT);
  for (const [y, c] of [[8, FL_GREEN], [20, FL_BLUE]] as const) p.paintPoly([[0, y], [32, y], [32, y + 3], [0, y + 3]], c);
  cube(p, 0, 14, 3, FL_TOP, FL_LEFT, FL_RIGHT);
  cube(p, 26, 14, 3, FL_TOP, FL_LEFT, FL_RIGHT);
  p.shade(0.8);
  p.shine(12, 6).shine(13, 5);
  p.eyes(11, 13, 7, 3, pose).mouth(15, 19, pose).blush(10, 18).blush(20, 18);
};

// ---------------------------------------------------------------------------------------------
// Volt: lemons
const LEMON = 0xf8de4a, LEMON_D = 0xd8b420, LEMON_L = 0xfff3a0, COPPER = 0xe0884a, ZINC = 0xb8c0cc, WIRE = 0x6b5a2a, FIZZ = 0xfff07a;

const lemonBody = (p: Painter, cx: number, cy: number, rx: number, ry: number) => {
  p.ellipse(cx, cy, rx, ry, LEMON);
  p.poly([[cx - rx - 2.5, cy], [cx - rx + 1, cy - 2.5], [cx - rx + 1, cy + 2.5]], LEMON);
  p.poly([[cx + rx + 2.5, cy], [cx + rx - 1, cy - 2.5], [cx + rx - 1, cy + 2.5]], LEMON);
};

/** A lemon battery: a copper strip and a zinc strip poked into the top, with a tiny zigzag spark between them. */
const battery = (p: Painter, x: number, y: number, gap: number, h: number) => {
  p.rect(x, y, 2, h, COPPER).rect(x + gap, y, 2, h, ZINC);
  const mid = x + 1 + gap / 2;
  p.dot(mid - 2, y + 1, FIZZ).dot(mid - 1, y, FIZZ).dot(mid, y + 1, FIZZ).dot(mid + 1, y, FIZZ);
};

/** Little pores on the peel, painted onto the lemon only. */
const peel = (p: Painter, pts: readonly [number, number][]) => { for (const [x, y] of pts) p.paintEllipse(x, y, 0.5, 0.5, LEMON_D); };

const zestle: Recipe = (p, pose) => {
  p.ellipse(10, 28, 2, 1.5, LEMON_D).ellipse(21, 28, 2, 1.5, LEMON_D);
  battery(p, 10, 9, 9, 5);
  lemonBody(p, 16, 20, 11, 7.5);
  peel(p, [[23, 16], [25, 21], [21, 25], [9, 15]]);
  p.shade();
  p.eyes(10, 17, 7, 3, pose).mouth(14, 23, pose).blush(8, 22).blush(19, 22);
};

const zestwick: Recipe = (p, pose) => {
  p.ellipse(9, 29, 2.5, 1.5, LEMON_D).ellipse(23, 29, 2.5, 1.5, LEMON_D);
  // taller strips and a fizzing spark that never stops: its wick
  battery(p, 9, 6, 11, 6);
  p.dot(15, 3, FIZZ).dot(16, 2, FIZZ).dot(4, 8, FIZZ).dot(28, 7, FIZZ).dot(2, 13, FIZZ);
  lemonBody(p, 16, 19, 12, 9);
  p.paintPoly([[6, 14], [26, 12], [27, 15], [7, 17]], LEMON_L);
  peel(p, [[24, 18], [26, 22], [22, 26], [8, 24]]);
  p.ellipse(2, 23, 2, 1.5, LEMON).ellipse(30, 22, 2, 1.5, LEMON);
  p.shade();
  p.eyes(9, 17, 8, 3, pose).mouth(14, 24, pose).blush(7, 22).blush(20, 22);
};

const citrivolt: Recipe = (p, pose) => {
  // wears its peel like a cape, with a glowing lantern on its battery wire
  p.poly([[9, 12], [23, 12], [30, 29], [24, 27], [16, 30], [8, 27], [2, 29]], 0xc9e05a);
  p.paintPoly([[2, 24], [30, 24], [30, 30], [2, 30]], 0xb4cf3f);
  battery(p, 10, 8, 9, 5);
  p.line(15, 5, 15, 7, WIRE);
  p.ellipse(15, 3, 2, 2.5, 0xfff6c0).ellipse(15, 4, 1, 1.2, 0xffd84a);
  p.ellipse(11, 29, 2.5, 1.5, LEMON_D).ellipse(21, 29, 2.5, 1.5, LEMON_D);
  lemonBody(p, 16, 19, 9, 8.5);
  peel(p, [[22, 16], [23, 21], [9, 23]]);
  p.shade();
  p.shine(15, 3);
  p.eyes(10, 15, 7, 3, pose).mouth(14, 22, pose).blush(9, 20).blush(19, 20);
};

// ---------------------------------------------------------------------------------------------
// Frost: hailstones
const HAIL = 0xd0e6ff, HAIL_RING = 0xa8c8f2, MITTEN = 0x8fb0ff, CLOUD = 0xe6ecf5, CLOUD_D = 0xb8c2d6;

const rings = (p: Painter, cx: number, cy: number, r: number) => {
  for (let k = r * 0.75; k > 1.5; k -= r * 0.28) {
    for (let a = 0; a < 360; a += 360 / (k * 5)) {
      const rad = (a * Math.PI) / 180;
      if (a > 200 && a < 330) continue; // leave room for the face
      p.dot(cx + Math.cos(rad) * k, cy + Math.sin(rad) * k, HAIL_RING);
    }
  }
};

const hailbit: Recipe = (p, pose) => {
  p.ellipse(4, 22, 2.5, 2.5, MITTEN).ellipse(26, 22, 2.5, 2.5, MITTEN);
  p.circle(15, 19, 10, HAIL);
  rings(p, 15, 19, 10);
  p.ellipse(11, 29, 2, 1.5, HAIL_RING).ellipse(19, 29, 2, 1.5, HAIL_RING);
  p.shade();
  p.shine(9, 13).shine(10, 12);
  p.eyes(9, 15, 7, 3, pose).mouth(13, 21, pose).blush(8, 20).blush(18, 20);
};

const hailroll: Recipe = (p, pose) => {
  p.ellipse(3, 22, 2.5, 2.5, MITTEN).ellipse(28, 21, 2.5, 2.5, MITTEN);
  p.circle(16, 19, 11, HAIL);
  rings(p, 16, 19, 11);
  puffCloud(p, 17, 7, 4, CLOUD);
  p.shade();
  p.shine(9, 13).shine(10, 12);
  p.eyes(9, 16, 8, 3, pose).mouth(14, 22, pose).blush(8, 21).blush(20, 21);
};

const hailcastle: Recipe = (p, pose) => {
  p.ellipse(2, 24, 2.5, 3, MITTEN).ellipse(29, 24, 2.5, 3, MITTEN);
  p.circle(16, 22, 10, HAIL);
  rings(p, 16, 22, 10);
  // a little storm cloud floats over it like a castle (it keeps the rain off friends)
  for (const [x, y, r] of [[8, 7, 4], [14, 5, 5], [20, 5, 5], [25, 7, 4], [16, 8, 5]] as const) p.circle(x, y, r, CLOUD);
  p.rect(10, 0, 2, 3, CLOUD).rect(15, 0, 2, 3, CLOUD).rect(20, 0, 2, 3, CLOUD);
  p.paintPoly([[4, 9], [29, 9], [29, 12], [4, 12]], CLOUD_D);
  p.dot(9, 13, HAIL_RING).dot(17, 13, HAIL_RING).dot(23, 13, HAIL_RING);
  p.shade();
  p.shine(10, 17);
  p.eyes(10, 18, 8, 3, pose).mouth(15, 25, pose).blush(9, 23).blush(21, 23);
};

// ---------------------------------------------------------------------------------------------
// Frost: snow leopards
const SNOW = 0xe9edf4, SNOW_TAIL = 0xb3bccd, ROSETTE = 0x505a74, SNOW_ICE = 0x6a9ee8;

/** Snow leopard spots are rings (rosettes), not dots. */
const rosettes = (p: Painter, pts: readonly [number, number][], c: number) => {
  for (const [x, y] of pts) p.dot(x + 1, y, c).dot(x, y + 1, c).dot(x + 2, y + 1, c).dot(x + 1, y + 2, c);
};

/** The long fluffy tail, wrapped round like a scarf, with dark bands across it. */
const scarf = (p: Painter, pts: readonly [number, number][], r: number, bands: readonly [number, number][], band = ROSETTE) => {
  p.stroke(pts, r, SNOW_TAIL);
  const [tx, ty] = pts[pts.length - 1]!;
  p.circle(tx, ty, r + 0.6, SNOW_TAIL);
  for (const [x, y] of bands) p.dot(x, y, band).dot(x, y + 1, band);
};

const scarfcub: Recipe = (p, pose) => {
  p.ellipse(10, 29, 2.5, 1.5, darken(SNOW, 0.15)).ellipse(19, 29, 2.5, 1.5, darken(SNOW, 0.15));
  p.ellipse(16, 23, 8, 6, SNOW);
  p.circle(12, 13, 8, SNOW);
  p.circle(6, 6, 2.5, SNOW).circle(18, 6, 2.5, SNOW);
  rosettes(p, [[18, 24], [12, 25], [15, 7]], ROSETTE);
  // the tail wraps round its neck like a scarf, the fluffy tip hanging in front
  scarf(p, [[23, 27], [27, 23], [24, 20], [16, 21], [8, 20], [5, 24]], 1.8, [[26, 22], [19, 20], [11, 20], [5, 23]]);
  p.shade();
  p.eyes(7, 11, 7, 3, pose, 0x7aa8e8).mouth(11, 16, pose).blush(6, 15).blush(16, 15);
};

const scarfpaw: Recipe = (p, pose) => {
  p.ellipse(8, 29, 4, 2, SNOW).ellipse(21, 29, 4, 2, SNOW);
  p.ellipse(16, 22, 10, 7, SNOW);
  p.circle(11, 12, 8, SNOW);
  p.circle(5, 5, 2.5, SNOW).circle(17, 5, 2.5, SNOW);
  rosettes(p, [[19, 22], [23, 25], [13, 25], [14, 6]], ROSETTE);
  scarf(p, [[25, 26], [30, 21], [27, 18], [18, 20], [9, 19], [6, 24]], 2, [[29, 20], [22, 19], [14, 19], [6, 22]]);
  p.shade();
  p.eyes(6, 10, 7, 3, pose, 0x7aa8e8).mouth(10, 15, pose).blush(5, 14).blush(15, 14);
};

const scarfspire: Recipe = (p, pose) => {
  p.poly([[0, 32], [4, 24], [28, 23], [32, 32]], 0x9aa3b8);
  p.ellipse(9, 23, 3.5, 2, SNOW).ellipse(20, 23, 3.5, 2, SNOW);
  p.ellipse(16, 17, 10, 7, SNOW);
  p.circle(10, 9, 7, SNOW);
  p.circle(5, 3, 2.5, SNOW).circle(15, 3, 2.5, SNOW);
  rosettes(p, [[18, 17], [22, 13], [13, 19], [24, 18]], SNOW_ICE);
  // the elder's tail stands up behind it like a spire, then wraps its neck with frosty bands
  scarf(p, [[26, 21], [30, 15], [29, 8], [25, 7], [23, 12], [16, 15], [8, 15], [5, 19]], 1.8, [[30, 13], [27, 7], [19, 14], [11, 15]], SNOW_ICE);
  p.shade();
  p.eyes(5, 7, 7, 3, pose, 0x7aa8e8).mouth(9, 12, pose).blush(4, 11).blush(14, 11);
};

// ---------------------------------------------------------------------------------------------
// Flare: capybaras
const CAPY = 0xa8774a, CAPY_L = 0xc99a6a, CAPY_N = 0x5a3e32, TOWEL = 0xffffff, TOWEL_S = 0xff9bb0, STEAM = 0xf4f0f8;

const capyHead = (p: Painter, x: number, y: number) => {
  p.ellipse(x, y, 6, 5, CAPY);
  p.ellipse(x - 4, y + 1, 3, 3.5, CAPY);
  p.circle(x + 2, y - 4.5, 1.5, darken(CAPY, 0.15));
};

const bathlet: Recipe = (p, pose) => {
  p.ellipse(9, 29, 2.5, 1.5, darken(CAPY, 0.2)).ellipse(21, 29, 2.5, 1.5, darken(CAPY, 0.2));
  p.ellipse(18, 23, 10, 6.5, CAPY);
  p.paintEllipse(17, 26, 7, 3, CAPY_L);
  capyHead(p, 10, 16);
  p.poly([[5, 11], [14, 10], [15, 13], [6, 14]], TOWEL);
  p.line(6, 12, 14, 11, TOWEL_S);
  p.circle(24, 8, 1.5, STEAM).circle(27, 5, 2, STEAM).circle(29, 9, 1.2, STEAM);
  p.shade();
  p.dot(5, 17, CAPY_N).dot(5, 18, CAPY_N);
  p.eyes(8, 15, 6, 2, pose).mouth(7, 20, pose).blush(12, 18);
};

const steambly: Recipe = (p, pose) => {
  puffCloud(p, 25, 9, 5, STEAM);
  puffCloud(p, 5, 6, 3.5, STEAM);
  p.ellipse(9, 29, 3, 1.8, darken(CAPY, 0.2)).ellipse(23, 29, 3, 1.8, darken(CAPY, 0.2));
  p.ellipse(18, 22, 12, 7.5, CAPY);
  p.paintEllipse(17, 26, 9, 3, CAPY_L);
  capyHead(p, 9, 15);
  p.poly([[4, 10], [13, 9], [14, 12], [5, 13]], TOWEL);
  p.line(5, 11, 13, 10, TOWEL_S);
  p.shade();
  p.dot(4, 16, CAPY_N).dot(4, 17, CAPY_N);
  p.eyes(7, 14, 6, 2, pose).mouth(6, 19, pose).blush(11, 17);
};

const thermabara: Recipe = (p, pose) => {
  // a tiny hot spring on its back
  p.ellipse(9, 29, 3, 1.8, darken(CAPY, 0.2)).ellipse(25, 29, 3, 1.8, darken(CAPY, 0.2));
  p.ellipse(19, 21, 12, 8.5, CAPY);
  p.paintEllipse(18, 26, 9, 3, CAPY_L);
  p.ellipse(21, 13, 8, 3, 0x8f8a96);
  p.ellipse(21, 12.5, 6, 1.8, 0x7fd0f0);
  puffCloud(p, 18, 6, 3, STEAM);
  puffCloud(p, 25, 4, 2.5, STEAM);
  capyHead(p, 8, 16);
  p.shade();
  p.dot(3, 17, CAPY_N).dot(3, 18, CAPY_N);
  p.eyes(6, 15, 6, 2, pose).mouth(5, 20, pose).blush(10, 18);
};

// ---------------------------------------------------------------------------------------------
// Guardians
const SAND1 = 0xd9774b, SAND2 = 0xeaa16b, SAND3 = 0xc45f3c, FLOWER = 0xffd2e6;

const archwyn: Recipe = (p, pose) => {
  // a gentle giant whose back is a red stone arch (you could walk under it)
  p.poly([[1, 31], [2, 16], [7, 8], [16, 5], [25, 8], [30, 16], [31, 31], [24, 31], [23, 20], [16, 15], [9, 20], [8, 31]], SAND1);
  p.paintPoly([[0, 10], [32, 10], [32, 13], [0, 13]], SAND2);
  p.paintPoly([[0, 18], [32, 18], [32, 21], [0, 21]], SAND2);
  p.paintPoly([[0, 25], [32, 25], [32, 27], [0, 27]], SAND3);
  p.circle(9, 4, 1.5, FLOWER).circle(16, 3, 1.5, 0xffe066).circle(23, 4, 1.5, FLOWER).dot(12, 5, 0x6fc44f).dot(20, 5, 0x6fc44f);
  p.ellipse(4, 14, 5, 5, SAND1);
  p.shade();
  p.eyes(1, 12, 5, 2, pose).mouth(3, 17, pose).blush(6, 15);
};

const tidecrest: Recipe = (p, pose) => {
  // a great moon snail with a tide-pool garden on its shell
  p.ellipse(16, 27, 15, 4, 0x8fb3d9);
  p.circle(19, 15, 11, 0xf1f4ff);
  p.paintEllipse(22, 14, 6, 7, 0xd8e2ff);
  p.paintEllipse(25, 13, 2.5, 4, 0xf1f4ff);
  p.ellipse(19, 5, 6, 1.6, 0x7fd0f0);
  p.stroke([[16, 5], [15, 1]], 0.7, 0x5fbf73).stroke([[22, 5], [23, 1]], 0.7, CORAL);
  p.ellipse(6, 22, 6, 6, 0x8fb3d9);
  p.shade();
  p.eyes(2, 19, 6, 3, pose).mouth(5, 25, pose).blush(1, 24).blush(10, 24);
};

const frostmantle: Recipe = (p, pose) => {
  // a giant snowshoe hare with a frosty collar and wide feet
  p.ellipse(9, 6, 2.5, 7, SNOW).ellipse(16, 5, 2.5, 7, SNOW);
  p.paintEllipse(9, 1, 2, 2, SNOW_ICE).paintEllipse(16, 0, 2, 2, SNOW_ICE);
  p.ellipse(7, 29, 6, 2.5, SNOW).ellipse(22, 29, 6, 2.5, SNOW);
  p.ellipse(18, 21, 11, 8, SNOW);
  p.circle(12, 15, 7, SNOW);
  p.poly([[5, 19], [20, 18], [22, 22], [16, 25], [10, 24]], 0xb8d4ff);
  p.paintPoly([[7, 20], [11, 23], [14, 20], [18, 23], [20, 20]], 0xd8e8ff);
  p.circle(28, 18, 3, lighten(SNOW, 0.2));
  p.shade();
  p.eyes(7, 12, 7, 3, pose, 0x6f9be8).mouth(11, 17, pose).blush(6, 16).blush(16, 16);
};

const aurelune: Recipe = (p, pose) => {
  // a sky kite of soft light, trailing aurora ribbons
  p.stroke([[16, 26], [12, 29], [16, 31]], 0.8, 0x8ff0c8).stroke([[17, 26], [22, 29], [26, 31]], 0.8, 0xf0a8ff).stroke([[15, 26], [8, 30], [3, 31]], 0.8, 0x8fd8ff);
  p.poly([[16, 1], [30, 13], [16, 27], [2, 13]], 0xe8d8ff);
  p.paintPoly([[16, 1], [30, 13], [16, 13]], 0xd6c0ff);
  p.paintPoly([[2, 13], [16, 13], [16, 27]], 0xf4ecff);
  p.paintPoly([[16, 1], [16.6, 1], [16.6, 27], [16, 27]], 0xc8f0ff);
  p.paintPoly([[2, 13], [30, 13], [30, 13.6], [2, 13.6]], 0xc8f0ff);
  p.shade(0.7);
  p.shine(16, 4).shine(27, 13);
  p.eyes(10, 10, 9, 3, pose, 0x8f6fe0).mouth(15, 18, pose).blush(9, 15).blush(21, 15);
};

export const RECIPES: Record<string, Recipe> = {
  spinnet, twirlwing, maplegale, druzling, druzette, druzarch, buzzbill, zipbill, voltabill,
  kernip, poplet, fluffkorn, snipsy, leafhauler, canopant, hummet, whirrbird, galehum,
  burrowby, burrowbat, bouldwom, lullakin, lullatee, grandatee, dewpud, mossbub, hardigrade,
  fiddlit, frondle, fernadore, gleamgrub, silklight, starwisp, glintle, prismble, fluorelle,
  zestle, zestwick, citrivolt, hailbit, hailroll, hailcastle, scarfcub, scarfpaw, scarfspire,
  bathlet, steambly, thermabara, archwyn, tidecrest, frostmantle, aurelune,
  ...NEW_RECIPES,
};

/** Shimmer variants: a rotated hue on the body (never the face), the same for every pose. */
export const SHIMMER_SHIFT = 150;

export function drawCreature(id: string, size: 32 | 16 | 64 = 32, pose: Pose = POSES.idle!, shimmer = false): PixelCanvas {
  const recipe = RECIPES[id];
  const p = new Painter(size);
  if (recipe) recipe(p, pose);
  else p.circle(16, 16, 10, 0xff00ff);
  if (shimmer) p.recolor(c => (c === WHITE ? c : hueShift(c, SHIMMER_SHIFT)));
  return p.finish();
}

/** Where a creature's face is (canvas pixels at `size`), for placing accessories. */
export function creatureFace(id: string, size: 32 | 16 | 64 = 32): { x0: number; y0: number; x1: number; y1: number } | null {
  const recipe = RECIPES[id];
  if (!recipe) return null;
  const p = new Painter(size);
  recipe(p, POSES.idle!);
  return p.faceBounds();
}

export { C as CREATURE_COLORS, mix };
