// The eight resident villagers and the three island NPCs. All original characters.
import type { Species } from '../render/models/character';

export type Personality = 'sunny' | 'gruff' | 'bookish' | 'sporty' | 'dapper' | 'spunky' | 'dreamy' | 'mellow';

export type Activity = 'home' | 'wander' | 'plaza' | 'beach' | 'river' | 'forest' | 'museum' | 'shop';

export interface ScheduleEntry {
  /** hour this activity starts */
  from: number;
  act: Activity;
}

export interface CharacterLook {
  species: Species;
  fur: number;
  accent: number;
  outfit: number;
  eyes: number;
  blush: boolean;
}

export interface VillagerDef {
  id: string;
  name: string;
  personality: Personality;
  look: CharacterLook;
  /** a little verbal flourish they tack onto sentences */
  catchphrase: string;
  bio: string;
  /** item preference tags */
  likes: string[];
  dislikes: string[];
  /** a specific item they adore */
  favorite: string;
  /** villager home palette index */
  homeColor: number;
  /** speech blip pitch multiplier */
  voice: number;
  schedule: ScheduleEntry[];
  /** recipes given at heart milestones (2 and 3 hearts) */
  heartRecipes: string[];
  /** a furniture piece given at 5 hearts */
  heartGift: string;
  /** unique lines, sprinkled into chat */
  unique: string[];
}

