// The sizzle reel as data: the timing grid, every shot and every line of text. The music, the
// compositions, the captions and the checks all read this file, so they cannot drift apart.
// Game titles, pitches, ages and logos come from games/<slug>/game.json and the site's media.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '../..');
export const sizzle = resolve(import.meta.dirname);

/** 124 BPM: a beat is 0.484 s, a bar 1.935 s; 31 bars are 60.0 s and 31 beats are 15.0 s. */
export const BPM = 124;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const FPS = 60;
/** Seconds at a beat (cuts and text land on beats or half beats). */
export const at = (beats: number) => +(beats * BEAT).toFixed(6);

/** A line stays on screen at least words ÷ 1.8 + 0.5 seconds (a 7-year-old's reading pace). */
export const minSeconds = (text: string) => text.split(/\s+/).filter(Boolean).length / 1.8 + 0.5;

export type Slug = 'calex-cart' | 'theabonk' | 'vanex-defense' | 'space-sky' | 'light-crossing' | 'cliff-valley' | 'tuck-pop' | 'agentmon' | 'fieldlark' | 'shooberry';

/** A piece of a recorded take (marketing/sizzle/captures/<slug>/<take>.mp4). */
export interface Shot {
  slug: Slug;
  take: string;
  /** Seconds after the take's marked cut where this shot starts (default 0). */
  from?: number;
  /** Zoom into the frame (1 = the whole 16:9 frame) around `focus`. */
  zoom?: number;
  /** Point of interest, 0–1 across and down the frame: the vertical cut is framed on it. */
  focus?: [number, number];
  /** The game's own sound under the music (linear gain; 0 or absent = silent). */
  sfx?: number;
  /** What the sound is, for the captions. */
  sound?: string;
}

const shot = (slug: Slug, take: string, extra: Omit<Shot, 'slug' | 'take'> = {}): Shot => ({ slug, take, ...extra });

/** Each game's three showcase shots in the 60-second reel, in the order they play (one bar each). */
export const REEL: Record<Exclude<Slug, 'tuck-pop' | 'agentmon' | 'fieldlark' | 'shooberry'>, { shots: [Shot, Shot, Shot]; describe: string }> = {
  'calex-cart': {
    describe: 'Karts drift, boost and glide through snowy, neon and canyon tracks.',
    shots: [
      shot('calex-cart', 'avalanche-drift', { from: 0.6, focus: [0.5, 0.62] }),
      shot('calex-cart', 'neon-boost', { from: 0.1, focus: [0.48, 0.6], sfx: 0.5, sound: 'a boost whooshes' }),
      shot('calex-cart', 'race-hud', { from: 0.2, focus: [0.5, 0.6] })
    ]
  },
  theabonk: {
    describe: 'Thea swings her glowing Bonk Ring through a crowd of cartoon monsters, levels up and meets Grumblecap.',
    shots: [
      shot('theabonk', 'horde', { from: 0.2, focus: [0.5, 0.5], sfx: 0.55, sound: 'bonk, bonk, bonk' }),
      shot('theabonk', 'level-up', { from: 0.9, zoom: 1.2, focus: [0.5, 0.5], sfx: 0.5, sound: 'a level-up chime' }),
      shot('theabonk', 'boss', { from: 1.25, focus: [0.5, 0.42] })
    ]
  },
  'vanex-defense': {
    describe: 'Towers zap enemies winding through a snowy maze and along a sky road, then a giant boss arrives.',
    shots: [
      shot('vanex-defense', 'frost-maze', { from: 0.4, focus: [0.18, 0.5], sfx: 0.5, sound: 'towers zap' }),
      shot('vanex-defense', 'sky-lane', { from: 0.3, focus: [0.42, 0.3] }),
      shot('vanex-defense', 'matriarch', { from: 7.9, zoom: 1.4, focus: [0.42, 0.24] })
    ]
  },
  'space-sky': {
    describe: 'A rocket flies past a ringed planet, lands on the Moon\'s glowing pad and explores icy Europa.',
    shots: [
      shot('space-sky', 'saturn', { from: 0.2, focus: [0.5, 0.5], sfx: 0.45, sound: 'a rocket boost' }),
      shot('space-sky', 'moon-landing', { from: 0, focus: [0.5, 0.55] }),
      shot('space-sky', 'europa', { from: 0.4, focus: [0.5, 0.6] })
    ]
  },
  'light-crossing': {
    describe: 'Skating through lantern rings on a frozen pond, the island in autumn and a cozy decorated home.',
    shots: [
      shot('light-crossing', 'skate', { from: 0.4, focus: [0.5, 0.55], sfx: 0.45, sound: 'skates swish' }),
      shot('light-crossing', 'autumn', { from: 0.2, focus: [0.5, 0.55] }),
      shot('light-crossing', 'home', { from: 0.2, zoom: 1.6, focus: [0.5, 0.58] })
    ]
  },
  'cliff-valley': {
    describe: 'Picking ripe crops on the farm, the snowy town square on Starlight Night and the crystal mine.',
    shots: [
      shot('cliff-valley', 'harvest', { from: 0.2, focus: [0.5, 0.5], sfx: 0.6, sound: 'harvest pops' }),
      shot('cliff-valley', 'festival', { from: 0.2, focus: [0.5, 0.5], sfx: 0.45, sound: 'a festival chime' }),
      shot('cliff-valley', 'mine', { from: 0.2, focus: [0.5, 0.5] })
    ]
  }
};

