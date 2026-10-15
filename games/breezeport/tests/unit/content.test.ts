/**
 * Kid safety and originality over the whole game's source (every string the player can read lives in
 * src/): no other companies' game titles or brands, nothing unkind or scary (and nothing destroyed:
 * no fires, disasters or crime), no words that hint at buying things, and none of the pressure the
 * brief rules out (energy, streaks, invites, neighbours to staff buildings, real-world timers).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRADEMARKS } from '../../../../scripts/lib/manifest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|css|html)$/.test(f) ? [p] : [];
  });
}
const SOURCES = [...files('src'), 'index.html'].map(p => ({ p, text: readFileSync(p, 'utf8') }));
const strings = SOURCES.flatMap(({ p, text }) => [...text.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)].map(m => ({ p, s: m[2]! })));

/** The repo's trademark list, plus farm sims and sibling games the town must stay clearly apart from. */
const BRANDS = [...TRADEMARKS, 'farmville', 'hay day', 'supercell', 'township', 'cliff valley'];
const UNKIND = ['kill', 'dead', 'death', 'blood', 'stupid', 'dumb', 'idiot', 'hate', 'gun', 'weapon', 'shoot', 'war', 'loser', 'fire', 'fires', 'burn', 'burning', 'crime', 'thief', 'robber', 'disaster', 'destroy', 'destroyed', 'abandoned', 'tornado', 'earthquake', 'flood', 'riot'];
const MONEY = ['buy now', 'premium', 'gems', 'real money', 'in-app', 'purchase', 'subscribe', 'credit card', 'shop now', 'deal'];
const PRESSURE = ['energy', 'streak', 'invite', 'neighbor', 'neighbour', 'gift', 'come back', 'daily reward', 'login', 'log in', 'friends list', 'limited time', 'hurry'];

const word = (w: string) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');

describe('content', () => {
  it('names no other company’s game or brand', () => {
    const hits = SOURCES.flatMap(({ p, text }) => BRANDS.filter(b => word(b).test(text)).map(b => `${p}: ${b}`));
    expect(hits).toEqual([]);
  });

  it('says nothing unkind or scary, and nothing burns, breaks or gets stolen', () => {
    const hits = strings.flatMap(({ p, s }) => UNKIND.filter(w => word(w).test(s)).map(w => `${p}: "${s.slice(0, 80)}" (${w})`));
    expect(hits).toEqual([]);
  });

  it('never hints at spending real money', () => {
    const hits = SOURCES.flatMap(({ p, text }) => MONEY.filter(w => word(w).test(text)).map(w => `${p}: ${w}`));
    expect(hits).toEqual([]);
  });

  it('has no energy, streaks, invites or come-back pressure in what the player reads', () => {
    const hits = strings.flatMap(({ p, s }) => PRESSURE.filter(w => word(w).test(s)).map(w => `${p}: "${s.slice(0, 80)}" (${w})`));
    expect(hits).toEqual([]);
  });

  it('makes no network requests and reads no real clock in the game', () => {
    const code = SOURCES.filter(({ p }) => p.endsWith('.ts')).map(({ p, text }) => ({ p, text: text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '') }));
    const hits = code.flatMap(({ p, text }) => [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /EventSource/, /\bDate\.now\b/, /new Date\b/].filter(re => re.test(text)).map(re => `${p}: ${re}`));
    expect(hits).toEqual([]);
  });
});
