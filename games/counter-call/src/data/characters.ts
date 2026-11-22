/**
 * The cast: a character registry. Everyone here is invented for Counter Call.
 *
 * A character is only data: the 3D model (render/chibi.ts) and the face (render/faces.ts) are
 * built from `look`, so adding a friend means adding one entry to CHARACTERS and nothing else.
 *
 * The six hosts (the characters you can play as) come from hand-drawn design sheets:
 * - Minty: a puffy fringe, two droopy twin tails, a bun with a hair stick, teal arch eyes,
 *   a bow tie and a buttoned shirt.
 * - Single Scoop: one big scoop of a bun with a ruffled edge, a swept fringe, chunky tails with
 *   zigzag ties, a frilly bow, puffy sleeves and a round skirt with a zigzag trim.
 * - Double Scoop: two scoop buns with a waffle wafer, big waffle-block twin tails, blue arch
 *   eyes, a bow tie and a big bow at the back.
 * - Vanilla: golden waves that end in a curl, a big bun with a wafer stick in it, a flower clip,
 *   a flower at the collar, wide bell sleeves and curly ribbons at the hips.
 * - Raspberry: a bun like a raspberry, a bow bigger than her head, short side locks, a collar bow
 *   with a red gem and an apron with a pocket.
 * - Cookie Cream: two clouds of cream hair dotted with cookie crumbs, a fringe striped with cookie,
 *   a cookie of a bun with two wafer sticks, and a belted coat with crumb-spotted tails.
 * Each host has a perk, a small way they are better at running the counter (sim.ts, modsFor).
 */
import type { FoodId } from './menu';

export type HairStyle = 'twintailBun' | 'scoopBun' | 'doubleScoop' | 'vanillaCurls' | 'berryBow' | 'cookieCream' | 'bob' | 'short' | 'spiky' | 'pony' | 'puffs' | 'curly' | 'long' | 'bun' | 'bald';
/** 'arches' is the hosts' hand-drawn pair of tall arches. 'sketch' is a wink: one arch and one smile-shaped eye. */
export type EyeStyle = 'sketch' | 'arches' | 'dot' | 'sparkle' | 'oval' | 'sleepy';
export type OutfitStyle = 'shirt' | 'bubble' | 'bell' | 'apron' | 'coat' | 'dress' | 'overalls' | 'hoodie' | 'tee';
export type Accessory = 'bowtie' | 'cravat' | 'backbow' | 'wafer' | 'flowerbow' | 'waferstick' | 'wafersticks' | 'gembow' | 'hairpin' | 'glasses' | 'cap' | 'flower' | 'headband' | 'scarf' | 'mustache' | 'star' | 'bow';

export interface ChibiLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: EyeStyle;
  /** Iris color ('sparkle' eyes) or the whole eye ('sketch' eyes). */
  eyeColor?: string;
  mouth?: 'smile' | 'none';
  outfitStyle: OutfitStyle;
  /** Top (or the whole dress). */
  outfit: string;
  /** Skirt, shorts or trousers. */
  outfit2?: string;
  /** Bows, ties, trims and clips. */
  accent: string;
  shoes: string;
  socks?: string;
  accessories?: Accessory[];
  blush?: boolean;
  /** 1 = normal size; little kids are smaller. */
  scale?: number;
}

export type PerkId = 'quick' | 'charm' | 'hands' | 'chef' | 'treats' | 'tips';
/** What a host is especially good at. */
export interface Perk { id: PerkId; name: string; text: string }