/** Showcase order: racing, action, strategy, space wonder, cozy island, farming. */
export const ORDER: Exclude<Slug, 'tuck-pop' | 'agentmon' | 'fieldlark' | 'shooberry'>[] = ['calex-cart', 'theabonk', 'vanex-defense', 'space-sky', 'light-crossing', 'cliff-valley'];

export interface Game { slug: Slug; title: string; tagline: string; ages: string; logo: string }
export function game(slug: Slug): Game {
  const m = JSON.parse(readFileSync(join(root, 'games', slug, 'game.json'), 'utf8'));
  return { slug, title: m.title, tagline: m.tagline, ages: `Ages ${m.ageRange}`, logo: join(root, 'apps/site/public/media', slug, 'logo.svg') };
}

/** Lines of text with the beat they land on; each stays until its block ends. */
export interface Line { text: string; at: number; size: 'headline' | 'line' | 'small' }

export type Block =
  | { kind: 'clip'; start: number; end: number; shot: Shot }
  | { kind: 'logo'; start: number; end: number; over?: Shot; /** A game's own logo instead of the brand's. */ slug?: Slug }
  | { kind: 'tagline'; start: number; end: number; lines: Line[]; bg: Shot[]; logo?: boolean }
  | { kind: 'game'; start: number; end: number; slug: Slug; textIn: number; textOut: number; shots: Shot[] }
  | { kind: 'montage'; start: number; end: number; shots: Shot[]; lines: Line[] }
  | { kind: 'promise'; start: number; end: number; lines: Line[] }
  | { kind: 'devices'; start: number; end: number; phone: Shot; tablet: Shot; lines: Line[] }
  | { kind: 'open'; start: number; end: number; lines: Line[] }
  | { kind: 'end'; start: number; end: number; lines: Line[] };

export interface Cut { id: string; beats: number; blocks: Block[] }

const PROMISE = ['No ads.', 'No subscriptions.', 'No sign-ups.', 'No tracking.'];
const coldOpen = shot('calex-cart', 'lantern-drift', { from: 0.1, focus: [0.5, 0.6], sfx: 0.5, sound: 'a kart engine and drift sparks' });
const PHONE = shot('calex-cart', 'phone', { from: 0.8 });
const TABLET = shot('cliff-valley', 'tablet', { from: 0.3 });
const montage = [shot('light-crossing', 'festival', { from: 0.3 }), shot('space-sky', 'saturn', { from: 2.2 })];

