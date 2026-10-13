/**
 * Every Agentmon move. `n` is the stable number used in saves: never renumber, only add at the end.
 *
 * Each element has the same ten roles, so no element is missing a tool:
 *   free tap (cost 0) · light bump · gentle status · mid bump · boost or shield · big bump ·
 *   comfort (restore or shake off) · quick bump (goes first) · mid bump with a side effect · finisher.
 * Plain moves (no element) are neutral against everyone. Four guardian moves come last.
 * Descriptions are one plain sentence for the tooltip.
 */
import type { Move, MoveEffect } from '../core/types';

type M = Omit<Move, 'kind'> & { kind?: Move['kind'] };

const st = (status: 'sleepy' | 'dizzy' | 'soaked' | 'toasty' | 'chilly', chance: number): MoveEffect => ({ type: 'status', status, chance, target: 'foe' });
const up = (stat: 'power' | 'guard' | 'speed', stages = 1): MoveEffect => ({ type: 'boost', stat, stages, target: 'self' });
const down = (stat: 'power' | 'guard' | 'speed', stages = 1): MoveEffect => ({ type: 'boost', stat, stages: -stages, target: 'foe' });
const shield = (amount = 0.5): MoveEffect => ({ type: 'shield', amount });
const restore = (amount: number): MoveEffect => ({ type: 'restore', amount });
const cleanse: MoveEffect = { type: 'cleanse' };

function kindOf(m: M): Move['kind'] {
  if (m.kind) return m.kind;
  if (m.power > 0) return 'attack';
  const e = m.effects ?? [];
  if (e.some(x => x.type === 'shield')) return 'shield';
  if (e.some(x => x.type === 'restore' || x.type === 'cleanse')) return 'heal';
  if (e.some(x => x.type === 'status' || (x.type === 'boost' && x.target === 'foe'))) return 'status';
  return 'buff';
}

