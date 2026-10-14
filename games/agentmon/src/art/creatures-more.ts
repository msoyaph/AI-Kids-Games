/**
 * The 1.1 Agentmon (numbers 53–77): 8 families of three and the guardian Verdanyan, in the same
 * recipe style as creatures.ts (32×32 design space, ground at y≈30, facing left). Names were
 * web-checked and the designs reviewed for lookalikes (games/agentmon/CLAUDE.md, IP log).
 */
import { darken, lighten } from './pixelcanvas';
import type { Painter, Pose } from './painter';

type Recipe = (p: Painter, pose: Pose) => void;

// ---------------------------------------------------------------------------------------------
// Flare: bombardier beetles (orange head and legs, dark wing cases; they puff warm steam when startled)
const BHEAD = 0xf08a3c, BHEAD_D = 0xc8642a, ELYTRA = 0x2f5a9a, ELYTRA_L = 0x5f8ad0, STEAMY = 0xf4f0f8;

const steam = (p: Painter, pts: readonly [number, number, number][]) => { for (const [x, y, r] of pts) p.circle(x, y, r, STEAMY); };
/** Three visible legs, bent like a beetle's. */
const beetleLegs = (p: Painter, xs: readonly number[], top: number) => { for (const x of xs) p.stroke([[x, top], [x - 2, top + 3], [x - 1, 30]], 0.55, BHEAD_D); };

const puffbit: Recipe = (p, pose) => {
  beetleLegs(p, [13, 18, 23], 25);
  steam(p, [[30, 17, 1.8], [31, 13, 1.3]]);
  p.ellipse(19, 21, 9, 6.5, ELYTRA);
  p.paintEllipse(20, 18, 6, 2, ELYTRA_L);
  p.line(19, 15, 26, 22, darken(ELYTRA, 0.2));
  p.circle(9, 20, 6.5, BHEAD);
  p.line(6, 14, 3, 9, BHEAD_D).line(9, 14, 9, 9, BHEAD_D);
  p.shade();
  p.eyes(5, 19, 6, 3, pose).mouth(7, 23, pose).blush(4, 22).blush(11, 22);
};

const puffbeetle: Recipe = (p, pose) => {
  beetleLegs(p, [12, 18, 24], 24);
  steam(p, [[30, 14, 2], [31, 9, 1.5], [28, 6, 1.1]]);
  p.ellipse(19, 19, 11, 7.5, ELYTRA);
  p.paintEllipse(20, 15, 8, 2.2, ELYTRA_L);
  // orange spots on the wing cases, like the real beetles
  p.paintEllipse(17, 21, 2, 1.4, BHEAD).paintEllipse(24, 18, 1.8, 1.3, BHEAD);
  p.line(19, 12, 28, 21, darken(ELYTRA, 0.2));
  p.circle(8, 18, 7, BHEAD);
  p.line(5, 12, 1, 6, BHEAD_D).line(8, 11, 8, 5, BHEAD_D);
  p.shade();
  p.eyes(4, 17, 6, 3, pose).mouth(6, 22, pose).blush(3, 21).blush(10, 21);
};

const geyserguard: Recipe = (p, pose) => {
  beetleLegs(p, [11, 18, 25], 23);
  steam(p, [[29, 9, 2.4], [31, 4, 1.8], [26, 2, 1.4], [32, 13, 1.3]]);
  p.ellipse(19, 18, 12.5, 9, ELYTRA);
  p.paintEllipse(20, 13, 9, 2.6, ELYTRA_L);
  for (const [x, y] of [[15, 20], [21, 22], [25, 16], [18, 15]] as const) p.paintEllipse(x, y, 2, 1.4, BHEAD);
  p.line(19, 9, 30, 21, darken(ELYTRA, 0.2));
  // a little horn and a warm glow under its chin
  p.poly([[4, 10], [6, 3], [9, 10]], BHEAD_D);
  p.circle(8, 17, 7.5, BHEAD);
  p.paintEllipse(8, 23, 4, 1.4, 0xffc45a);
  p.line(8, 10, 12, 4, BHEAD_D);
  p.shade();
  p.eyes(4, 16, 6, 3, pose).mouth(6, 21, pose).blush(3, 20).blush(10, 20);
};