/** Times are in beats here; blocks are converted to seconds by `seconds()`. */
const reel60: Cut = {
  id: 'reel', beats: 124,
  blocks: [
    { kind: 'clip', start: 0, end: 6, shot: coldOpen },
    { kind: 'logo', start: 6, end: 8, over: { ...coldOpen, from: (coldOpen.from ?? 0) + at(6) } },
    { kind: 'tagline', start: 8, end: 20, bg: montage, lines: [{ text: 'The games kids love.', at: 8, size: 'headline' }, { text: 'None of the stuff parents don’t.', at: 12, size: 'headline' }] },
    ...ORDER.map((slug, i): Block => ({ kind: 'game', start: 20 + 12 * i, end: 32 + 12 * i, slug, textIn: 21 + 12 * i, textOut: 31.75 + 12 * i, shots: REEL[slug].shots })),
    { kind: 'promise', start: 92, end: 100, lines: PROMISE.map((text, i) => ({ text, at: 92 + i, size: 'headline' })) },
    { kind: 'devices', start: 100, end: 108, phone: PHONE, tablet: TABLET, lines: [{ text: 'Phones, tablets and computers', at: 101, size: 'headline' }] },
    { kind: 'open', start: 108, end: 116, lines: [
      { text: 'Free and open source.', at: 108, size: 'headline' },
      { text: 'Build your own.', at: 111, size: 'headline' },
      { text: 'github.com/msoyaph/AI-Kids-Games', at: 112, size: 'small' },
      { text: 'List your game: coming soon', at: 112, size: 'small' }
    ] },
    { kind: 'end', start: 116, end: 124, lines: [
      { text: 'The games kids love.', at: 116.5, size: 'line' },
      { text: 'aikids.games', at: 117, size: 'headline' },
      { text: 'Play free', at: 117.5, size: 'line' }
    ] }
  ]
};

/** 15 s: 31 beats. */
const reel15: Cut = {
  id: 'cutdown', beats: 31,
  blocks: [
    { kind: 'clip', start: 0, end: 4, shot: coldOpen },
    { kind: 'tagline', start: 4, end: 10, bg: montage, logo: true, lines: [{ text: 'The games kids love.', at: 4, size: 'headline' }] },
    { kind: 'montage', start: 10, end: 22, shots: ORDER.map(slug => REEL[slug].shots[0]), lines: [{ text: `${['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][ORDER.length]} free games.`, at: 10.5, size: 'headline' }] },
    { kind: 'promise', start: 22, end: 27, lines: PROMISE.map((text, i) => ({ text, at: 22 + i / 2, size: 'headline' })) },
    { kind: 'end', start: 27, end: 31, lines: [{ text: 'aikids.games', at: 27, size: 'headline' }, { text: 'Play free', at: 27.5, size: 'line' }] }
  ]
};

/**
 * Each game's own quick trailer (15 s, 31 beats): a cold open, the game card with its pitch over
 * three shots, two more shots with one short line, and the end card. Six shots of its real
 * gameplay, one bar each; `line` is at most five words (it stays up 3.6 s).
 */