const SCHED: Record<Personality, ScheduleEntry[]> = {
  sunny: [
    { from: 0, act: 'home' },
    { from: 7, act: 'plaza' },
    { from: 10, act: 'wander' },
    { from: 12, act: 'home' },
    { from: 13, act: 'beach' },
    { from: 16, act: 'plaza' },
    { from: 20, act: 'wander' },
    { from: 22, act: 'home' },
  ],
  gruff: [
    { from: 0, act: 'home' },
    { from: 6, act: 'forest' },
    { from: 11, act: 'wander' },
    { from: 13, act: 'home' },
    { from: 15, act: 'river' },
    { from: 19, act: 'plaza' },
    { from: 21, act: 'home' },
  ],
  bookish: [
    { from: 0, act: 'home' },
    { from: 8, act: 'museum' },
    { from: 12, act: 'home' },
    { from: 14, act: 'wander' },
    { from: 15, act: 'museum' },
    { from: 18, act: 'plaza' },
    { from: 22, act: 'home' },
  ],
  sporty: [
    { from: 0, act: 'home' },
    { from: 5, act: 'beach' },
    { from: 9, act: 'wander' },
    { from: 12, act: 'river' },
    { from: 14, act: 'home' },
    { from: 16, act: 'beach' },
    { from: 20, act: 'plaza' },
    { from: 22, act: 'home' },
  ],
  dapper: [
    { from: 0, act: 'home' },
    { from: 9, act: 'shop' },
    { from: 12, act: 'plaza' },
    { from: 15, act: 'home' },
    { from: 17, act: 'wander' },
    { from: 18, act: 'plaza' },
    { from: 23, act: 'home' },
  ],
  spunky: [
    { from: 0, act: 'home' },
    { from: 7, act: 'forest' },
    { from: 10, act: 'river' },
    { from: 13, act: 'wander' },
    { from: 15, act: 'home' },
    { from: 17, act: 'forest' },
    { from: 21, act: 'home' },
  ],
  dreamy: [
    { from: 0, act: 'home' },
    { from: 9, act: 'wander' },
    { from: 12, act: 'river' },
    { from: 15, act: 'beach' },
    { from: 17, act: 'home' },
    { from: 19, act: 'plaza' },
    { from: 23, act: 'home' },
  ],
  mellow: [
    { from: 0, act: 'wander' },
    { from: 2, act: 'home' },
    { from: 11, act: 'beach' },
    { from: 14, act: 'home' },
    { from: 16, act: 'wander' },
    { from: 18, act: 'plaza' },
    { from: 21, act: 'wander' },
  ],
};

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'tansy',
    name: 'Tansy',
    personality: 'sunny',
    look: { species: 'redpanda', fur: 0xe07a4a, accent: 0xfff1e0, outfit: 0xffd36b, eyes: 1, blush: true },
    catchphrase: 'sunbeam',
    bio: 'A red panda baker who greets every morning like an old friend.',
    likes: ['food', 'sweet', 'cute'],
    dislikes: ['spooky'],
    favorite: 'fruit_blushpear',
    homeColor: 0,
    voice: 1.25,
    schedule: SCHED.sunny,
    heartRecipes: ['r_furn_teacup_table', 'r_furn_picnic_spread'],
    heartGift: 'furn_cider_barrel',
    unique: ['[happy]I tried baking bread with seawater once. Do not recommend, {catch}!', "[happy]When the plaza smells like cinnamon, that's me. You're welcome!"],
  },
  {
    id: 'rusk',
    name: 'Rusk',
    personality: 'gruff',
    look: { species: 'badger', fur: 0x6f6a7a, accent: 0xf4f1ea, outfit: 0x7fa36b, eyes: 0, blush: false },
    catchphrase: 'hrmph',
    bio: 'A badger gardener with dirt under his claws and a soft spot for seedlings.',
    likes: ['nature', 'plain', 'cozy'],
    dislikes: ['fancy', 'shiny'],
    favorite: 'flower_bell_purple',
    homeColor: 2,
    voice: 0.75,
    schedule: SCHED.gruff,
    heartRecipes: ['r_furn_honeycomb_dresser', 'r_furn_bellbloom_vase'],
    heartGift: 'furn_terracotta_planter',
    unique: ["[neutral]Weeds aren't bad. They're just plants nobody's bothered to love, {catch}.", '[smug]Water in the morning, not at noon. Roots like a cool drink.'],
  },
  {
    id: 'bellamy',
    name: 'Bellamy',
    personality: 'bookish',
    look: { species: 'platypus', fur: 0x9a7a5e, accent: 0xe8d6c0, outfit: 0x9fb4e0, eyes: 3, blush: false },
    catchphrase: 'quite so',
    bio: 'A platypus scholar who keeps three notebooks and loses at least two.',
    likes: ['science', 'retro', 'plain'],
    dislikes: ['sporty'],
    favorite: 'shell_cowrie',
    homeColor: 1,
    voice: 1.0,
    schedule: SCHED.bookish,
    heartRecipes: ['r_furn_storyteller_bookcase', 'r_furn_starmap_globe'],
    heartGift: 'furn_scribbler_desk',
    unique: ['[surprised]Did you know some fossils are older than the sea itself? Well, nearly, {catch}.', '[happy]A good footnote is like a good snack. Small, satisfying, slightly crumbly.'],
  },
  {
    id: 'juno',
    name: 'Juno',
    personality: 'sporty',
    look: { species: 'quokka', fur: 0xc9a07a, accent: 0xf6e3cc, outfit: 0x7fd3c8, eyes: 0, blush: true },
    catchphrase: 'go go',
    bio: 'A quokka who jogs the beach at dawn and has never once stopped smiling.',
    likes: ['sporty', 'sea', 'food'],
    dislikes: ['spooky', 'fancy'],
    favorite: 'fruit_seacoconut',
    homeColor: 5,
    voice: 1.15,
    schedule: SCHED.sporty,
    heartRecipes: ['r_furn_keepsake_frame', 'r_furn_seabreeze_hammock'],
    heartGift: 'furn_tideside_bench',
    unique: ['[happy]Forty laps of the beach before breakfast, {catch}! Or four. I lost count.', '[smug]Fishing is a sport. Patience is a muscle!'],
  },
  {
    id: 'percival',
    name: 'Percival',
    personality: 'dapper',
    look: { species: 'armadillo', fur: 0xb9a8b8, accent: 0xefe3e8, outfit: 0xa58fe0, eyes: 2, blush: false },
    catchphrase: 'indeed',
    bio: 'An armadillo of impeccable taste whose shell is polished every Sunday.',
    likes: ['fancy', 'shiny', 'music'],
    dislikes: ['plain', 'spooky'],
    favorite: 'shell_pearl',
    homeColor: 4,
    voice: 0.9,
    schedule: SCHED.dapper,
    heartRecipes: ['r_furn_lullaby_piano', 'r_furn_hootwhistle_clock'],
    heartGift: 'furn_marshmallow_loveseat',
    unique: ['[smug]A gentle-creature never hurries. Except toward a fresh pot of tea, {catch}.', '[happy]Pearls are simply the sea showing off. I approve.'],
  },
  {
    id: 'kip',
    name: 'Kip',
    personality: 'spunky',
    look: { species: 'lemur', fur: 0xa9a2b2, accent: 0xf8f4f0, outfit: 0xf28f7c, eyes: 1, blush: false },
    catchphrase: 'zoop',
    bio: 'A lemur explorer who has climbed every tree on the island. Twice.',
    likes: ['nature', 'sporty', 'retro'],
    dislikes: ['fancy'],
    favorite: 'bug_glowdrop_firefly',
    homeColor: 6,
    voice: 1.3,
    schedule: SCHED.spunky,
    heartRecipes: ['r_furn_wrenhaven_birdhouse', 'r_furn_glowcap_lamp'],
    heartGift: 'furn_pebble_owl_statue',
    unique: ["[surprised]Heard a buzz in the canopy, {catch}! Could've been a beetle. Could've been my tummy.", '[happy]The cliffs up north? I bet the view goes forever.'],
  },
  {
    id: 'mochi',
    name: 'Mochi',
    personality: 'dreamy',
    look: { species: 'axolotl', fur: 0xffb8d0, accent: 0xff7fa8, outfit: 0xc9b8f0, eyes: 2, blush: true },
    catchphrase: 'bloop',
    bio: 'An axolotl painter who sees colors in raindrops and stars in puddles.',
    likes: ['artsy', 'cute', 'sea'],
    dislikes: ['sporty', 'plain'],
    favorite: 'flower_moon_blue',
    homeColor: 3,
    voice: 1.35,
    schedule: SCHED.dreamy,
    heartRecipes: ['r_furn_daydream_easel', 'r_furn_moonbeam_lamp'],
    heartGift: 'furn_wavesong_painting',
    unique: ['[sleepy]I painted the rain today. It came out mostly blue, {catch}.', "[happy]Clouds are just the sky's sketchbook, don't you think?"],
  },
  {
    id: 'marlowe',
    name: 'Marlowe',
    personality: 'mellow',
    look: { species: 'opossum', fur: 0xd8d2dc, accent: 0xf6f1f4, outfit: 0x8fbfe0, eyes: 2, blush: false },
    catchphrase: 'mmhm',
    bio: 'An opossum stargazer who naps all afternoon and knows every constellation.',
    likes: ['cozy', 'science', 'music'],
    dislikes: ['sporty'],
    favorite: 'glowstone',
    homeColor: 7,
    voice: 0.8,
    schedule: SCHED.mellow,
    heartRecipes: ['r_furn_stargazer_telescope', 'r_furn_puffcloud_sofa'],
    heartGift: 'furn_bubble_tv',
    unique: ['[sleepy]Some nights the stars hum, {catch}. You just have to lie very still.', '[happy]A nap is a tiny holiday you can take anywhere.'],
  },
];

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  look: CharacterLook;
  voice: number;
}

export const NPCS: NpcDef[] = [
  { id: 'pemberly', name: 'Pemberly', title: 'Lantern Hall', look: { species: 'capybara', fur: 0xb98a5e, accent: 0xe8c9a0, outfit: 0x7cc7c2, eyes: 2, blush: true }, voice: 0.95 },
  { id: 'fennimore', name: 'Fennimore', title: 'Shopkeeper', look: { species: 'pangolin', fur: 0xc9a27a, accent: 0xf2d6be, outfit: 0xf28f7c, eyes: 0, blush: false }, voice: 1.1 },
  { id: 'vesper', name: 'Professor Vesper', title: 'Curator', look: { species: 'bat', fur: 0x8a7a9a, accent: 0xf3d6c8, outfit: 0xb9a6e0, eyes: 1, blush: false }, voice: 1.05 },
];

export const VILLAGER_BY_ID: Record<string, VillagerDef> = Object.fromEntries(VILLAGERS.map((v) => [v.id, v]));
export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));

/** Friendship points per heart (5 hearts = 100). */
export const HEART = 20;
