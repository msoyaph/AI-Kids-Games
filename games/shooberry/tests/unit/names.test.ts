import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/config';
import { INVADERS, PLANTS, WORLDS } from '../../src/data/roster';

// The name lint (IP log in CLAUDE.md): no name or player-facing line may echo the lane-defense
// classic that inspired this game, its undead cast or its signature pieces, or any other company's
// titles. The Seed Book's real plant facts (data/facts.ts) are reviewed by hand instead, because a
// true fact may need a word like "sun".

/** Each pattern, and why it's blocked. */
const BLOCKED: readonly [RegExp, string][] = [
  [/\bsun(?!day)/, 'a sun-themed resource or flower'],
  [/\bpea(s|shooter|pod)?\b/, 'pea shooters'],
  [/nut(s|ty)?\b/, 'nut walls'],
  [/mower/, 'row-clearing mowers'],
  [/zombie|undead|\bbrains?\b|\bgrave(s|stone|yard)?\b|\btomb/, 'anything undead, brain-related or scary'],
  [/cone ?head|bucket ?head|traffic cone/, 'cone or bucket headgear'],
  [/zen garden|crazy dave|seed packet|conveyor/, 'its zen garden, neighbor and seed conveyor'],
  [/shroom|\bchomp|plantern|-pult\b|\bpult\b|cherry bomb|potato mine|lily ?pad|\bkelp\b|torchwood|starfruit|cattail|\bsquash\b|snapdragon|moonflower|\baloe\b|thistle|bloomerang|umbrella leaf/, 'one of its plant names'],
  [/huge wave/, 'its wave warning'],
];

/** The repo's trademark blocklist (scripts/lib/manifest.ts), matched the way the manifest check matches it. */
const TRADEMARKS = (() => {
  const source = readFileSync(new URL('../../../../scripts/lib/manifest.ts', import.meta.url), 'utf8');
  const list = /export const TRADEMARKS = \[([^\]]*)\]/.exec(source)?.[1] ?? '';
  return [...list.matchAll(/'([^']+)'/g)].map(match => match[1]!);
})();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const trademarksIn = (text: string) => TRADEMARKS.filter(mark => new RegExp(`(^|[^a-z])${escape(mark)}([^a-z]|$)`).test(text));

/** game.json minus the plumbing the manifest check skips too. */
const listing = JSON.parse(readFileSync(new URL('../../game.json', import.meta.url), 'utf8')) as Record<string, unknown>;
for (const key of ['$schema', 'capture', 'storage', 'safety', 'source']) delete listing[key];

/** Every name and line a player reads, labelled by where it comes from. */
const texts: [string, string][] = [
  ['title', GAME.title],
  ...WORLDS.flatMap(world => [[`world ${world.id}`, `${world.name} ${world.twist}`] as [string, string]]),
  ...PLANTS.map(plant => [`plant ${plant.id}`, `${plant.id} ${plant.name} ${plant.species} ${plant.does}`] as [string, string]),
  ...INVADERS.map(invader => [`invader ${invader.id}`, `${invader.id} ${invader.name} ${invader.animal} ${invader.tip}`] as [string, string]),
  ['game.json', JSON.stringify(listing)],
];

describe('names and player-facing text', () => {
  it('reads the trademark blocklist, including the inspiring franchise', () => {
    expect(TRADEMARKS.length).toBeGreaterThan(50);
    for (const mark of ['plants vs', 'plants versus', 'pvz', 'popcap']) expect(TRADEMARKS).toContain(mark);
  });
  it('the lint catches what it should, and lets real words through', () => {
    const hits = (text: string) => BLOCKED.some(([pattern]) => pattern.test(text.toLowerCase()));
    for (const bad of ['Sunny Sprout', 'Pea Pod', 'Walnut Wall', 'Lawn Mower', 'Zombie Snail', 'Grave Moss', 'Conehead Mouse', 'Puff-shroom', 'Melon-pult', 'A huge wave is coming!']) expect(hits(bad), bad).toBe(true);
    for (const fine of ['Sunday garden', 'Peach', 'A minute', 'Gravel path', 'Pinecone Curling', 'Umbrella Frog', 'Nibble Goat', 'Pumpkin Patch at Dusk']) expect(hits(fine), fine).toBe(false);
  });
  it.each(texts)('%s has no blocked word or trademark', (_where, text) => {
    const lower = text.toLowerCase();
    expect(BLOCKED.filter(([pattern]) => pattern.test(lower)).map(([, why]) => why)).toEqual([]);
    expect(trademarksIn(lower)).toEqual([]);
  });
});

describe('roster v2', () => {
  it('has 24 plants, 20 critters and 5 worlds, each with its own id and name', () => {
    expect(PLANTS).toHaveLength(24);
    expect(INVADERS).toHaveLength(20);
    expect(WORLDS).toHaveLength(5);
    for (const list of [PLANTS, INVADERS, WORLDS] as const) {
      expect(new Set(list.map(item => item.id)).size).toBe(list.length);
      expect(new Set(list.map(item => item.name.toLowerCase())).size).toBe(list.length);
    }
  });
  it('covers every role the brief asks for, and every world brings something new', () => {
    const roles = new Set(PLANTS.map(plant => plant.role));
    for (const role of ['producer', 'shooter', 'lobber', 'blocker', 'slower', 'area', 'support', 'lane', 'dusk', 'water', 'air'] as const) expect(roles, role).toContain(role);
    const mechanics = new Set(INVADERS.flatMap(invader => [invader.mechanic, invader.also]));
    for (const mechanic of ['armored', 'lob-blocker', 'jumper', 'digger', 'flyer', 'swarm', 'shield', 'swapper'] as const) expect(mechanics, mechanic).toContain(mechanic);
    for (const world of WORLDS) {
      expect(PLANTS.some(plant => plant.world === world.id), world.id).toBe(true);
      expect(INVADERS.some(invader => invader.world === world.id), world.id).toBe(true);
    }
  });
  it('card lines and tips stay short enough to read at a glance', () => {
    for (const plant of PLANTS) expect(plant.does.split(' ').length, plant.id).toBeLessThanOrEqual(12);
    for (const invader of INVADERS) expect(invader.tip.split(' ').length, invader.id).toBeLessThanOrEqual(16);
  });
});