export const TRAILERS: Record<Slug, { shots: [Shot, Shot, Shot, Shot, Shot, Shot]; line: string; describe: string }> = {
  'calex-cart': {
    line: 'Snow, neon and canyon tracks.',
    describe: 'A kart drifts through a snowy village at night, then boosts through neon and snowy tracks.',
    shots: [
      shot('calex-cart', 'lantern-drift', { from: 0.1, sfx: 0.5, sound: 'a kart engine and drift sparks' }),
      shot('calex-cart', 'avalanche-drift', { from: 0.6 }),
      shot('calex-cart', 'neon-boost', { from: 0.1, sfx: 0.5, sound: 'a boost whooshes' }),
      shot('calex-cart', 'race-hud', { from: 0.2 }),
      shot('calex-cart', 'avalanche-drift', { from: 3.2 }),
      shot('calex-cart', 'lantern-drift', { from: 3.4 })
    ]
  },
  theabonk: {
    line: 'Level up. Beat the boss!',
    describe: 'Thea swings her glowing Bonk Ring through a crowd of cartoon monsters and sends out a ring wave, then levels up and meets Grumblecap, the giant mushroom boss.',
    shots: [
      shot('theabonk', 'horde', { from: 0.2, sfx: 0.55, sound: 'bonk, bonk, bonk' }),
      shot('theabonk', 'ring-wave', { from: 0.2 }),
      shot('theabonk', 'horde', { from: 1 }),
      shot('theabonk', 'ring-wave', { from: 2 }),
      shot('theabonk', 'level-up', { from: 0.6, sfx: 0.5, sound: 'a level-up chime' }),
      shot('theabonk', 'boss', { from: 1.25 })
    ]
  },
  'vanex-defense': {
    line: 'Towers, upgrades and giant bosses.',
    describe: 'Towers zap enemies winding through a snowy maze and along a sky road, then a giant boss arrives.',
    shots: [
      shot('vanex-defense', 'frost-maze', { from: 0.4, sfx: 0.5, sound: 'towers zap' }),
      shot('vanex-defense', 'sky-lane', { from: 0.3 }),
      shot('vanex-defense', 'matriarch', { from: 7.9, zoom: 1.4, focus: [0.42, 0.24] }),
      shot('vanex-defense', 'frost-maze', { from: 2.6 }),
      shot('vanex-defense', 'sky-lane', { from: 2.6 }),
      shot('vanex-defense', 'matriarch', { from: 11 })
    ]
  },
  'space-sky': {
    line: 'Visit the Moon and Europa.',
    describe: 'A rocket flies past a ringed planet, lands on the Moon\'s glowing pad and explores icy Europa.',
    shots: [
      shot('space-sky', 'saturn', { from: 0.2, sfx: 0.45, sound: 'a rocket boost' }),
      shot('space-sky', 'moon-landing', { from: 0 }),
      shot('space-sky', 'europa', { from: 0.4 }),
      shot('space-sky', 'saturn', { from: 2.8 }),
      shot('space-sky', 'moon-landing', { from: 3 }),
      shot('space-sky', 'europa', { from: 2.8 })
    ]
  },
  'light-crossing': {
    line: 'Skate, decorate and make friends.',
    describe: 'Skating through lantern rings on a frozen pond, the island in autumn, a cozy decorated home and a festival.',
    shots: [
      shot('light-crossing', 'skate', { from: 0.4, sfx: 0.45, sound: 'skates swish' }),
      shot('light-crossing', 'autumn', { from: 0.2 }),
      shot('light-crossing', 'home', { from: 0.2, zoom: 1.6, focus: [0.5, 0.58] }),
      shot('light-crossing', 'festival', { from: 0.3 }),
      shot('light-crossing', 'autumn', { from: 2.8 }),
      shot('light-crossing', 'festival', { from: 3 })
    ]
  },
  'cliff-valley': {
    line: 'Crops, festivals and crystal mines.',
    describe: 'Picking ripe crops on the farm, the snowy town square on Starlight Night and the crystal mine.',
    shots: [
      shot('cliff-valley', 'harvest', { from: 0.2, sfx: 0.6, sound: 'harvest pops' }),
      shot('cliff-valley', 'festival', { from: 0.2, sfx: 0.45, sound: 'a festival chime' }),
      shot('cliff-valley', 'mine', { from: 0.2 }),
      shot('cliff-valley', 'tablet', { from: 0.4 }),
      shot('cliff-valley', 'festival', { from: 2.3 }),
      shot('cliff-valley', 'mine', { from: 1.2 })
    ]
  },
  'tuck-pop': {
    line: '60 levels and daily puzzles.',
    describe: 'Bright blocks drop into place and lines pop with sparkles, the whole board clears with confetti, a Classic game fills up, the Space theme, the Adventure map and an Adventure level with gems.',
    shots: [
      shot('tuck-pop', 'combo', { from: 0, zoom: 1.3, focus: [0.5, 0.5] }),
      shot('tuck-pop', 'board-clear', { from: 0, zoom: 1.3, focus: [0.5, 0.5] }),
      shot('tuck-pop', 'play', { from: 1.8, zoom: 1.3, focus: [0.5, 0.5] }),
      shot('tuck-pop', 'themes', { from: 0, zoom: 1.3, focus: [0.5, 0.5] }),
      shot('tuck-pop', 'map', { from: 0.5, zoom: 1.6, focus: [0.5, 0.5] }),
      shot('tuck-pop', 'adventure', { from: 0, zoom: 1.3, focus: [0.5, 0.5] })
    ]
  },
  agentmon: {
    line: '77 friends and puzzle Trials.',
    describe: 'A friendly creature challenge, a Spark Ring that makes a new friend, the town of Saltwhistle and a puzzle Trial in the canyon.',
    shots: [
      shot('agentmon', 'battle', { from: 0 }),
      shot('agentmon', 'spark-ring', { from: 0 }),
      shot('agentmon', 'town', { from: 0 }),
      shot('agentmon', 'battle', { from: 1.6 }),
      shot('agentmon', 'spark-ring', { from: 1.5 }),
      shot('agentmon', 'trial', { from: 0.3 })
    ]
  },
  fieldlark: {
    line: 'Seasons, helpers and harvest fairs.',
    describe: 'A busy summer farm with animals, a greenhouse and helpers at work, a row of strawberries and a row of wheat picked by hand, the farm at night with lit windows, Larkford\'s town square and its farm stand, snow on the roofs in winter, and the hens and cows up close.',
    shots: [
      shot('fieldlark', 'farm', { from: 0.2 }),
      shot('fieldlark', 'harvest', { from: 0, focus: [0.7, 0.3], sfx: 0.5, sound: 'harvest pops' }),
      shot('fieldlark', 'night', { from: 0.4 }),
      shot('fieldlark', 'town', { from: 0.4 }),
      shot('fieldlark', 'winter', { from: 0.6 }),
      shot('fieldlark', 'animals', { from: 0.5 })
    ]
  },
  shooberry: {
    line: 'Plant helpers. Save the picnic!',
    describe: 'Rowan Flickers and Maple Twirlers shoo an Ant Column in the Meadow Picnic, the Grand Snail boss slides in, then gardens in the Pumpkin Patch at dusk, the Glass Greenhouse, the Cactus Garden and the Cloud Garden.',
    shots: [
      shot('shooberry', 'wave', { from: 0.2 }),
      shot('shooberry', 'boss', { from: 0.3 }),
      shot('shooberry', 'dusk', { from: 0.2 }),
      shot('shooberry', 'greenhouse', { from: 0.3 }),
      shot('shooberry', 'desert', { from: 0.2 }),
      shot('shooberry', 'cloud', { from: 0.3 })
    ]
  }
};
/** The order of the games' trailers (all ten). */
export const TRAILER_ORDER: Slug[] = ['calex-cart', 'theabonk', 'vanex-defense', 'space-sky', 'light-crossing', 'cliff-valley', 'tuck-pop', 'agentmon', 'fieldlark', 'shooberry'];
export const trailerId = (slug: Slug) => `game-${slug}`;