// ---------------------------------------------------------------------------------------------
// Tide: mangroves (seeds that sprout on the tree, then stand on stilt roots in the water)
const POD = 0x8cbc5a, POD_D = 0x6a9a44, MBARK = 0x8a6a4a, MROOT = 0x6e5238, MLEAF = 0x4fae6f, MLEAF_L = 0x8fd88a, SHALLOWS = 0x9fd4ff;

const stiltsprout: Recipe = (p, pose) => {
  p.ellipse(16, 30, 12, 1.6, SHALLOWS);
  p.stroke([[13, 23], [10, 27], [8, 30]], 0.8, MROOT).stroke([[16, 24], [16, 30]], 0.8, MROOT).stroke([[19, 23], [22, 27], [24, 30]], 0.8, MROOT);
  p.ellipse(16, 15, 6.5, 10, POD);
  p.paintEllipse(18, 12, 2.5, 7, lighten(POD, 0.18));
  p.ellipse(12, 4, 3.5, 1.6, MLEAF).ellipse(20, 4, 3.5, 1.6, MLEAF).line(16, 4, 16, 6, POD_D);
  p.shade();
  p.eyes(11, 13, 6, 3, pose).mouth(14, 18, pose).blush(10, 17).blush(18, 17);
};

const wadewood: Recipe = (p, pose) => {
  p.ellipse(16, 30, 15, 1.8, SHALLOWS);
  for (const [x0, x1] of [[10, 4], [13, 10], [19, 22], [22, 28]] as const) p.stroke([[x0, 20], [(x0 + x1) / 2, 23], [x1, 30]], 0.9, MROOT);
  p.ellipse(16, 18, 7, 6.5, MBARK);
  for (const [x, y, r] of [[9, 7, 5], [16, 5, 6], [23, 7, 5], [16, 10, 5]] as const) p.circle(x, y, r, MLEAF);
  p.paintEllipse(13, 4, 3, 1.5, MLEAF_L).paintEllipse(21, 5, 2.5, 1.3, MLEAF_L);
  p.shade();
  p.eyes(11, 16, 7, 3, pose).mouth(14, 21, pose).blush(10, 20).blush(19, 20);
};

const mangromere: Recipe = (p, pose) => {
  p.ellipse(16, 30, 16, 2, SHALLOWS);
  for (const [x0, x1] of [[8, 1], [11, 6], [14, 12], [18, 20], [21, 26], [24, 31]] as const) p.stroke([[x0, 19], [(x0 + x1) / 2, 22], [x1, 30]], 0.9, MROOT);
  p.ellipse(16, 17, 9, 6, MBARK);
  for (const [x, y, r] of [[5, 8, 5], [12, 4, 6], [20, 4, 6], [27, 8, 5], [16, 9, 6]] as const) p.circle(x, y, r, MLEAF);
  for (const [x, y] of [[8, 5], [16, 2], [24, 5]] as const) p.paintEllipse(x, y, 2.5, 1.2, MLEAF_L);
  // a sprouting seed pod hanging from the canopy, ready to drop
  p.stroke([[27, 12], [28, 18]], 0.7, POD);
  p.shade();
  p.eyes(10, 15, 8, 3, pose).mouth(14, 20, pose).blush(9, 19).blush(20, 19);
};

// ---------------------------------------------------------------------------------------------
// Leaf: stick insects and leaf insects (they look exactly like twigs and leaves)
const TWIG = 0xa0804e, TWIG_D = 0x7a5e38, LEAFY = 0x7cc456, LEAFY_D = 0x4f9a3f, MOSSY = 0x5fa85a;

/** Long, thin stilt legs, bent at the knee. */
const stiltLegs = (p: Painter, xs: readonly number[], top: number, knee: number) => { for (const [i, x] of xs.entries()) p.stroke([[x, top], [x + (i - 1) * 3, knee], [x + (i - 1) * 3 - 1, 30]], 0.45, TWIG_D); };

const sprigling: Recipe = (p, pose) => {
  stiltLegs(p, [12, 18, 24], 21, 17);
  p.stroke([[10, 21], [30, 20]], 1.3, TWIG);
  p.dot(18, 19, TWIG_D).dot(25, 19, TWIG_D);
  p.ellipse(22, 18, 1.8, 1.2, LEAFY).ellipse(28, 18, 1.6, 1, LEAFY);
  p.circle(8, 18, 5.5, TWIG);
  p.line(5, 13, 2, 8, TWIG_D).line(8, 12, 9, 7, TWIG_D);
  p.shade();
  p.eyes(4, 17, 5, 3, pose).mouth(6, 21, pose).blush(3, 20).blush(10, 20);
};

