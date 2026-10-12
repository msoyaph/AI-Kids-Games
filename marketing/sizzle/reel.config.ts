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

export type Slug = 'calex-cart' | 'theabonk' | 'vanex-defense' | 'space-sky' | 'light-crossing' | 'cliff-valley';

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

/** Each game's three showcase shots, in the order they play (one bar each). */
export const REEL: Record<Slug, { shots: [Shot, Shot, Shot]; describe: string }> = {
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
    describe: 'Towers zap a line of crystal robots winding through a snowy maze, then a sky road, then a giant boss.',
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
    describe: 'Picking ripe crops on the farm, sky lanterns at the Starlight Night festival and the crystal mine.',
    shots: [
      shot('cliff-valley', 'harvest', { from: 0.2, focus: [0.5, 0.5], sfx: 0.6, sound: 'harvest pops' }),
      shot('cliff-valley', 'festival', { from: 0.2, focus: [0.5, 0.5], sfx: 0.45, sound: 'a festival chime' }),
      shot('cliff-valley', 'mine', { from: 0.2, focus: [0.5, 0.5] })
    ]
  }
};

/** Showcase order: racing, action, strategy, space wonder, cozy island, farming. */
export const ORDER: Slug[] = ['calex-cart', 'theabonk', 'vanex-defense', 'space-sky', 'light-crossing', 'cliff-valley'];

export interface Game { slug: Slug; title: string; tagline: string; ages: string; logo: string }
export function game(slug: Slug): Game {
  const m = JSON.parse(readFileSync(join(root, 'games', slug, 'game.json'), 'utf8'));
  return { slug, title: m.title, tagline: m.tagline, ages: `Ages ${m.ageRange}`, logo: join(root, 'apps/site/public/media', slug, 'logo.svg') };
}

/** Lines of text with the beat they land on; each stays until its block ends. */
export interface Line { text: string; at: number; size: 'headline' | 'line' | 'small' }

export type Block =
  | { kind: 'clip'; start: number; end: number; shot: Shot }
  | { kind: 'logo'; start: number; end: number; over?: Shot }
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

export const CUTS = [reel60, reel15];

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