function gameCut(slug: Slug): Cut {
  const t = TRAILERS[slug];
  return {
    id: trailerId(slug), beats: 31,
    blocks: [
      { kind: 'clip', start: 0, end: 4, shot: t.shots[0] },
      { kind: 'game', start: 4, end: 16, slug, textIn: 4.5, textOut: 16, shots: t.shots.slice(1, 4) },
      { kind: 'montage', start: 16, end: 24, shots: t.shots.slice(4), lines: [{ text: t.line, at: 16.5, size: 'headline' }] },
      { kind: 'end', start: 24, end: 31, lines: [{ text: 'Play free', at: 24.5, size: 'line' }, { text: 'No ads. No sign-ups. No tracking.', at: 25, size: 'small' }] }
    ]
  };
}

/**
 * Fieldlark's own 60-second reel (124 beats) for YouTube, 16:9 and 9:16: a dive onto the farm, the logo,
 * eight things to do (one short line over two shots each), phones and tablets, the promise, the game
 * card and the end card. Every shot is real gameplay from marketing/sizzle/capture/games/fieldlark.ts.
 */
const fl = (take: string, extra: Omit<Shot, 'slug' | 'take'> = {}) => shot('fieldlark', take, extra);
const FL_FEATURES: [string, ...Shot[]][] = [
  ['Plant, grow and pick!', fl('grow', { from: 0.3, focus: [0.7, 0.3], sfx: 0.5, sound: 'harvest pops' }), fl('grow', { from: 2.2, focus: [0.7, 0.3], sfx: 0.5, sound: 'planting and watering' }), fl('grow', { from: 8.3, focus: [0.7, 0.3], sfx: 0.5, sound: 'harvest pops' })],
  ['Raise happy animals', fl('animals', { from: 0.4, focus: [0.4, 0.5] }), fl('hens', { from: 0.3 }), fl('dog', { from: 0.3 })],
  ['Helpers lend a hand', fl('helpers', { from: 0.3 }), fl('helpers2', { from: 0.5 })],
  ['Sell in the town square', fl('town', { from: 0.3 }), fl('town', { from: 2.2 })],
  ['Farm by day and night', fl('timelapse', { from: 2.2 }), fl('fireflies', { from: 0.4 })],
  ['Sun, rain and snow', fl('rain', { from: 0.4 }), fl('winter', { from: 0.6 })],
  ['Grow crops all year round', fl('greenhouse', { from: 0.4 }), fl('spring', { from: 0.4 })],
  ['Win ribbons at the fair!', fl('fair', { from: 0, focus: [0.3, 0.6] }), fl('fair', { from: 2.6, focus: [0.55, 0.6] })]
];
const dive = fl('dive', { from: 0 });
const fieldlarkReel: Cut = {
  id: 'fieldlark-reel', beats: 124,
  blocks: [
    { kind: 'clip', start: 0, end: 6, shot: dive },
    { kind: 'logo', start: 6, end: 8, slug: 'fieldlark', over: { ...dive, from: at(6) } },
    { kind: 'tagline', start: 8, end: 20, bg: [fl('timelapse', { from: 0 }), fl('orbit', { from: 0.3 })], lines: [{ text: 'A sleepy little town farm…', at: 8, size: 'headline' }, { text: 'Can you wake it up?', at: 12, size: 'headline' }] },
    ...FL_FEATURES.map(([text, ...shots], i): Block => ({ kind: 'montage', start: 20 + 8 * i, end: 28 + 8 * i, shots, lines: [{ text, at: 20.5 + 8 * i, size: 'headline' }] })),
    { kind: 'devices', start: 84, end: 92, phone: fl('phone', { from: 0.3 }), tablet: fl('tablet', { from: 0.3 }), lines: [{ text: 'Phones, tablets and computers', at: 85, size: 'headline' }] },
    { kind: 'promise', start: 92, end: 100, lines: ['Free to play.', 'No ads.', 'Nothing to buy.', 'Nothing ever wilts.'].map((text, i) => ({ text, at: 92 + i, size: 'headline' })) },
    { kind: 'game', start: 100, end: 112, slug: 'fieldlark', textIn: 101, textOut: 111.75, shots: [fl('farm', { from: 0.2 }), fl('autumn', { from: 0.4 }), fl('orbit', { from: 3.2 })] },
    { kind: 'end', start: 112, end: 124, lines: [
      { text: 'Fieldlark is ready to play!', at: 112.5, size: 'line' },
      { text: 'Play free', at: 113, size: 'line' },
      { text: 'No ads. No sign-ups. No tracking.', at: 113.5, size: 'small' }
    ] }
  ]
};