const LIST: M[] = [
  // ---- Plain -------------------------------------------------------------------------------
  { n: 1, id: 'bump', name: 'Bump', element: 'plain', power: 35, cost: 0, desc: 'A friendly bump. Free to use.' },
  { n: 2, id: 'pep-talk', name: 'Pep Talk', element: 'plain', power: 0, cost: 0.05, effects: [up('power')], desc: 'Cheers itself on. Its bumps get stronger.' },
  { n: 3, id: 'cozy-curl', name: 'Cozy Curl', element: 'plain', power: 0, cost: 0.05, priority: 1, effects: [shield()], desc: 'Curls up first. Blocks half of the next bump this turn.' },
  { n: 4, id: 'hop-in', name: 'Hop In', element: 'plain', power: 30, cost: 0.03, priority: 1, desc: 'A quick little hop that goes first.' },
  { n: 5, id: 'friendly-shove', name: 'Friendly Shove', element: 'plain', power: 70, cost: 0.1, desc: 'A big, friendly shove.' },
  { n: 6, id: 'snack-break', name: 'Snack Break', element: 'plain', power: 0, cost: 0, effects: [restore(0.15), cleanse], desc: 'Munches a snack. Gets back a little energy and shakes off a status.' },
  { n: 7, id: 'goofy-grin', name: 'Goofy Grin', element: 'plain', power: 0, cost: 0.04, effects: [down('power')], desc: 'Makes a goofy grin. The other one giggles and bumps softer.' },
  { n: 8, id: 'sleepy-tune', name: 'Sleepy Tune', element: 'plain', power: 0, cost: 0.1, effects: [st('sleepy', 0.75)], desc: 'Hums a soft tune that may make the other one Sleepy.' },
  { n: 9, id: 'twirl-around', name: 'Twirl Around', element: 'plain', power: 0, cost: 0.07, effects: [st('dizzy', 0.8)], desc: 'Twirls in circles. The other one may get Dizzy watching.' },
  { n: 10, id: 'cheer-up', name: 'Cheer Up', element: 'plain', power: 0, cost: 0.05, effects: [up('guard'), cleanse], desc: 'Feels brave. Shakes off a status and stands firmer.' },

  // ---- Flare -------------------------------------------------------------------------------
  { n: 11, id: 'warm-tap', name: 'Warm Tap', element: 'flare', power: 35, cost: 0, desc: 'A warm little tap. Free to use.' },
  { n: 12, id: 'puff-pop', name: 'Puff Pop', element: 'flare', power: 50, cost: 0.05, desc: 'Pops a warm puff of air.' },
  { n: 13, id: 'cozy-heat', name: 'Cozy Heat', element: 'flare', power: 35, cost: 0.07, effects: [st('toasty', 0.6)], desc: 'A warm wave that may make the other one Toasty.' },
  { n: 14, id: 'kettle-roll', name: 'Kettle Roll', element: 'flare', power: 65, cost: 0.09, desc: 'Rolls in like a warm kettle.' },
  { n: 15, id: 'sun-stretch', name: 'Sun Stretch', element: 'flare', power: 0, cost: 0.07, effects: [up('power'), up('speed')], desc: 'Stretches in the sun. Gets stronger and faster.' },
  { n: 16, id: 'bonfire-bounce', name: 'Bonfire Bounce', element: 'flare', power: 90, cost: 0.17, desc: 'A big, bouncy, glowing jump.' },
  { n: 17, id: 'steam-puff', name: 'Steam Puff', element: 'flare', power: 30, cost: 0.06, effects: [down('guard')], desc: 'A puff of steam that makes the other one less sturdy.' },
  { n: 18, id: 'hot-hop', name: 'Hot Hop', element: 'flare', power: 30, cost: 0.04, priority: 1, desc: 'A quick warm hop that goes first.' },
  { n: 19, id: 'toast-toss', name: 'Toast Toss', element: 'flare', power: 75, cost: 0.12, effects: [st('toasty', 0.2)], desc: 'A toasty toss that may make the other one Toasty.' },
  { n: 20, id: 'sunshine-blast', name: 'Sunshine Blast', element: 'flare', power: 105, cost: 0.2, desc: 'A huge burst of sunshine.' },

  // ---- Tide --------------------------------------------------------------------------------
  { n: 21, id: 'drip-tap', name: 'Drip Tap', element: 'tide', power: 35, cost: 0, desc: 'A drippy little tap. Free to use.' },
  { n: 22, id: 'puddle-pat', name: 'Puddle Pat', element: 'tide', power: 50, cost: 0.05, desc: 'A splashy pat from a puddle.' },
  { n: 23, id: 'drizzle-drop', name: 'Drizzle Drop', element: 'tide', power: 35, cost: 0.07, effects: [st('soaked', 0.7)], desc: 'A sprinkle of rain that may leave the other one Soaked.' },
  { n: 24, id: 'ripple-roll', name: 'Ripple Roll', element: 'tide', power: 65, cost: 0.09, desc: 'Rolls in on a ripple.' },
  { n: 25, id: 'foam-fort', name: 'Foam Fort', element: 'tide', power: 0, cost: 0.05, priority: 1, effects: [shield()], desc: 'Builds a foam fort first. Blocks half of the next bump this turn.' },
  { n: 26, id: 'belly-flop', name: 'Belly Flop', element: 'tide', power: 90, cost: 0.17, desc: 'A giant, splashy belly flop.' },
  { n: 27, id: 'cool-mist', name: 'Cool Mist', element: 'tide', power: 0, cost: 0.03, effects: [restore(0.2), cleanse], desc: 'A cool mist. Gets back some energy and shakes off a status.' },
  { n: 28, id: 'squirt-dash', name: 'Squirt Dash', element: 'tide', power: 30, cost: 0.04, priority: 1, desc: 'A quick squirt that goes first.' },
  { n: 29, id: 'undertow-tug', name: 'Undertow Tug', element: 'tide', power: 75, cost: 0.12, effects: [down('speed')], desc: 'A strong tug that slows the other one down.' },
  { n: 30, id: 'rolling-tide', name: 'Rolling Tide', element: 'tide', power: 105, cost: 0.2, desc: 'A great rolling wave.' },

  // ---- Leaf --------------------------------------------------------------------------------
  { n: 31, id: 'leaf-tap', name: 'Leaf Tap', element: 'leaf', power: 35, cost: 0, desc: 'A soft leafy tap. Free to use.' },
  { n: 32, id: 'twig-swat', name: 'Twig Swat', element: 'leaf', power: 50, cost: 0.05, desc: 'A swish of a bendy twig.' },
  { n: 33, id: 'sneezy-pollen', name: 'Sneezy Pollen', element: 'leaf', power: 30, cost: 0.07, effects: [st('dizzy', 0.5)], desc: 'A tickly cloud of pollen that may make the other one Dizzy.' },
  { n: 34, id: 'vine-twirl', name: 'Vine Twirl', element: 'leaf', power: 65, cost: 0.09, desc: 'Twirls a long vine around.' },
  { n: 35, id: 'sprout-up', name: 'Sprout Up', element: 'leaf', power: 0, cost: 0.07, effects: [up('guard'), up('power')], desc: 'Grows a little. Stronger and sturdier.' },
  { n: 36, id: 'log-roll', name: 'Log Roll', element: 'leaf', power: 90, cost: 0.17, desc: 'Rolls a big log along.' },
  { n: 37, id: 'sunny-sip', name: 'Sunny Sip', element: 'leaf', power: 0, cost: 0.03, effects: [restore(0.3)], desc: 'Soaks up sunshine to get back energy.' },
  { n: 38, id: 'seed-flick', name: 'Seed Flick', element: 'leaf', power: 30, cost: 0.04, priority: 1, desc: 'Flicks a seed that goes first.' },
  { n: 39, id: 'bramble-bundle', name: 'Bramble Bundle', element: 'leaf', power: 75, cost: 0.12, effects: [down('speed')], desc: 'A tangle of soft brambles that slows the other one.' },
  { n: 40, id: 'treetop-tumble', name: 'Treetop Tumble', element: 'leaf', power: 105, cost: 0.2, desc: 'Tumbles down from the treetops.' },

  // ---- Stone -------------------------------------------------------------------------------
  { n: 41, id: 'pebble-tap', name: 'Pebble Tap', element: 'stone', power: 35, cost: 0, desc: 'A tap with a smooth pebble. Free to use.' },
  { n: 42, id: 'rock-nudge', name: 'Rock Nudge', element: 'stone', power: 50, cost: 0.05, desc: 'A firm nudge with a rock.' },
  { n: 43, id: 'dust-puff', name: 'Dust Puff', element: 'stone', power: 30, cost: 0.07, effects: [st('dizzy', 0.45)], desc: 'A puff of dust that may make the other one Dizzy.' },
  { n: 44, id: 'boulder-bounce', name: 'Boulder Bounce', element: 'stone', power: 65, cost: 0.09, desc: 'Bounces in like a boulder.' },
  { n: 45, id: 'stone-coat', name: 'Stone Coat', element: 'stone', power: 0, cost: 0.07, effects: [up('guard', 2)], desc: 'Covers itself in pebbles. Much sturdier.' },
  { n: 46, id: 'rumble-tumble', name: 'Rumble Tumble', element: 'stone', power: 90, cost: 0.17, desc: 'A rumbling, tumbling roll.' },
  { n: 47, id: 'crystal-hum', name: 'Crystal Hum', element: 'stone', power: 0, cost: 0.04, effects: [restore(0.2), up('guard')], desc: 'Hums like a crystal. Gets back energy and stands firmer.' },
  { n: 48, id: 'skipping-stone', name: 'Skipping Stone', element: 'stone', power: 30, cost: 0.04, priority: 1, desc: 'Skips a stone that goes first.' },
  { n: 49, id: 'burrow-bonk', name: 'Burrow Bonk', element: 'stone', power: 75, cost: 0.12, effects: [down('guard')], desc: 'Pops up from a burrow. The other one gets less sturdy.' },
  { n: 50, id: 'mountain-stomp', name: 'Mountain Stomp', element: 'stone', power: 105, cost: 0.2, desc: 'A stomp as big as a mountain.' },

  // ---- Gust --------------------------------------------------------------------------------
  { n: 51, id: 'breeze-tap', name: 'Breeze Tap', element: 'gust', power: 35, cost: 0, desc: 'A breezy tap. Free to use.' },
  { n: 52, id: 'flutter-flick', name: 'Flutter Flick', element: 'gust', power: 50, cost: 0.05, desc: 'A fluttery flick of wind.' },
  { n: 53, id: 'swirly-whirl', name: 'Swirly Whirl', element: 'gust', power: 0, cost: 0.07, effects: [st('dizzy', 0.75)], desc: 'A swirly wind that may make the other one Dizzy.' },
  { n: 54, id: 'whirl-hop', name: 'Whirl Hop', element: 'gust', power: 65, cost: 0.09, desc: 'Hops in on a whirlwind.' },
  { n: 55, id: 'breezy-boost', name: 'Breezy Boost', element: 'gust', power: 0, cost: 0.06, effects: [up('speed', 2)], desc: 'Catches a breeze. Much faster.' },
  { n: 56, id: 'gale-tumble', name: 'Gale Tumble', element: 'gust', power: 90, cost: 0.17, desc: 'Tumbles in on a strong wind.' },
  { n: 57, id: 'cloud-cushion', name: 'Cloud Cushion', element: 'gust', power: 0, cost: 0.05, priority: 1, effects: [shield()], desc: 'Fluffs up a cloud first. Blocks half of the next bump this turn.' },
  { n: 58, id: 'zip-dash', name: 'Zip Dash', element: 'gust', power: 35, cost: 0.04, priority: 1, desc: 'Zips in first.' },
  { n: 59, id: 'kite-spin', name: 'Kite Spin', element: 'gust', power: 75, cost: 0.12, effects: [down('guard')], desc: 'Spins like a kite. The other one gets less sturdy.' },
  { n: 60, id: 'skyward-spiral', name: 'Skyward Spiral', element: 'gust', power: 105, cost: 0.2, desc: 'A huge spiral of wind.' },

  // ---- Frost -------------------------------------------------------------------------------
  { n: 61, id: 'frost-tap', name: 'Frost Tap', element: 'frost', power: 35, cost: 0, desc: 'A cool, frosty tap. Free to use.' },
  { n: 62, id: 'snowball-lob', name: 'Snowball Lob', element: 'frost', power: 50, cost: 0.05, desc: 'Lobs a soft snowball.' },
  { n: 63, id: 'chilly-breeze', name: 'Chilly Breeze', element: 'frost', power: 30, cost: 0.07, effects: [st('chilly', 0.7)], desc: 'A cold breeze that may make the other one Chilly.' },
  { n: 64, id: 'ice-slide', name: 'Ice Slide', element: 'frost', power: 65, cost: 0.09, desc: 'Slides in across the ice.' },
  { n: 65, id: 'snow-fort', name: 'Snow Fort', element: 'frost', power: 0, cost: 0.05, priority: 1, effects: [shield()], desc: 'Builds a snow fort first. Blocks half of the next bump this turn.' },
  { n: 66, id: 'snowdrift-drop', name: 'Snowdrift Drop', element: 'frost', power: 90, cost: 0.17, desc: 'Drops a big, fluffy snowdrift.' },
  { n: 67, id: 'cool-down', name: 'Cool Down', element: 'frost', power: 0, cost: 0.03, effects: [restore(0.15), cleanse, up('guard')], desc: 'Takes a cool breath. Gets back energy, shakes off a status and stands firmer.' },
  { n: 68, id: 'icicle-flick', name: 'Icicle Flick', element: 'frost', power: 30, cost: 0.04, priority: 1, desc: 'Flicks a tiny icicle that goes first.' },
  { n: 69, id: 'sleet-swirl', name: 'Sleet Swirl', element: 'frost', power: 75, cost: 0.12, effects: [st('chilly', 0.25)], desc: 'A swirl of sleet that may make the other one Chilly.' },
  { n: 70, id: 'glacier-glide', name: 'Glacier Glide', element: 'frost', power: 105, cost: 0.2, desc: 'Glides in like a giant glacier.' },

  // ---- Volt --------------------------------------------------------------------------------
  { n: 71, id: 'fizz-tap', name: 'Fizz Tap', element: 'volt', power: 35, cost: 0, desc: 'A fizzy little tap. Free to use.' },
  { n: 72, id: 'buzz-bop', name: 'Buzz Bop', element: 'volt', power: 50, cost: 0.05, desc: 'A buzzy bop.' },
  { n: 73, id: 'static-tickle', name: 'Static Tickle', element: 'volt', power: 30, cost: 0.07, effects: [st('dizzy', 0.55)], desc: 'A tickly static touch that may make the other one Dizzy.' },
  { n: 74, id: 'zigzag-zip', name: 'Zigzag Zip', element: 'volt', power: 65, cost: 0.09, desc: 'Zips in on a zigzag path.' },
  { n: 75, id: 'battery-boost', name: 'Battery Boost', element: 'volt', power: 0, cost: 0.07, effects: [up('power', 2)], desc: 'Charges up. Its bumps get much stronger.' },
  { n: 76, id: 'rumble-bolt', name: 'Rumble Bolt', element: 'volt', power: 90, cost: 0.17, desc: 'A big, rumbly zap.' },
  { n: 77, id: 'recharge-nap', name: 'Recharge Nap', element: 'volt', power: 0, cost: 0.03, effects: [restore(0.3)], desc: 'A tiny nap that recharges energy.' },
  { n: 78, id: 'quick-zap', name: 'Quick Zap', element: 'volt', power: 30, cost: 0.04, priority: 1, desc: 'A quick zap that goes first.' },
  { n: 79, id: 'magnet-tug', name: 'Magnet Tug', element: 'volt', power: 75, cost: 0.12, effects: [down('guard')], desc: 'A magnetic tug. The other one gets less sturdy.' },
  { n: 80, id: 'storm-surge', name: 'Storm Surge', element: 'volt', power: 105, cost: 0.2, desc: 'A big surge of storm power.' },

  // ---- Glow --------------------------------------------------------------------------------
  { n: 81, id: 'glint-tap', name: 'Glint Tap', element: 'glow', power: 35, cost: 0, desc: 'A glinting tap. Free to use.' },
  { n: 82, id: 'shine-bop', name: 'Shine Bop', element: 'glow', power: 50, cost: 0.05, desc: 'A shiny little bop.' },
  { n: 83, id: 'nightlight', name: 'Nightlight', element: 'glow', power: 0, cost: 0.09, effects: [st('sleepy', 0.65)], desc: 'A soft night light that may make the other one Sleepy.' },
  { n: 84, id: 'star-toss', name: 'Star Toss', element: 'glow', power: 65, cost: 0.09, desc: 'Tosses a sparkly star.' },
  { n: 85, id: 'halo-shield', name: 'Halo Shield', element: 'glow', power: 0, cost: 0.05, priority: 1, effects: [shield()], desc: 'Makes a glowing ring first. Blocks half of the next bump this turn.' },
  { n: 86, id: 'starfall-sparkle', name: 'Starfall Sparkle', element: 'glow', power: 90, cost: 0.17, desc: 'A shower of sparkly stars.' },
  { n: 87, id: 'soft-glow', name: 'Soft Glow', element: 'glow', power: 0, cost: 0.03, effects: [restore(0.25), cleanse], desc: 'Glows softly. Gets back energy and shakes off a status.' },
  { n: 88, id: 'gleam-dash', name: 'Gleam Dash', element: 'glow', power: 30, cost: 0.04, priority: 1, desc: 'Dashes in with a gleam, going first.' },
  { n: 89, id: 'prism-ray', name: 'Prism Ray', element: 'glow', power: 75, cost: 0.12, effects: [down('power')], desc: 'A rainbow ray. The other one bumps softer.' },
  { n: 90, id: 'beacon-beam', name: 'Beacon Beam', element: 'glow', power: 105, cost: 0.2, desc: 'A beam as bright as a Beacon.' },

  // ---- Guardians ---------------------------------------------------------------------------
  { n: 91, id: 'ribbon-sky', name: 'Ribbon Sky', element: 'glow', power: 110, cost: 0.2, effects: [cleanse], desc: 'Fills the sky with glowing ribbons, and shakes off a status.' },
  { n: 92, id: 'snowshoe-dash', name: 'Snowshoe Dash', element: 'frost', power: 110, cost: 0.2, effects: [up('speed')], desc: 'Dashes across the snow and gets faster.' },
  { n: 93, id: 'canyon-echo', name: 'Canyon Echo', element: 'stone', power: 110, cost: 0.2, effects: [up('guard')], desc: 'A rumble that echoes through the canyon, and stands firmer.' },
  { n: 94, id: 'moon-tide', name: 'Moon Tide', element: 'tide', power: 110, cost: 0.2, effects: [restore(0.1)], desc: 'Calls a tide by moonlight, and gets back a little energy.' },
];

export const MOVES: Record<string, Move> = Object.fromEntries(LIST.map(m => [m.id, { ...m, kind: kindOf(m) }]));

/** The ten moves of each element, in role order (used to build learnsets). */
export const ROLE = {
  tap: 0, light: 1, status: 2, mid: 3, boost: 4, big: 5, comfort: 6, quick: 7, mid2: 8, finisher: 9,
} as const;

export const ELEMENT_MOVES: Record<string, string[]> = {
  flare: LIST.slice(10, 20).map(m => m.id),
  tide: LIST.slice(20, 30).map(m => m.id),
  leaf: LIST.slice(30, 40).map(m => m.id),
  stone: LIST.slice(40, 50).map(m => m.id),
  gust: LIST.slice(50, 60).map(m => m.id),
  frost: LIST.slice(60, 70).map(m => m.id),
  volt: LIST.slice(70, 80).map(m => m.id),
  glow: LIST.slice(80, 90).map(m => m.id),
};