export interface CharacterDef {
  id: string;
  name: string;
  /** Hosts are the characters you can play as; guests are the friends who visit. */
  role: 'host' | 'guest';
  perk?: Perk;
  /** One line about them, for menus. */
  about: string;
  look: ChibiLook;
  /** Portrait background color. */
  bg: string;
  /** Pitch of their little voice chirp (1 = middle). */
  voice: number;
  /** The food they hope to order, and tip extra for. */
  favorite?: FoodId;
  /** How long they are happy to wait (1 = normal, higher = more patient). */
  patience: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'minty', name: 'Minty', role: 'host', about: 'Runs the counter and never drops a tray.', bg: '#bdeee6', voice: 1.35, patience: 1,
    perk: { id: 'quick', name: 'Quick feet', text: 'Walks faster.' },
    look: {
      skin: '#ffe2cc', hair: '#4cc3d2', hairStyle: 'twintailBun', eyes: 'arches', eyeColor: '#17647c', mouth: 'smile',
      outfitStyle: 'shirt', outfit: '#ffffff', outfit2: '#2f5d8a', accent: '#1d8fa8', shoes: '#1d8fa8', socks: '#ffffff',
      accessories: ['bowtie', 'hairpin'], blush: true,
    },
  },
  {
    id: 'single', name: 'Single Scoop', role: 'host', about: 'One big scoop of sweetness and a smile for everyone.', bg: '#ffd0dc', voice: 1.55, patience: 1,
    perk: { id: 'charm', name: 'Sweet smile', text: 'Friends wait longer.' },
    look: {
      skin: '#ffe6d5', hair: '#ff8fb0', hairStyle: 'scoopBun', eyes: 'arches', eyeColor: '#62677a', mouth: 'smile',
      outfitStyle: 'bubble', outfit: '#ffffff', outfit2: '#fff1e6', accent: '#e8425a', shoes: '#e8425a',
      accessories: ['cravat'], blush: true,
    },
  },
  {
    id: 'double', name: 'Double Scoop', role: 'host', about: 'Two scoops, one waffle and room for everything.', bg: '#ffe0b8', voice: 1.15, patience: 1,
    perk: { id: 'hands', name: 'Double hands', text: 'Carries one more thing.' },
    look: {
      skin: '#ffe2cc', hair: '#8f5846', hairStyle: 'doubleScoop', eyes: 'arches', eyeColor: '#2f86c9', mouth: 'smile',
      outfitStyle: 'shirt', outfit: '#ffffff', outfit2: '#8f5846', accent: '#e2574c', shoes: '#6b3f30', socks: '#ffffff',
      accessories: ['bowtie', 'backbow', 'wafer'], blush: true,
    },
  },
  {
    id: 'vanilla', name: 'Vanilla', role: 'host', about: 'Golden curls, a wafer in her bun and the calmest kitchen in town.', bg: '#fff0bf', voice: 1.3, patience: 1,
    perk: { id: 'chef', name: 'Quick cook', text: 'Food cooks faster.' },
    look: {
      skin: '#ffe6d5', hair: '#ffd766', hairStyle: 'vanillaCurls', eyes: 'arches', eyeColor: '#62677a', mouth: 'smile',
      outfitStyle: 'bell', outfit: '#fffdf2', outfit2: '#ffeab0', accent: '#f0b429', shoes: '#f0b429',
      accessories: ['flowerbow', 'waferstick'], blush: true,
    },
  },
  {
    id: 'raspberry', name: 'Raspberry', role: 'host', about: 'A berry of a bun, a bow bigger than her head and cake for everyone.', bg: '#ffc9d6', voice: 1.45, patience: 1,
    perk: { id: 'treats', name: 'Sweet treat', text: 'One more round of free cake.' },
    look: {
      skin: '#ffe2cc', hair: '#e0457b', hairStyle: 'berryBow', eyes: 'arches', eyeColor: '#4a4a57', mouth: 'smile',
      outfitStyle: 'apron', outfit: '#ffffff', outfit2: '#c9285a', accent: '#e2263f', shoes: '#e2263f',
      accessories: ['gembow'], blush: true,
    },
  },
  {
    id: 'cookie', name: 'Cookie Cream', role: 'host', about: 'Clouds of cream hair full of cookie crumbs, and a coat with crumbs to match.', bg: '#ead9c4', voice: 1.05, patience: 1,
    perk: { id: 'tips', name: 'Lucky cookie', text: 'Every happy friend tips one more coin.' },
    look: {
      skin: '#ffe6d5', hair: '#fff6e6', hairStyle: 'cookieCream', eyes: 'arches', eyeColor: '#4a3a34', mouth: 'smile',
      outfitStyle: 'coat', outfit: '#fffaf0', outfit2: '#e6d8c3', accent: '#9a5a2e', shoes: '#f6ead8',
      accessories: ['bowtie', 'wafersticks'], blush: true,
    },
  },
  {
    id: 'pim', name: 'Pim', role: 'guest', about: 'Always hungry after football.', bg: '#c9eeb8', voice: 1.0, favorite: 'fries', patience: 1,
    look: { skin: '#f6cfa6', hair: '#7a4a2b', hairStyle: 'short', eyes: 'dot', outfitStyle: 'hoodie', outfit: '#7ac36a', outfit2: '#4a5a8a', accent: '#ffffff', shoes: '#f25f5c', blush: true },
  },
  {
    id: 'rosa', name: 'Rosa', role: 'guest', about: 'Draws every meal before she eats it.', bg: '#ffe3a8', voice: 1.5, favorite: 'icecream', patience: 1.1,
    look: { skin: '#ffd9c0', hair: '#e2574c', hairStyle: 'bob', eyes: 'sparkle', eyeColor: '#3a8d54', outfitStyle: 'dress', outfit: '#ffd35c', accent: '#ff8fab', shoes: '#ffffff', accessories: ['flower'], blush: true },
  },
  {
    id: 'juno', name: 'Juno', role: 'guest', about: 'Builds robots out of cereal boxes.', bg: '#ffd0a8', voice: 1.2, favorite: 'juice', patience: 0.95,
    look: { skin: '#8d5a3b', hair: '#2b1a12', hairStyle: 'puffs', eyes: 'dot', outfitStyle: 'overalls', outfit: '#fff3d6', outfit2: '#f08a3c', accent: '#f08a3c', shoes: '#ffffff', accessories: ['glasses'] },
  },
  {
    id: 'taro', name: 'Taro', role: 'guest', about: 'Skateboards everywhere, even indoors.', bg: '#d6ccff', voice: 0.9, favorite: 'burger', patience: 0.85,
    look: { skin: '#f0c9a0', hair: '#23233a', hairStyle: 'spiky', eyes: 'oval', outfitStyle: 'tee', outfit: '#8b6fe0', outfit2: '#3b3f66', accent: '#ffd35c', shoes: '#ffd35c' },
  },
  {
    id: 'lula', name: 'Lula', role: 'guest', about: 'Sings to her ice cream so it stays happy.', bg: '#ffd0e4', voice: 1.6, favorite: 'icecream', patience: 1,
    look: { skin: '#ffe0d0', hair: '#f6d36b', hairStyle: 'pony', eyes: 'sparkle', eyeColor: '#4a90d9', outfitStyle: 'dress', outfit: '#ff9ec4', accent: '#ffffff', shoes: '#ffffff', accessories: ['bow'], blush: true },
  },
  {
    id: 'oats', name: 'Grandpa Oats', role: 'guest', about: 'Tells the same joke every day. It is still funny.', bg: '#c8dcff', voice: 0.65, favorite: 'pizza', patience: 1.5,
    look: { skin: '#eec3a0', hair: '#d9dde6', hairStyle: 'bald', eyes: 'sleepy', outfitStyle: 'hoodie', outfit: '#5b8bd9', outfit2: '#7a6a5a', accent: '#f4f1ea', shoes: '#5a4636', accessories: ['mustache', 'cap'] },
  },
  {
    id: 'nia', name: 'Nia', role: 'guest', about: 'Knows the name of every star.', bg: '#bfeee4', voice: 1.25, favorite: 'pizza', patience: 1.05,
    look: { skin: '#c68a5e', hair: '#3b2416', hairStyle: 'long', eyes: 'sparkle', eyeColor: '#8a5a2b', outfitStyle: 'shirt', outfit: '#5cc8b8', outfit2: '#f4f1ea', accent: '#ffd35c', shoes: '#ffd35c', socks: '#ffffff', accessories: ['headband'] },
  },
  {
    id: 'bo', name: 'Bo', role: 'guest', about: 'Small, fast and very, very hungry.', bg: '#ffc9c2', voice: 1.8, favorite: 'fries', patience: 0.8,
    look: { skin: '#f7d0aa', hair: '#d9784a', hairStyle: 'short', eyes: 'dot', outfitStyle: 'tee', outfit: '#f25f5c', outfit2: '#3f6fb5', accent: '#3f6fb5', shoes: '#ffffff', accessories: ['cap'], blush: true, scale: 0.84 },
  },
  {
    id: 'dot', name: 'Dot', role: 'guest', about: 'Collects buttons and bad puns.', bg: '#ffe0b8', voice: 1.1, favorite: 'burger', patience: 1,
    look: { skin: '#ffe3c8', hair: '#f08a3c', hairStyle: 'curly', eyes: 'oval', outfitStyle: 'overalls', outfit: '#ffffff', outfit2: '#5b8bd9', accent: '#f25f5c', shoes: '#f25f5c', accessories: ['scarf'], blush: true },
  },
  {
    id: 'kiko', name: 'Kiko', role: 'guest', about: 'Practises magic tricks with napkins.', bg: '#e3d6ff', voice: 1.4, favorite: 'juice', patience: 1,
    look: { skin: '#f2c9a5', hair: '#6b4fbf', hairStyle: 'bun', eyes: 'dot', outfitStyle: 'dress', outfit: '#c9b6ff', accent: '#ffd35c', shoes: '#6b4fbf', accessories: ['star'], blush: true },
  },
];

export const CHAR_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));
/** The characters you can play as. The first one is the default. */
export const HOSTS: CharacterDef[] = CHARACTERS.filter(c => c.role === 'host');
export const HOST: CharacterDef = HOSTS[0];
export const hostById = (id: string | undefined): CharacterDef => HOSTS.find(c => c.id === id) ?? HOST;
export const GUESTS: CharacterDef[] = CHARACTERS.filter(c => c.role === 'guest');