export const CUTS = [reel60, reel15, ...TRAILER_ORDER.map(gameCut), fieldlarkReel];
/** The cuts named on the command line (a cut id, or a prefix such as "game-"); all when none are. */
export const selectCuts = (names: string[]) => names.length ? CUTS.filter(cut => names.some(name => cut.id === name || cut.id.startsWith(name) || name.startsWith(`${cut.id}-`))) : CUTS;

/** Every line must stay up long enough to read, and blocks must tile the cut with no gaps. */
export function checkCut(cut: Cut): string[] {
  const problems: string[] = [];
  let t = 0;
  for (const block of cut.blocks) {
    if (block.start !== t) problems.push(`${cut.id}: gap or overlap at beat ${t} (next block starts at ${block.start})`);
    t = block.end;
    const lines = 'lines' in block ? block.lines : [];
    for (const line of lines) {
      const shown = (block.end - line.at) * BEAT;
      if (line.size !== 'small' && shown < minSeconds(line.text)) problems.push(`${cut.id}: "${line.text}" is on screen ${shown.toFixed(2)} s; needs ${minSeconds(line.text).toFixed(2)} s`);
    }
    if (block.kind === 'game') {
      const g = game(block.slug), shown = (block.textOut - block.textIn) * BEAT;
      if (shown < minSeconds(g.tagline)) problems.push(`${cut.id}: ${g.title} pitch is on screen ${shown.toFixed(2)} s; needs ${minSeconds(g.tagline).toFixed(2)} s`);
    }
  }
  if (t !== cut.beats) problems.push(`${cut.id}: blocks end at beat ${t}, not ${cut.beats}`);
  return problems;
}

export const FORMATS = { landscape: { id: '16x9', width: 1920, height: 1080 }, portrait: { id: '9x16', width: 1080, height: 1920 } } as const;
export type Format = keyof typeof FORMATS;