const twigstride: Recipe = (p, pose) => {
  stiltLegs(p, [11, 19, 27], 18, 12);
  p.stroke([[9, 18], [31, 16]], 1.4, TWIG);
  for (const x of [15, 21, 27]) p.dot(x, 16, TWIG_D);
  // leaves sprouting along its back, and a mossy patch
  p.ellipse(17, 14, 2.4, 1.3, LEAFY).ellipse(24, 13, 2.4, 1.3, LEAFY).ellipse(30, 13, 1.8, 1.2, LEAFY);
  p.paintEllipse(20, 17, 2, 0.8, MOSSY);
  p.circle(7, 15, 5.5, TWIG);
  p.line(4, 10, 0, 4, TWIG_D).line(7, 9, 8, 3, TWIG_D);
  p.shade();
  p.eyes(3, 14, 5, 3, pose).mouth(5, 18, pose).blush(2, 17).blush(9, 17);
};

const leafwarden: Recipe = (p, pose) => {
  p.stroke([[12, 22], [8, 26], [7, 30]], 0.6, LEAFY_D).stroke([[20, 22], [24, 26], [25, 30]], 0.6, LEAFY_D);
  // a body shaped like a broad leaf, with leafy flaps on the legs
  p.poly([[16, 6], [25, 14], [24, 24], [16, 28], [8, 24], [7, 14]], LEAFY);
  p.ellipse(6, 27, 2.5, 1.5, LEAFY).ellipse(26, 27, 2.5, 1.5, LEAFY);
  p.line(16, 8, 16, 27, LEAFY_D);
  for (const y of [13, 18, 23]) p.line(16, y, 10, y - 3, LEAFY_D).line(16, y, 22, y - 3, LEAFY_D);
  p.circle(16, 5, 3.5, LEAFY);
  p.ellipse(11, 2, 2, 1, LEAFY_D).ellipse(21, 2, 2, 1, LEAFY_D);
  p.shade();
  p.eyes(13, 4, 5, 2, pose).mouth(15, 8, pose, 1);
};

// ---------------------------------------------------------------------------------------------
// Stone: lithops, "living stones" (succulents that look exactly like pebbles; a flower pops out of the crack)
const PEB = 0xc9b8a0, PEB_D = 0x9a8874, PEB_W = 0xa8b8a0, PETAL = 0xfff6e0, BLOOM = 0xffd24a, SANDY = 0xe8c890;

/** Two rounded halves side by side with a crack between them; the tops have see-through "windows". */
const pebblePair = (p: Painter, cx: number, cy: number, rx: number, ry: number) => {
  p.ellipse(cx - rx * 0.55, cy, rx * 0.6, ry, PEB);
  p.ellipse(cx + rx * 0.55, cy, rx * 0.6, ry, lighten(PEB, 0.05));
  p.paintEllipse(cx - rx * 0.55, cy - ry * 0.6, rx * 0.35, ry * 0.22, PEB_W);
  p.paintEllipse(cx + rx * 0.55, cy - ry * 0.6, rx * 0.35, ry * 0.22, PEB_W);
  p.line(cx, cy - ry + 1, cx, cy - ry * 0.2, PEB_D);
};
const flower = (p: Painter, x: number, y: number, r: number) => {
  for (let a = 0; a < 360; a += 45) { const t = (a * Math.PI) / 180; p.ellipse(x + Math.cos(t) * r, y + Math.sin(t) * r * 0.7, r * 0.55, r * 0.35, PETAL); }
  p.circle(x, y, r * 0.5, BLOOM);
};

const lithlet: Recipe = (p, pose) => {
  p.ellipse(16, 30, 9, 1.5, SANDY);
  p.ellipse(11, 29, 2, 1.3, PEB_D).ellipse(21, 29, 2, 1.3, PEB_D);
  pebblePair(p, 16, 22, 10, 7.5);
  p.shade();
  p.eyes(10, 22, 9, 3, pose).mouth(15, 26, pose).blush(9, 25).blush(21, 25);
};

