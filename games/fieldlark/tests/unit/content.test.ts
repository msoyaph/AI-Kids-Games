/**
 * Kid safety and originality, checked over the whole game's source (every string the player can
 * read lives in src/): no other companies' game titles or brands, nothing unkind or scary, and no
 * words that hint at buying things.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|css|html)$/.test(f) ? [p] : [];
  });
}
const SOURCES = [...files('src'), 'index.html'].map(p => ({ p, text: readFileSync(p, 'utf8') }));

/** Other companies' titles and brands (the inspiration and the big farm and life sims among them). */
const BRANDS = ['farmville', 'zynga', 'hay day', 'supercell', 'stardew', 'harvest moon', 'story of seasons', 'animal crossing', 'rune factory', 'fae farm', 'coral island', 'slime rancher', 'minecraft', 'roblox', 'fortnite', 'pokemon', 'pokémon', 'nintendo', 'disney', 'pixar', 'lego', 'peppa', 'bluey', 'cocomelon', 'barnyard', 'sprout valley', 'cliff valley'];
/** Words that don't belong in a gentle farm game for 8–14 year olds. */
const UNKIND = ['kill', 'dead', 'death', 'blood', 'stupid', 'dumb', 'idiot', 'hate', 'gun', 'weapon', 'shoot', 'war', 'loser'];
/** Words that would suggest spending money. */
const MONEY = ['buy now', 'premium', 'gems', 'real money', 'in-app', 'purchase', 'subscribe', 'credit card'];

const word = (w: string) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');

describe('content', () => {
  it('names no other company’s game or brand', () => {
    // our own sibling games are named in code comments as credits for copied code; Cliff Valley is a
    // sibling too, but it is listed here because the game must stay clearly different from it
    const hits = SOURCES.flatMap(({ p, text }) => BRANDS.filter(b => word(b).test(text)).map(b => `${p}: ${b}`));
    expect(hits).toEqual([]);
  });

  it('says nothing unkind or scary in what the player reads', () => {
    // only string literals count (code words like "dead zone" in comments are fine)
    const strings = SOURCES.flatMap(({ p, text }) => [...text.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)].map(m => ({ p, s: m[2]! })));
    const hits = strings.flatMap(({ p, s }) => UNKIND.filter(w => word(w).test(s)).map(w => `${p}: "${s}" (${w})`));
    expect(hits).toEqual([]);
  });

  it('never hints at spending real money', () => {
    const hits = SOURCES.flatMap(({ p, text }) => MONEY.filter(w => word(w).test(text)).map(w => `${p}: ${w}`));
    expect(hits).toEqual([]);
  });
});
