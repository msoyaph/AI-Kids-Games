// Young players: read-aloud (and its fallback), crafting several at once, tidying pockets,
// selling one from a stack, tracking a recipe.
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { ReadAloud, speakable } from '../src/ui/speech';
import { craftMany, learnRecipe, maxCraftable } from '../src/sim/crafting';
import { countItem, give, sortPockets } from '../src/sim/inventory';
import { sellSlot } from '../src/sim/economy';
import { RECIPE_BY_ID, item } from '../src/data/registry';
import { equipSlot } from '../src/sim/tools';
import { decodeSave, encodeSave } from '../src/sim/save';

class FakeSynth {
  said: { text: string; pitch: number; rate: number; lang: string }[] = [];
  speak(u: { text: string; pitch: number; rate: number; lang: string }) {
    this.said.push(u);
  }
  cancel() {}
  getVoices() {
    return [{ name: 'Test', lang: 'en-US', localService: true }];
  }
}
const utter = (text: string) => ({ text, pitch: 1, rate: 1, lang: '' });

describe('read-aloud', () => {
  it('stays quiet (and never throws) where speech is not available', () => {
    const none = new ReadAloud(null);
    expect(none.available).toBe(false);
    none.enabled = true;
    expect(none.speak('Hello!')).toBe(false);
    expect(() => none.stop()).not.toThrow();
    const broken = new ReadAloud({ speak: () => { throw new Error('nope'); }, cancel: () => { throw new Error('nope'); } }, utter);
    broken.enabled = true;
    expect(broken.speak('Hello!')).toBe(false);
  });

  it('reads lines without tags or symbols, in the speaker\'s voice, only when turned on', () => {
    const synth = new FakeSynth();
    const ra = new ReadAloud(synth, utter);
    expect(ra.available).toBe(true);
    expect(ra.speak('[happy]Hi!')).toBe(false); // off by default
    ra.enabled = true;
    expect(ra.speak('[happy]Welcome ✦ to the island! 🌸', 1.3)).toBe(true);
    expect(synth.said[0]).toMatchObject({ text: 'Welcome to the island!', pitch: 1.3, lang: 'en-US' });
    ra.speak('Too low', 0.2);
    expect(synth.said[1]!.pitch).toBe(0.6);
    ra.enabled = false;
    expect(ra.speak('Replay button', 1, true)).toBe(true); // the 🔊 button always works
  });

  it('speakable() keeps the words', () => {
    expect(speakable('[sleepy]Mmm… stars ★ tonight.')).toBe('Mmm... stars tonight.');
  });
});

describe('quality of life', () => {
  it('crafts several at once, up to what you have', () => {
    const g = makeGame(701);
    learnRecipe(g, 'r_furn_pocket_fern', 'test', true);
    const r = RECIPE_BY_ID.r_furn_pocket_fern!;
    give(g, 'clay', 5);
    give(g, 'fiber', 20);
    expect(maxCraftable(g, r)).toBe(2);
    expect(craftMany(g, r.id, 5)).toBe(2);
    expect(countItem(g, 'furn_pocket_fern') + g.state.home.storage.filter((s) => s.id === 'furn_pocket_fern').length).toBe(2);
    expect(maxCraftable(g, r)).toBe(0);
  });

  it('tidies the pockets by kind and keeps your tool in hand', () => {
    const g = makeGame(702);
    give(g, 'shell_spiral', 2);
    give(g, 'net_flimsy');
    give(g, 'timber', 3);
    give(g, 'fruit_blushpear');
    const net = g.state.player.inv.findIndex((s) => s?.id === 'net_flimsy');
    equipSlot(g, net);
    sortPockets(g);
    const ids = g.state.player.inv.filter(Boolean).map((s) => s!.id);
    expect(ids).toEqual(['net_flimsy', 'timber', 'fruit_blushpear', 'shell_spiral']);
    expect(g.state.player.inv[g.state.player.equipped]?.id).toBe('net_flimsy');
    expect(g.state.player.inv).toHaveLength(g.state.player.invSize);
  });

  it('sells just one from a stack', () => {
    const g = makeGame(703);
    give(g, 'shell_spiral', 5);
    const slot = g.state.player.inv.findIndex((s) => s?.id === 'shell_spiral');
    const total = sellSlot(g, slot, 1);
    expect(total).toBe(item('shell_spiral').price);
    expect(countItem(g, 'shell_spiral')).toBe(4);
  });

  it('a tracked recipe is remembered in the save', () => {
    const g = makeGame(704);
    g.state.trackedRecipe = 'r_furn_pocket_fern';
    expect(decodeSave(encodeSave(g.state)).trackedRecipe).toBe('r_furn_pocket_fern');
  });
});