const lithopsy: Recipe = (p, pose) => {
  p.ellipse(16, 30, 12, 1.6, SANDY);
  p.ellipse(9, 29, 2.5, 1.5, PEB_D).ellipse(23, 29, 2.5, 1.5, PEB_D);
  // a flower bud peeking out of the crack
  p.ellipse(16, 8, 2, 3, PETAL).line(16, 10, 16, 13, 0x7aa84f);
  pebblePair(p, 16, 20, 13, 9.5);
  p.shade();
  for (const [x, y] of [[9, 14], [11, 13], [21, 13], [23, 14]] as const) p.dot(x, y, PEB_D);
  p.eyes(9, 20, 12, 3, pose).mouth(15, 25, pose).blush(8, 24).blush(23, 24);
};

const stonebloom: Recipe = (p, pose) => {
  p.ellipse(16, 30, 15, 2, SANDY);
  p.ellipse(7, 29, 3, 1.6, PEB_D).ellipse(25, 29, 3, 1.6, PEB_D);
  // a small pebble pair beside it (a young one), and a big flower open on top
  p.ellipse(28, 25, 3, 4, PEB).ellipse(31, 25, 2.5, 4, lighten(PEB, 0.05));
  pebblePair(p, 15, 20, 15, 10);
  p.shade();
  flower(p, 15, 7, 5);
  for (const [x, y] of [[6, 13], [8, 12], [22, 12], [24, 13]] as const) p.dot(x, y, PEB_D);
  p.eyes(8, 20, 13, 3, pose).mouth(14, 25, pose).blush(7, 24).blush(23, 24);
};

// ---------------------------------------------------------------------------------------------
// Gust: flying fish (they glide over the sea on wide, wing-like fins)
const FFISH = 0x5f98e0, FBELLY = 0xe4f2ff, FWING = 0xc4ecff, FWING_V = 0x8cc8f0, SPRAY = 0xe8f6ff;

const fishWing = (p: Painter, base: readonly [number, number], tip: readonly [number, number], back: readonly [number, number]) => {
  p.poly([base, tip, back], FWING);
  p.line(base[0], base[1], tip[0], tip[1], FWING_V);
};

const glidelet: Recipe = (p, pose) => {
  p.circle(9, 30, 1.2, SPRAY).circle(14, 31, 1, SPRAY).circle(20, 30, 1.2, SPRAY);
  fishWing(p, [15, 18], [24, 8], [21, 19]);
  p.poly([[23, 20], [30, 15], [29, 24]], FFISH);
  p.ellipse(15, 21, 9, 5.5, FFISH);
  p.paintEllipse(14, 24, 7, 2.2, FBELLY);
  p.shade();
  p.eyes(8, 19, 5, 3, pose).mouth(9, 23, pose).blush(7, 22).blush(13, 22);
};

const skimfin: Recipe = (p, pose) => {
  for (const [x, y] of [[4, 29], [11, 31], [19, 30], [26, 31]] as const) p.circle(x, y, 1.1, SPRAY);
  fishWing(p, [13, 16], [26, 3], [23, 17]);
  fishWing(p, [12, 21], [20, 28], [18, 22]);
  p.poly([[25, 18], [32, 12], [31, 23]], FFISH);
  p.ellipse(14, 19, 11, 5.5, FFISH);
  p.paintEllipse(13, 22, 9, 2.2, FBELLY);
  p.line(2, 10, 8, 10, SPRAY).line(4, 13, 9, 13, SPRAY);
  p.shade();
  p.eyes(6, 17, 5, 3, pose).mouth(7, 21, pose).blush(5, 20).blush(11, 20);
};

const galefin: Recipe = (p, pose) => {
  for (const [x, y] of [[3, 30], [10, 31], [18, 30], [25, 31], [30, 29]] as const) p.circle(x, y, 1.2, SPRAY);
  // four wing fins, like the real four-winged flying fish
  fishWing(p, [13, 14], [27, 1], [24, 15]);
  fishWing(p, [11, 14], [17, 2], [16, 14]);
  fishWing(p, [12, 21], [22, 29], [19, 21]);
  p.poly([[26, 17], [32, 10], [32, 24]], FFISH);
  p.poly([[10, 12], [16, 7], [20, 13]], darken(FFISH, 0.12));
  p.ellipse(15, 18, 12, 6, FFISH);
  p.paintEllipse(14, 21, 10, 2.4, FBELLY);
  p.paintEllipse(15, 15, 9, 1, lighten(FFISH, 0.25));
  p.shade();
  p.eyes(6, 16, 5, 3, pose).mouth(7, 20, pose).blush(5, 19).blush(11, 19);
};

// ---------------------------------------------------------------------------------------------
// Frost: springtails ("snow fleas": tiny hoppers with a spring under their tail)
const SPR = 0xc0ccf2, SPR_D = 0x8e9ad6, SPR_L = 0xe4eaff, FLAKE = 0xffffff, ICEB = 0xa8e0ff;

/** The spring under its tail (a forked "furcula" folded forward) and jointed antennae. */
const furcula = (p: Painter, x: number, y: number, len: number) => { p.stroke([[x, y], [x + len * 0.4, y + 2], [x - len * 0.6, y + 2.5]], 0.55, SPR_D); };
const antennae = (p: Painter, x: number, y: number, len: number) => {
  p.stroke([[x, y], [x - len * 0.5, y - len * 0.6], [x - len, y - len * 0.7]], 0.4, SPR_D);
  p.stroke([[x + 3, y], [x + 2, y - len * 0.7], [x + 1, y - len]], 0.4, SPR_D);
  p.dot(x - len, y - len * 0.7, FLAKE).dot(x + 1, y - len, FLAKE);
};
/** A body of three soft segments, the last one round and plump. */
const segments = (p: Painter, x: number, y: number, k: number) => {
  p.ellipse(x + 13 * k, y, 6 * k, 5.5 * k, SPR);
  p.ellipse(x + 7 * k, y - 0.5, 5.5 * k, 5.5 * k, SPR);
  p.ellipse(x, y, 6 * k, 6 * k, SPR);
  p.paintEllipse(x + 6 * k, y - 4 * k, 9 * k, 1.4, SPR_L);
};

const snowskip: Recipe = (p, pose) => {
  furcula(p, 22, 25, 8);
  p.ellipse(10, 28, 1.6, 1.2, SPR_D).ellipse(15, 28, 1.6, 1.2, SPR_D);
  segments(p, 10, 21, 0.85);
  antennae(p, 7, 16, 6);
  p.shade();
  p.shine(18, 20).shine(21, 22);
  p.eyes(5, 20, 6, 3, pose).mouth(7, 24, pose).blush(4, 23).blush(12, 23);
};

const springfrost: Recipe = (p, pose) => {
  furcula(p, 24, 25, 10);
  p.ellipse(9, 28, 2, 1.3, SPR_D).ellipse(15, 28, 2, 1.3, SPR_D).ellipse(21, 28, 2, 1.3, SPR_D);
  segments(p, 10, 20, 1);
  // a fluffy frost coat along its back
  for (const x of [8, 13, 18, 23]) p.circle(x, 14, 2.3, SPR_L);
  antennae(p, 6, 14, 8);
  p.shade();
  p.eyes(4, 19, 6, 3, pose).mouth(6, 23, pose).blush(3, 22).blush(11, 22);
};

const bounceberg: Recipe = (p, pose) => {
  furcula(p, 26, 26, 12);
  p.ellipse(8, 29, 2.4, 1.5, SPR_D).ellipse(15, 29, 2.4, 1.5, SPR_D).ellipse(22, 29, 2.4, 1.5, SPR_D);
  segments(p, 9, 21, 1.15);
  // little icebergs riding on its back
  p.poly([[9, 14], [12, 6], [15, 13]], ICEB).poly([[15, 13], [19, 3], [23, 13]], ICEB).poly([[22, 14], [25, 8], [28, 15]], ICEB);
  antennae(p, 5, 15, 8);
  p.shade();
  p.shine(18, 6).shine(12, 9);
  p.eyes(3, 20, 7, 3, pose).mouth(6, 25, pose).blush(2, 24).blush(12, 24);
};

// ---------------------------------------------------------------------------------------------
// Volt: elephantnose fish (they make a weak electric field to "see" in muddy rivers)
const ENF = 0x7a6aa0, ENF_D = 0x56487a, ENF_L = 0xb0a4d4, ZIP = 0xffe04a, RIVER = 0x8fc0d8;

const chinspark: Recipe = (p, pose) => {
  p.ellipse(8, 31, 3, 0.8, RIVER).ellipse(20, 31, 4, 0.8, RIVER);
  p.poly([[22, 19], [29, 14], [29, 25]], ENF_D);
  p.ellipse(15, 20, 9, 6, ENF);
  // the long, bendy chin it feels around with
  p.stroke([[7, 23], [4, 26], [3, 29]], 1.2, ENF);
  p.paintEllipse(15, 23, 7, 2, ENF_L);
  p.shade();
  p.dot(1, 29, ZIP).dot(2, 31, ZIP).dot(5, 30, ZIP);
  p.eyes(9, 18, 5, 3, pose).mouth(10, 22, pose).blush(8, 21).blush(14, 21);
};

const zapsnoot: Recipe = (p, pose) => {
  p.ellipse(9, 31, 3, 0.8, RIVER).ellipse(22, 31, 4, 0.8, RIVER);
  p.poly([[24, 17], [31, 11], [31, 25]], ENF_D);
  p.poly([[12, 13], [18, 9], [21, 14]], ENF_D);
  p.ellipse(15, 19, 11, 6.5, ENF);
  p.stroke([[6, 22], [2, 25], [2, 29], [4, 30]], 1.3, ENF);
  p.paintEllipse(15, 22, 9, 2.2, ENF_L);
  // zigzag lightning stripes
  p.stroke([[14, 15], [16, 18], [18, 15], [20, 18], [22, 15]], 0.45, ZIP);
  p.shade();
  p.dot(5, 31, ZIP).dot(1, 31, ZIP).dot(6, 28, ZIP);
  p.eyes(7, 17, 5, 3, pose).mouth(8, 21, pose).blush(6, 20).blush(12, 20);
};

const voltrunk: Recipe = (p, pose) => {
  p.ellipse(10, 31, 3.5, 0.8, RIVER).ellipse(24, 31, 4.5, 0.8, RIVER);
  p.poly([[25, 15], [32, 8], [32, 25]], ENF_D);
  p.poly([[10, 11], [17, 5], [23, 12]], ENF_D);
  p.ellipse(15, 18, 12, 7, ENF);
  // its long snout ends in a glowing tip, with rings of its electric field around it
  p.stroke([[5, 21], [1, 23], [1, 28]], 1.4, ENF);
  p.circle(1.5, 29, 1.6, ZIP);
  p.paintEllipse(15, 21, 10, 2.4, ENF_L);
  p.stroke([[12, 13], [14, 17], [16, 13], [18, 17], [20, 13], [22, 17]], 0.45, ZIP);
  p.shade();
  for (const [x, y] of [[5, 31], [7, 27], [0, 25]] as const) p.dot(x, y, ZIP);
  p.eyes(7, 16, 5, 3, pose).mouth(8, 20, pose).blush(6, 19).blush(12, 19);
};

// ---------------------------------------------------------------------------------------------
// Glow: pyrosomes (glowing tube colonies of tiny sea animals that light up when touched)
const PYRO = 0xd8c8f4, PYRO_D = 0xa894d8, PYRO_L = 0xf0e8ff, PGLOW = 0x8ff5e6, BUBBLE = 0xe8fbff;

/** Glowing bumps all over the tube (each bump is one of the tiny animals in the colony). */
const glowBumps = (p: Painter, pts: readonly [number, number][]) => { for (const [x, y] of pts) p.dot(x, y, PGLOW); };
/** A tube lying on its side, closed at the face end (left), open at the right with a ring of light. */
const tube = (p: Painter, x0: number, x1: number, y: number, r: number) => {
  for (let x = x0 + r * 0.8; x < x1 - r * 0.6; x += 3) { p.circle(x, y - r + 0.5, 1.2, PYRO); p.circle(x + 1.5, y + r - 0.5, 1.2, PYRO); }
  p.ellipse((x0 + x1) / 2, y, (x1 - x0) / 2, r, PYRO);
  p.ellipse(x1 - 1, y, r * 0.45, r * 0.95, PYRO_D);
  p.paintEllipse(x1 - 1, y, r * 0.25, r * 0.6, PGLOW);
  p.paintEllipse((x0 + x1) / 2, y - r * 0.55, (x1 - x0) * 0.35, r * 0.2, PYRO_L);
};

const glimmerpod: Recipe = (p, pose) => {
  p.circle(27, 10, 1, BUBBLE).circle(29, 7, 0.8, BUBBLE);
  tube(p, 4, 28, 20, 7);
  p.shade();
  glowBumps(p, [[14, 15], [19, 14], [23, 16], [16, 25], [21, 25], [24, 22], [12, 24]]);
  p.eyes(7, 18, 6, 3, pose).mouth(9, 23, pose).blush(6, 22).blush(14, 22);
};

const lumitube: Recipe = (p, pose) => {
  for (const [x, y, r] of [[29, 8, 1.2], [31, 4, 0.9], [26, 5, 0.8]] as const) p.circle(x, y, r, BUBBLE);
  tube(p, 2, 30, 19, 8.5);
  p.shade();
  glowBumps(p, [[14, 13], [18, 12], [22, 13], [26, 15], [15, 26], [19, 27], [23, 26], [27, 23], [11, 25], [20, 19], [24, 20]]);
  p.eyes(6, 17, 6, 3, pose).mouth(8, 22, pose).blush(5, 21).blush(13, 21);
};

const pyrolanterne: Recipe = (p, pose) => {
  for (const [x, y, r] of [[28, 4, 1.3], [26, 1.5, 0.9], [30, 7.5, 0.8]] as const) p.circle(x, y, r, BUBBLE);
  // the main tube, with two young tubes budding off it (all inside the 32×32 space, open ends too)
  tube(p, 16, 29, 9, 4);
  tube(p, 17, 29, 28, 3.5);
  tube(p, 1, 28, 18, 9.5);
  p.shade();
  glowBumps(p, [[14, 11], [18, 10], [22, 11], [26, 13], [14, 26], [18, 27], [22, 26], [26, 23], [20, 17], [24, 18], [28, 18], [22, 7], [26, 8], [23, 28]]);
  p.eyes(5, 16, 7, 3, pose).mouth(8, 22, pose).blush(4, 21).blush(14, 21);
};

// ---------------------------------------------------------------------------------------------
// Leaf guardian: the banyan tree (one tree whose hanging roots grow into a whole grove)
const BANYAN = 0x9a7650, BANYAN_D = 0x6e5236, CANOPY = 0x3f9a55, CANOPY_L = 0x6fc46a, AERIAL = 0xb89468, LANTERNY = 0xffd86b;

const verdanyan: Recipe = (p, pose) => {
  // prop roots arching down into the ground like extra trunks, and a few thin hanging roots
  p.stroke([[9, 14], [4, 20], [3, 30]], 1.2, BANYAN_D).stroke([[23, 14], [28, 20], [29, 30]], 1.2, BANYAN_D);
  for (const [x, y1] of [[7, 21], [12, 18], [21, 19], [26, 22]] as const) p.stroke([[x, 12], [x, y1]], 0.35, AERIAL);
  p.ellipse(16, 22, 8.5, 9, BANYAN);
  p.ellipse(10, 30, 3.5, 1.5, BANYAN_D).ellipse(22, 30, 3.5, 1.5, BANYAN_D);
  // the canopy fits the 32×32 design space, so even the small sprites show its round top
  for (const [x, y, r] of [[4.2, 12, 4], [9, 8.5, 5.5], [16, 7, 6.5], [23, 8.5, 5.5], [27.8, 12, 4], [16, 12, 5]] as const) p.circle(x, y, r, CANOPY);
  for (const [x, y] of [[7, 6.5], [16, 3], [25, 6.5], [12, 11], [21, 11]] as const) p.paintEllipse(x, y, 2.2, 1.1, CANOPY_L);
  p.paintEllipse(16, 26, 5, 3, lighten(BANYAN, 0.15));
  p.shade();
  // little glowing seeds in the canopy, like lanterns
  for (const [x, y] of [[5, 13], [27, 13], [11, 9], [21, 9]] as const) p.dot(x, y, LANTERNY);
  p.eyes(11, 19, 8, 3, pose).mouth(15, 24, pose).blush(10, 23).blush(21, 23);
};

/** In Field Guide order after the 52: families first, then the guardian. */
export const NEW_RECIPES: Record<string, Recipe> = {
  puffbit, puffbeetle, geyserguard,
  stiltsprout, wadewood, mangromere,
  sprigling, twigstride, leafwarden,
  lithlet, lithopsy, stonebloom,
  glidelet, skimfin, galefin,
  snowskip, springfrost, bounceberg,
  chinspark, zapsnoot, voltrunk,
  glimmerpod, lumitube, pyrolanterne,
  verdanyan,
};
